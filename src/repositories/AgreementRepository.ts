import { IRepository } from './IRepository';
import { ContractorAgreement, AgreementType } from '../types';
import { nanoid } from 'nanoid';

export class AgreementRepository implements IRepository<ContractorAgreement> {
  private agreements: Map<string, ContractorAgreement> = new Map();
  private projectIndex: Map<string, Set<string>> = new Map(); // projectId -> agreementIds
  private contractorIndex: Map<string, Set<string>> = new Map(); // contractorId -> agreementIds
  private clientIndex: Map<string, Set<string>> = new Map(); // clientId -> agreementIds
  private typeIndex: Map<AgreementType, Set<string>> = new Map();

  async create(data: Omit<ContractorAgreement, 'id' | 'createdAt' | 'status' | 'signatures'>): Promise<ContractorAgreement> {
    const agreement: ContractorAgreement = {
      ...data,
      id: nanoid(),
      status: 'draft',
      signatures: {},
      createdAt: new Date(),
      blockchainHash: ''
    };

    this.agreements.set(agreement.id, agreement);

    // Update indices
    if (!this.projectIndex.has(agreement.projectId)) {
      this.projectIndex.set(agreement.projectId, new Set());
    }
    this.projectIndex.get(agreement.projectId)!.add(agreement.id);

    if (!this.contractorIndex.has(agreement.contractorId)) {
      this.contractorIndex.set(agreement.contractorId, new Set());
    }
    this.contractorIndex.get(agreement.contractorId)!.add(agreement.id);

    if (!this.clientIndex.has(agreement.clientId)) {
      this.clientIndex.set(agreement.clientId, new Set());
    }
    this.clientIndex.get(agreement.clientId)!.add(agreement.id);

    if (!this.typeIndex.has(agreement.type)) {
      this.typeIndex.set(agreement.type, new Set());
    }
    this.typeIndex.get(agreement.type)!.add(agreement.id);

    return agreement;
  }

  async findById(id: string): Promise<ContractorAgreement | undefined> {
    return this.agreements.get(id);
  }

  async findAll(): Promise<ContractorAgreement[]> {
    return Array.from(this.agreements.values());
  }

  async update(id: string, data: Partial<ContractorAgreement>): Promise<ContractorAgreement | undefined> {
    const agreement = this.agreements.get(id);
    if (!agreement) return undefined;

    const updated = { ...agreement, ...data };
    this.agreements.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const agreement = this.agreements.get(id);
    if (!agreement) return false;

    // Clean up indices
    this.projectIndex.get(agreement.projectId)?.delete(id);
    this.contractorIndex.get(agreement.contractorId)?.delete(id);
    this.clientIndex.get(agreement.clientId)?.delete(id);
    this.typeIndex.get(agreement.type)?.delete(id);

    return this.agreements.delete(id);
  }

  async findByProject(projectId: string): Promise<ContractorAgreement[]> {
    const ids = this.projectIndex.get(projectId);
    if (!ids) return [];

    return Array.from(ids)
      .map(id => this.agreements.get(id))
      .filter((a): a is ContractorAgreement => a !== undefined);
  }

  async findByContractor(contractorId: string): Promise<ContractorAgreement[]> {
    const ids = this.contractorIndex.get(contractorId);
    if (!ids) return [];

    return Array.from(ids)
      .map(id => this.agreements.get(id))
      .filter((a): a is ContractorAgreement => a !== undefined);
  }

  async findByClient(clientId: string): Promise<ContractorAgreement[]> {
    const ids = this.clientIndex.get(clientId);
    if (!ids) return [];

    return Array.from(ids)
      .map(id => this.agreements.get(id))
      .filter((a): a is ContractorAgreement => a !== undefined);
  }

  async findByType(type: AgreementType): Promise<ContractorAgreement[]> {
    const ids = this.typeIndex.get(type);
    if (!ids) return [];

    return Array.from(ids)
      .map(id => this.agreements.get(id))
      .filter((a): a is ContractorAgreement => a !== undefined);
  }

  async findByStatus(
    status: 'draft' | 'pending_signature' | 'signed' | 'active' | 'completed' | 'terminated'
  ): Promise<ContractorAgreement[]> {
    return Array.from(this.agreements.values()).filter(a => a.status === status);
  }

  async findPendingSignature(): Promise<ContractorAgreement[]> {
    return this.findByStatus('pending_signature');
  }

  async findActive(): Promise<ContractorAgreement[]> {
    return this.findByStatus('active');
  }

  async signAgreement(
    id: string,
    role: 'client' | 'contractor',
    ipAddress: string
  ): Promise<ContractorAgreement | undefined> {
    const agreement = this.agreements.get(id);
    if (!agreement) return undefined;

    const now = new Date();
    const signatures = { ...agreement.signatures };

    if (role === 'client') {
      signatures.clientSignedAt = now;
      signatures.clientIpAddress = ipAddress;
    } else {
      signatures.contractorSignedAt = now;
      signatures.contractorIpAddress = ipAddress;
    }

    // Check if both parties have signed
    const bothSigned = signatures.clientSignedAt && signatures.contractorSignedAt;
    const newStatus = bothSigned ? 'signed' : 'pending_signature';

    const updated: ContractorAgreement = {
      ...agreement,
      signatures,
      status: newStatus,
      effectiveDate: bothSigned ? now : undefined
    };

    this.agreements.set(id, updated);
    return updated;
  }

  async activateAgreement(id: string): Promise<ContractorAgreement | undefined> {
    const agreement = this.agreements.get(id);
    if (!agreement || agreement.status !== 'signed') return undefined;

    return this.update(id, { status: 'active' });
  }

  async terminateAgreement(id: string): Promise<ContractorAgreement | undefined> {
    const agreement = this.agreements.get(id);
    if (!agreement) return undefined;

    return this.update(id, { status: 'terminated' });
  }

  async completeAgreement(id: string): Promise<ContractorAgreement | undefined> {
    const agreement = this.agreements.get(id);
    if (!agreement) return undefined;

    return this.update(id, { status: 'completed' });
  }

  async hasActiveAgreement(projectId: string, contractorId: string): Promise<boolean> {
    const projectAgreements = await this.findByProject(projectId);
    return projectAgreements.some(
      a => a.contractorId === contractorId &&
      (a.status === 'active' || a.status === 'signed')
    );
  }

  async getAgreementStats(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byType: Record<AgreementType, number>;
    averageSigningTime: number; // Hours
  }> {
    const all = await this.findAll();

    const byStatus: Record<string, number> = {};
    const byType: Partial<Record<AgreementType, number>> = {};
    let totalSigningTime = 0;
    let signedCount = 0;

    all.forEach(a => {
      byStatus[a.status] = (byStatus[a.status] || 0) + 1;
      byType[a.type] = (byType[a.type] || 0) + 1;

      // Calculate signing time if both parties signed
      if (a.signatures.clientSignedAt && a.signatures.contractorSignedAt) {
        const signingTime = Math.abs(
          a.signatures.contractorSignedAt.getTime() -
          a.signatures.clientSignedAt.getTime()
        ) / (1000 * 60 * 60); // Convert to hours
        totalSigningTime += signingTime;
        signedCount++;
      }
    });

    return {
      total: all.length,
      byStatus,
      byType: byType as Record<AgreementType, number>,
      averageSigningTime: signedCount > 0 ? totalSigningTime / signedCount : 0
    };
  }
}
