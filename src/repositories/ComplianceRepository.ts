import { IRepository } from './IRepository';
import { ComplianceRecord } from '../types';
import { nanoid } from 'nanoid';

export class ComplianceRepository implements IRepository<ComplianceRecord> {
  private records: Map<string, ComplianceRecord> = new Map();
  private userIndex: Map<string, string> = new Map(); // userId -> recordId

  async create(data: Omit<ComplianceRecord, 'id' | 'lastUpdated'>): Promise<ComplianceRecord> {
    // Check if user already has a compliance record
    const existingId = this.userIndex.get(data.userId);
    if (existingId) {
      throw new Error('User already has a compliance record. Use update instead.');
    }

    const record: ComplianceRecord = {
      ...data,
      id: nanoid(),
      lastUpdated: new Date()
    };

    this.records.set(record.id, record);
    this.userIndex.set(record.userId, record.id);

    return record;
  }

  async findById(id: string): Promise<ComplianceRecord | undefined> {
    return this.records.get(id);
  }

  async findByUserId(userId: string): Promise<ComplianceRecord | undefined> {
    const id = this.userIndex.get(userId);
    return id ? this.records.get(id) : undefined;
  }

  async findAll(): Promise<ComplianceRecord[]> {
    return Array.from(this.records.values());
  }

  async update(id: string, data: Partial<ComplianceRecord>): Promise<ComplianceRecord | undefined> {
    const record = this.records.get(id);
    if (!record) return undefined;

    const updated = {
      ...record,
      ...data,
      lastUpdated: new Date()
    };

    this.records.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const record = this.records.get(id);
    if (!record) return false;

    this.userIndex.delete(record.userId);
    return this.records.delete(id);
  }

  async findByStatus(status: 'incomplete' | 'pending_review' | 'approved' | 'rejected'): Promise<ComplianceRecord[]> {
    return Array.from(this.records.values()).filter(r => r.status === status);
  }

  async findPendingReview(): Promise<ComplianceRecord[]> {
    return this.findByStatus('pending_review');
  }

  async findApproved(): Promise<ComplianceRecord[]> {
    return this.findByStatus('approved');
  }

  async isCompliant(userId: string): Promise<boolean> {
    const record = await this.findByUserId(userId);
    if (!record) return false;

    return (
      record.status === 'approved' &&
      record.checks.taxInfoComplete &&
      record.checks.agreementSigned &&
      record.checks.identityVerified &&
      record.checks.paymentMethodVerified
    );
  }

  async getComplianceStats(): Promise<{
    total: number;
    approved: number;
    pendingReview: number;
    incomplete: number;
    rejected: number;
    complianceRate: number;
  }> {
    const all = await this.findAll();

    const stats = {
      total: all.length,
      approved: all.filter(r => r.status === 'approved').length,
      pendingReview: all.filter(r => r.status === 'pending_review').length,
      incomplete: all.filter(r => r.status === 'incomplete').length,
      rejected: all.filter(r => r.status === 'rejected').length,
      complianceRate: 0
    };

    stats.complianceRate = stats.total > 0 ? (stats.approved / stats.total) * 100 : 0;

    return stats;
  }

  async updateChecks(
    userId: string,
    checks: Partial<ComplianceRecord['checks']>
  ): Promise<ComplianceRecord | undefined> {
    const record = await this.findByUserId(userId);
    if (!record) return undefined;

    const updated = {
      ...record,
      checks: {
        ...record.checks,
        ...checks
      },
      lastUpdated: new Date()
    };

    // Auto-update status based on checks
    const allChecksComplete = Object.values(updated.checks).every(
      check => check === true || check === undefined
    );

    if (allChecksComplete && updated.status === 'incomplete') {
      updated.status = 'pending_review';
    }

    this.records.set(record.id, updated);
    return updated;
  }

  async createOrUpdate(userId: string, data: Partial<ComplianceRecord>): Promise<ComplianceRecord> {
    const existing = await this.findByUserId(userId);

    if (existing) {
      const updated = await this.update(existing.id, data);
      if (!updated) throw new Error('Failed to update compliance record');
      return updated;
    }

    return this.create({
      userId,
      checks: {
        taxInfoComplete: false,
        agreementSigned: false,
        identityVerified: false,
        paymentMethodVerified: false,
        backgroundCheckComplete: false
      },
      status: 'incomplete',
      ...data
    });
  }
}
