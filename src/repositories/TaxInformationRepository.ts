import { IRepository } from './IRepository';
import { TaxInformation, TaxFormType } from '../types';
import { nanoid } from 'nanoid';
import * as crypto from 'crypto';

export class TaxInformationRepository implements IRepository<TaxInformation> {
  private taxInfo: Map<string, TaxInformation> = new Map();
  private userIndex: Map<string, string> = new Map(); // userId -> taxInfoId
  private readonly ENCRYPTION_KEY = process.env.TAX_ENCRYPTION_KEY || 'default-key-change-in-production';

  /**
   * Encrypt sensitive tax ID information
   */
  private encryptTaxId(taxId: string): string {
    const cipher = crypto.createCipher('aes-256-cbc', this.ENCRYPTION_KEY);
    let encrypted = cipher.update(taxId, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  /**
   * Decrypt tax ID information
   */
  private decryptTaxId(encryptedTaxId: string): string {
    try {
      const decipher = crypto.createDecipher('aes-256-cbc', this.ENCRYPTION_KEY);
      let decrypted = decipher.update(encryptedTaxId, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      return '[ENCRYPTED]';
    }
  }

  async create(data: Omit<TaxInformation, 'id' | 'signedAt' | 'verified'>): Promise<TaxInformation> {
    // Check if user already has tax info
    const existingId = this.userIndex.get(data.userId);
    if (existingId) {
      throw new Error('User already has tax information on file. Use update instead.');
    }

    const taxInfo: TaxInformation = {
      ...data,
      id: nanoid(),
      taxId: this.encryptTaxId(data.taxId), // Encrypt the tax ID
      signedAt: new Date(),
      verified: false
    };

    this.taxInfo.set(taxInfo.id, taxInfo);
    this.userIndex.set(taxInfo.userId, taxInfo.id);

    return taxInfo;
  }

  async findById(id: string): Promise<TaxInformation | undefined> {
    return this.taxInfo.get(id);
  }

  async findByUserId(userId: string): Promise<TaxInformation | undefined> {
    const id = this.userIndex.get(userId);
    return id ? this.taxInfo.get(id) : undefined;
  }

  async findAll(): Promise<TaxInformation[]> {
    return Array.from(this.taxInfo.values());
  }

  async update(id: string, data: Partial<TaxInformation>): Promise<TaxInformation | undefined> {
    const taxInfo = this.taxInfo.get(id);
    if (!taxInfo) return undefined;

    // If updating taxId, encrypt it
    if (data.taxId) {
      data.taxId = this.encryptTaxId(data.taxId);
    }

    const updated = { ...taxInfo, ...data };
    this.taxInfo.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const taxInfo = this.taxInfo.get(id);
    if (!taxInfo) return false;

    this.userIndex.delete(taxInfo.userId);
    return this.taxInfo.delete(id);
  }

  async verifyTaxInfo(id: string): Promise<TaxInformation | undefined> {
    return this.update(id, {
      verified: true,
      verifiedAt: new Date()
    });
  }

  async findUnverified(): Promise<TaxInformation[]> {
    return Array.from(this.taxInfo.values()).filter(t => !t.verified);
  }

  async findByFormType(formType: TaxFormType): Promise<TaxInformation[]> {
    return Array.from(this.taxInfo.values()).filter(t => t.formType === formType);
  }

  async findUsCitizens(): Promise<TaxInformation[]> {
    return Array.from(this.taxInfo.values()).filter(t => t.isUsCitizen);
  }

  /**
   * Get masked tax ID for display (shows only last 4 digits)
   */
  getMaskedTaxId(taxInfo: TaxInformation): string {
    try {
      const decrypted = this.decryptTaxId(taxInfo.taxId);
      if (decrypted === '[ENCRYPTED]') return '***-**-****';

      const length = decrypted.length;
      return '***-**-' + decrypted.substring(length - 4);
    } catch {
      return '***-**-****';
    }
  }

  /**
   * Validate tax ID format based on type
   */
  validateTaxId(taxId: string, taxIdType: 'ssn' | 'ein' | 'itin' | 'foreign'): boolean {
    switch (taxIdType) {
      case 'ssn':
      case 'itin':
        // Format: XXX-XX-XXXX
        return /^\d{3}-\d{2}-\d{4}$/.test(taxId) || /^\d{9}$/.test(taxId);
      case 'ein':
        // Format: XX-XXXXXXX
        return /^\d{2}-\d{7}$/.test(taxId) || /^\d{9}$/.test(taxId);
      case 'foreign':
        // More lenient for foreign IDs
        return taxId.length >= 5 && taxId.length <= 20;
      default:
        return false;
    }
  }
}
