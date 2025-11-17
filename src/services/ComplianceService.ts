import { ComplianceRepository } from '../repositories/ComplianceRepository';
import { AgreementRepository } from '../repositories/AgreementRepository';
import { TaxInformationRepository } from '../repositories/TaxInformationRepository';
import {
  ContractorAgreement,
  AgreementType,
  ComplianceRecord,
  ActionType
} from '../types';
import { Chain } from '../blockchain/Chain';

/**
 * ComplianceService manages contractor agreements and compliance verification
 */
export class ComplianceService {
  constructor(
    private complianceRepo: ComplianceRepository,
    private agreementRepo: AgreementRepository,
    private taxInfoRepo: TaxInformationRepository,
    private chain: Chain
  ) {}

  /**
   * Create a contractor agreement
   */
  async createAgreement(
    projectId: string,
    clientId: string,
    contractorId: string,
    type: AgreementType,
    terms: ContractorAgreement['terms'],
    documentUrl: string,
    actorId: string
  ): Promise<ContractorAgreement> {
    const agreement = await this.agreementRepo.create({
      projectId,
      clientId,
      contractorId,
      type,
      terms,
      documentUrl,
      blockchainHash: ''
    });

    // Record in blockchain
    const block = this.chain.addBlock(
      ActionType.CREATE_AGREEMENT,
      'Agreement',
      agreement.id,
      { agreement },
      actorId
    );

    await this.agreementRepo.update(agreement.id, {
      blockchainHash: block.hash
    });

    return agreement;
  }

  /**
   * Sign an agreement (client or contractor)
   */
  async signAgreement(
    agreementId: string,
    role: 'client' | 'contractor',
    ipAddress: string,
    actorId: string
  ): Promise<ContractorAgreement> {
    const agreement = await this.agreementRepo.signAgreement(agreementId, role, ipAddress);

    if (!agreement) {
      throw new Error('Agreement not found');
    }

    // Update agreement status
    if (agreement.status === 'draft') {
      await this.agreementRepo.update(agreementId, {
        status: 'pending_signature'
      });
    }

    // Record in blockchain
    const block = this.chain.addBlock(
      ActionType.SIGN_AGREEMENT,
      'Agreement',
      agreementId,
      { agreementId, role, timestamp: new Date() },
      actorId
    );

    await this.agreementRepo.update(agreementId, {
      blockchainHash: block.hash
    });

    // If both parties signed, activate the agreement
    if (agreement.signatures.clientSignedAt && agreement.signatures.contractorSignedAt) {
      await this.agreementRepo.activateAgreement(agreementId);

      // Update compliance record
      await this.updateComplianceCheck(
        role === 'contractor' ? agreement.contractorId : agreement.clientId,
        'agreementSigned',
        true
      );
    }

    return agreement;
  }

  /**
   * Terminate an agreement
   */
  async terminateAgreement(
    agreementId: string,
    reason: string,
    actorId: string
  ): Promise<ContractorAgreement> {
    const agreement = await this.agreementRepo.terminateAgreement(agreementId);

    if (!agreement) {
      throw new Error('Agreement not found or cannot be terminated');
    }

    // Record in blockchain
    this.chain.addBlock(
      ActionType.TERMINATE_AGREEMENT,
      'Agreement',
      agreementId,
      { agreementId, reason, terminatedAt: new Date() },
      actorId
    );

    return agreement;
  }

  /**
   * Check user compliance status
   */
  async checkCompliance(userId: string): Promise<ComplianceRecord> {
    let compliance = await this.complianceRepo.findByUserId(userId);

    if (!compliance) {
      // Create new compliance record
      compliance = await this.complianceRepo.create({
        userId,
        checks: {
          taxInfoComplete: false,
          agreementSigned: false,
          identityVerified: false,
          paymentMethodVerified: false,
          backgroundCheckComplete: false
        },
        status: 'incomplete'
      });
    }

    // Auto-update checks based on current data
    const taxInfo = await this.taxInfoRepo.findByUserId(userId);
    const agreements = await this.agreementRepo.findByContractor(userId);
    const hasActiveAgreement = agreements.some(
      a => a.status === 'active' || a.status === 'signed'
    );

    const updatedChecks = {
      taxInfoComplete: !!taxInfo && taxInfo.verified,
      agreementSigned: hasActiveAgreement
      // Other checks would be updated based on actual verification systems
    };

    compliance = await this.complianceRepo.updateChecks(userId, updatedChecks);

    return compliance!;
  }

  /**
   * Update a specific compliance check
   */
  async updateComplianceCheck(
    userId: string,
    checkType: keyof ComplianceRecord['checks'],
    value: boolean
  ): Promise<ComplianceRecord> {
    let compliance = await this.complianceRepo.findByUserId(userId);

    if (!compliance) {
      compliance = await this.complianceRepo.createOrUpdate(userId, {
        checks: {
          taxInfoComplete: false,
          agreementSigned: false,
          identityVerified: false,
          paymentMethodVerified: false,
          backgroundCheckComplete: false,
          [checkType]: value
        },
        status: 'incomplete'
      });
    } else {
      compliance = await this.complianceRepo.updateChecks(userId, {
        [checkType]: value
      });
    }

    return compliance!;
  }

  /**
   * Approve compliance (admin function)
   */
  async approveCompliance(
    userId: string,
    reviewedBy: string,
    notes?: string
  ): Promise<ComplianceRecord> {
    const compliance = await this.complianceRepo.findByUserId(userId);

    if (!compliance) {
      throw new Error('Compliance record not found');
    }

    // Verify all checks are complete
    const allChecksComplete = Object.values(compliance.checks).every(
      check => check === true || check === undefined
    );

    if (!allChecksComplete) {
      throw new Error('Cannot approve: not all compliance checks are complete');
    }

    const updated = await this.complianceRepo.update(compliance.id, {
      status: 'approved',
      reviewedBy,
      reviewedAt: new Date(),
      notes
    });

    if (!updated) {
      throw new Error('Failed to update compliance record');
    }

    return updated;
  }

  /**
   * Reject compliance (admin function)
   */
  async rejectCompliance(
    userId: string,
    reviewedBy: string,
    reason: string
  ): Promise<ComplianceRecord> {
    const compliance = await this.complianceRepo.findByUserId(userId);

    if (!compliance) {
      throw new Error('Compliance record not found');
    }

    const updated = await this.complianceRepo.update(compliance.id, {
      status: 'rejected',
      reviewedBy,
      reviewedAt: new Date(),
      notes: reason
    });

    if (!updated) {
      throw new Error('Failed to update compliance record');
    }

    return updated;
  }

  /**
   * Get agreements for a project
   */
  async getProjectAgreements(projectId: string): Promise<ContractorAgreement[]> {
    return this.agreementRepo.findByProject(projectId);
  }

  /**
   * Check if user can work on a project (has active agreement)
   */
  async canWorkOnProject(projectId: string, contractorId: string): Promise<{
    canWork: boolean;
    reason?: string;
    missingAgreements?: AgreementType[];
  }> {
    // Check compliance
    const compliance = await this.checkCompliance(contractorId);

    if (compliance.status !== 'approved') {
      return {
        canWork: false,
        reason: 'Compliance not approved'
      };
    }

    // Check for active agreements
    const hasActive = await this.agreementRepo.hasActiveAgreement(projectId, contractorId);

    if (!hasActive) {
      // Check which agreements are missing
      const existingAgreements = await this.agreementRepo.findByProject(projectId);
      const contractorAgreements = existingAgreements.filter(
        a => a.contractorId === contractorId
      );

      const requiredTypes = [
        AgreementType.INDEPENDENT_CONTRACTOR,
        AgreementType.NDA
      ];

      const missingAgreements = requiredTypes.filter(
        type => !contractorAgreements.some(a => a.type === type && a.status === 'active')
      );

      return {
        canWork: false,
        reason: 'Missing required agreements',
        missingAgreements
      };
    }

    return { canWork: true };
  }

  /**
   * Get compliance statistics for the platform
   */
  async getPlatformComplianceStats(): Promise<{
    compliance: any;
    agreements: any;
    pendingReviews: number;
  }> {
    const complianceStats = await this.complianceRepo.getComplianceStats();
    const agreementStats = await this.agreementRepo.getAgreementStats();
    const pendingReviews = (await this.complianceRepo.findPendingReview()).length;

    return {
      compliance: complianceStats,
      agreements: agreementStats,
      pendingReviews
    };
  }

  /**
   * Create standard agreement templates
   */
  generateAgreementTerms(
    type: AgreementType,
    projectScope: string,
    deliverables: string[],
    timeline: { startDate: Date; endDate: Date },
    paymentTerms: string
  ): ContractorAgreement['terms'] {
    const baseTerms: ContractorAgreement['terms'] = {
      scope: projectScope,
      deliverables,
      paymentTerms,
      timeline,
      terminationClauses: [
        'Either party may terminate with 14 days written notice',
        'Immediate termination for breach of contract',
        'Client retains right to terminate for convenience with 7 days notice'
      ],
      ipOwnership: 'client'
    };

    switch (type) {
      case AgreementType.NDA:
        return {
          ...baseTerms,
          confidentialityPeriod: 24, // 2 years
          terminationClauses: [
            'NDA remains in effect for confidentiality period',
            ...baseTerms.terminationClauses
          ]
        };

      case AgreementType.IP_ASSIGNMENT:
        return {
          ...baseTerms,
          ipOwnership: 'client',
          terminationClauses: [
            'IP rights transfer upon final payment',
            ...baseTerms.terminationClauses
          ]
        };

      case AgreementType.INDEPENDENT_CONTRACTOR:
      case AgreementType.GENERAL_TERMS:
      default:
        return baseTerms;
    }
  }
}
