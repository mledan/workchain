import { TaxInformationRepository } from '../repositories/TaxInformationRepository';
import { TaxDocumentRepository } from '../repositories/TaxDocumentRepository';
import { PaymentRepository } from '../repositories/PaymentRepository';
import {
  TaxInformation,
  TaxDocument,
  TaxLiability,
  TaxFormType,
  ActionType
} from '../types';
import { Chain } from '../blockchain/Chain';

/**
 * TaxService handles all tax-related operations including
 * W-9/W-8 collection, 1099 generation, and tax calculations
 */
export class TaxService {
  // Tax thresholds (2024 IRS rules)
  private static readonly FORM_1099_NEC_THRESHOLD = 600; // $600 minimum for 1099-NEC
  private static readonly FORM_1099_K_THRESHOLD = 5000; // $5000 minimum for 1099-K (2024)
  private static readonly ESTIMATED_TAX_RATE_SELF_EMPLOYED = 0.30; // 30% estimated (federal + self-employment)

  constructor(
    private taxInfoRepo: TaxInformationRepository,
    private taxDocRepo: TaxDocumentRepository,
    private paymentRepo: PaymentRepository,
    private chain: Chain
  ) {}

  /**
   * Submit tax information (W-9 or W-8)
   */
  async submitTaxInformation(
    userId: string,
    taxData: {
      formType: TaxFormType;
      businessName?: string;
      taxIdType: 'ssn' | 'ein' | 'itin' | 'foreign';
      taxId: string;
      address: {
        street: string;
        city: string;
        state: string;
        zipCode: string;
        country: string;
      };
      isUsCitizen: boolean;
      taxTreaty?: {
        country: string;
        articleNumber: string;
        withholdingRate: number;
      };
    },
    formDocumentUrl: string,
    actorId: string
  ): Promise<TaxInformation> {
    // Validate tax ID format
    if (!this.taxInfoRepo.validateTaxId(taxData.taxId, taxData.taxIdType)) {
      throw new Error('Invalid tax ID format');
    }

    // Create tax information record
    const taxInfo = await this.taxInfoRepo.create({
      ...taxData,
      userId,
      formDocumentUrl
    });

    // Record in blockchain
    this.chain.addBlock(
      ActionType.SUBMIT_TAX_INFO,
      'TaxInfo',
      taxInfo.id,
      { taxInfo: { ...taxInfo, taxId: '[REDACTED]' } }, // Don't store actual tax ID in blockchain
      actorId
    );

    return taxInfo;
  }

  /**
   * Verify tax information (admin function)
   */
  async verifyTaxInformation(
    taxInfoId: string,
    verifiedBy: string
  ): Promise<TaxInformation> {
    const taxInfo = await this.taxInfoRepo.verifyTaxInfo(taxInfoId);
    if (!taxInfo) {
      throw new Error('Tax information not found');
    }

    // Record verification in blockchain
    this.chain.addBlock(
      ActionType.VERIFY_TAX_INFO,
      'TaxInfo',
      taxInfoId,
      { taxInfoId, verifiedBy },
      verifiedBy
    );

    return taxInfo;
  }

  /**
   * Calculate tax liability for a user for a given period
   */
  async calculateTaxLiability(
    userId: string,
    year: number,
    quarter: number
  ): Promise<TaxLiability> {
    // Get user's tax information
    const taxInfo = await this.taxInfoRepo.findByUserId(userId);
    if (!taxInfo) {
      throw new Error('No tax information on file');
    }

    // Calculate date range for quarter
    const startMonth = (quarter - 1) * 3;
    const startDate = new Date(year, startMonth, 1);
    const endDate = new Date(year, startMonth + 3, 0);

    // Get all payments for the period
    const allPayments = await this.paymentRepo.findByFreelancer(userId);
    const periodPayments = allPayments.filter(p =>
      p.releasedAt &&
      p.releasedAt >= startDate &&
      p.releasedAt <= endDate &&
      p.status === 'released'
    );

    // Calculate total income (after platform fees)
    const totalIncome = periodPayments.reduce((sum, p) => {
      return sum + (p.amount - p.fees.platformFee - p.fees.gatewayFee);
    }, 0);

    // Determine withholding rate
    let withholdingRate = 0;
    if (taxInfo.isUsCitizen) {
      withholdingRate = TaxService.ESTIMATED_TAX_RATE_SELF_EMPLOYED;
    } else if (taxInfo.taxTreaty) {
      withholdingRate = taxInfo.taxTreaty.withholdingRate / 100;
    } else {
      withholdingRate = 0.30; // Default 30% for non-residents without treaty
    }

    const estimatedTaxOwed = totalIncome * withholdingRate;

    return {
      userId,
      year,
      quarter,
      totalIncome,
      estimatedTaxOwed,
      withholdingRate,
      taxReserve: estimatedTaxOwed, // Recommended amount to set aside
      lastCalculated: new Date()
    };
  }

  /**
   * Generate 1099-NEC form for a contractor
   */
  async generate1099NEC(
    userId: string,
    year: number,
    actorId: string
  ): Promise<TaxDocument> {
    // Check if user has tax info
    const taxInfo = await this.taxInfoRepo.findByUserId(userId);
    if (!taxInfo || !taxInfo.verified) {
      throw new Error('User must have verified tax information to generate 1099');
    }

    // Must be US citizen or resident for 1099-NEC
    if (taxInfo.formType !== TaxFormType.W9) {
      throw new Error('1099-NEC is only for US contractors (W-9)');
    }

    // Get all payments for the year
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);
    const allPayments = await this.paymentRepo.findByFreelancer(userId);
    const yearPayments = allPayments.filter(p =>
      p.releasedAt &&
      p.releasedAt >= startDate &&
      p.releasedAt <= endDate &&
      p.status === 'released'
    );

    // Calculate totals
    const totalEarnings = yearPayments.reduce((sum, p) => sum + p.amount, 0);
    const platformFees = yearPayments.reduce((sum, p) => sum + p.fees.platformFee, 0);
    const netEarnings = totalEarnings - platformFees;

    // Check threshold
    if (netEarnings < TaxService.FORM_1099_NEC_THRESHOLD) {
      throw new Error(`Earnings below $${TaxService.FORM_1099_NEC_THRESHOLD} threshold for 1099-NEC`);
    }

    // Generate document (in production, this would create actual PDF)
    const documentUrl = `/tax-documents/${userId}/${year}/1099-NEC.pdf`;

    const taxDoc = await this.taxDocRepo.create({
      userId,
      year,
      type: '1099-NEC',
      totalEarnings,
      platformFees,
      netEarnings,
      documentUrl
    });

    // Record in blockchain
    this.chain.addBlock(
      ActionType.GENERATE_TAX_DOCUMENT,
      'TaxInfo',
      taxDoc.id,
      { taxDoc },
      actorId
    );

    return taxDoc;
  }

  /**
   * Generate all 1099 forms for a tax year (admin function)
   */
  async generateAll1099s(year: number, actorId: string): Promise<{
    generated: TaxDocument[];
    skipped: Array<{ userId: string; reason: string }>;
  }> {
    const allTaxInfo = await this.taxInfoRepo.findAll();
    const generated: TaxDocument[] = [];
    const skipped: Array<{ userId: string; reason: string }> = [];

    for (const taxInfo of allTaxInfo) {
      // Only process verified W-9 forms
      if (!taxInfo.verified) {
        skipped.push({
          userId: taxInfo.userId,
          reason: 'Tax information not verified'
        });
        continue;
      }

      if (taxInfo.formType !== TaxFormType.W9) {
        continue; // Skip non-US contractors
      }

      try {
        const doc = await this.generate1099NEC(taxInfo.userId, year, actorId);
        generated.push(doc);
      } catch (error: any) {
        skipped.push({
          userId: taxInfo.userId,
          reason: error.message
        });
      }
    }

    return { generated, skipped };
  }

  /**
   * Get user's tax summary for a year
   */
  async getUserTaxSummary(userId: string, year: number): Promise<{
    taxInfo: TaxInformation | undefined;
    documents: TaxDocument[];
    quarterlyLiability: TaxLiability[];
    yearlyTotal: {
      totalEarnings: number;
      platformFees: number;
      netEarnings: number;
      estimatedTaxOwed: number;
    };
  }> {
    const taxInfo = await this.taxInfoRepo.findByUserId(userId);
    const documents = await this.taxDocRepo.findByUserAndYear(userId, year);

    // Calculate quarterly liabilities
    const quarterlyLiability: TaxLiability[] = [];
    for (let quarter = 1; quarter <= 4; quarter++) {
      try {
        const liability = await this.calculateTaxLiability(userId, year, quarter);
        quarterlyLiability.push(liability);
      } catch {
        // Skip if no data for quarter
      }
    }

    // Calculate yearly totals
    const yearlyTotal = {
      totalEarnings: quarterlyLiability.reduce((sum, q) => sum + q.totalIncome, 0),
      platformFees: 0, // Would need to calculate from payments
      netEarnings: quarterlyLiability.reduce((sum, q) => sum + q.totalIncome, 0),
      estimatedTaxOwed: quarterlyLiability.reduce((sum, q) => sum + q.estimatedTaxOwed, 0)
    };

    return {
      taxInfo,
      documents,
      quarterlyLiability,
      yearlyTotal
    };
  }

  /**
   * Check if user needs to submit tax information
   */
  async needsTaxInfo(userId: string): Promise<{
    required: boolean;
    reason?: string;
  }> {
    const taxInfo = await this.taxInfoRepo.findByUserId(userId);

    if (!taxInfo) {
      return {
        required: true,
        reason: 'No tax information on file'
      };
    }

    if (!taxInfo.verified) {
      return {
        required: true,
        reason: 'Tax information pending verification'
      };
    }

    return { required: false };
  }

  /**
   * Get platform-wide tax statistics for a year
   */
  async getPlatformTaxStats(year: number): Promise<{
    totalContractors: number;
    total1099sGenerated: number;
    totalReported: number;
    averageEarnings: number;
    contractors: {
      usContractors: number;
      internationalContractors: number;
      verified: number;
      unverified: number;
    };
  }> {
    const stats = await this.taxDocRepo.getPlatformTotalsByYear(year);
    const allTaxInfo = await this.taxInfoRepo.findAll();

    const usContractors = allTaxInfo.filter(t => t.formType === TaxFormType.W9).length;
    const internationalContractors = allTaxInfo.filter(
      t => t.formType === TaxFormType.W8_BEN || t.formType === TaxFormType.W8_BEN_E
    ).length;
    const verified = allTaxInfo.filter(t => t.verified).length;
    const unverified = allTaxInfo.filter(t => !t.verified).length;

    return {
      totalContractors: stats.totalContractors,
      total1099sGenerated: stats.total1099NEC,
      totalReported: stats.totalEarnings,
      averageEarnings: stats.totalContractors > 0
        ? stats.totalEarnings / stats.totalContractors
        : 0,
      contractors: {
        usContractors,
        internationalContractors,
        verified,
        unverified
      }
    };
  }
}
