import { IRepository } from './IRepository';
import { Proposal } from '../types';
import { nanoid } from 'nanoid';

/**
 * ProposalRepository - Repository for managing proposals
 *
 * Pattern: Repository Pattern
 * Provides data access abstraction for Proposal entities
 */
export class ProposalRepository implements IRepository<Proposal> {
  private proposals: Map<string, Proposal> = new Map();
  private projectIndex: Map<string, Set<string>> = new Map(); // projectId -> proposalIds
  private freelancerIndex: Map<string, Set<string>> = new Map(); // freelancerId -> proposalIds
  private statusIndex: Map<string, Set<string>> = new Map(); // status -> proposalIds

  async findById(id: string): Promise<Proposal | null> {
    return this.proposals.get(id) || null;
  }

  async create(entity: Proposal): Promise<Proposal> {
    this.proposals.set(entity.id, entity);

    // Update project index
    if (!this.projectIndex.has(entity.projectId)) {
      this.projectIndex.set(entity.projectId, new Set());
    }
    this.projectIndex.get(entity.projectId)!.add(entity.id);

    // Update freelancer index
    if (!this.freelancerIndex.has(entity.freelancerId)) {
      this.freelancerIndex.set(entity.freelancerId, new Set());
    }
    this.freelancerIndex.get(entity.freelancerId)!.add(entity.id);

    // Update status index
    if (!this.statusIndex.has(entity.status)) {
      this.statusIndex.set(entity.status, new Set());
    }
    this.statusIndex.get(entity.status)!.add(entity.id);

    return entity;
  }

  async update(id: string, updates: Partial<Proposal>): Promise<Proposal | null> {
    const proposal = this.proposals.get(id);
    if (!proposal) return null;

    const oldStatus = proposal.status;

    const updated = {
      ...proposal,
      ...updates,
    };

    this.proposals.set(id, updated);

    // Update status index if status changed
    if (updates.status && updates.status !== oldStatus) {
      this.statusIndex.get(oldStatus)?.delete(id);
      if (!this.statusIndex.has(updates.status)) {
        this.statusIndex.set(updates.status, new Set());
      }
      this.statusIndex.get(updates.status)!.add(id);
    }

    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const proposal = this.proposals.get(id);
    if (!proposal) return false;

    this.proposals.delete(id);

    // Clean up indices
    this.projectIndex.get(proposal.projectId)?.delete(id);
    this.freelancerIndex.get(proposal.freelancerId)?.delete(id);
    this.statusIndex.get(proposal.status)?.delete(id);

    return true;
  }

  async findAll(): Promise<Proposal[]> {
    return Array.from(this.proposals.values());
  }

  // Custom query methods

  async findByProject(projectId: string): Promise<Proposal[]> {
    const proposalIds = this.projectIndex.get(projectId) || new Set();
    return Array.from(proposalIds)
      .map(id => this.proposals.get(id))
      .filter((p): p is Proposal => p !== undefined)
      .sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
  }

  async findByFreelancer(freelancerId: string): Promise<Proposal[]> {
    const proposalIds = this.freelancerIndex.get(freelancerId) || new Set();
    return Array.from(proposalIds)
      .map(id => this.proposals.get(id))
      .filter((p): p is Proposal => p !== undefined)
      .sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
  }

  async findByStatus(status: Proposal['status']): Promise<Proposal[]> {
    const proposalIds = this.statusIndex.get(status) || new Set();
    return Array.from(proposalIds)
      .map(id => this.proposals.get(id))
      .filter((p): p is Proposal => p !== undefined);
  }

  async findSubmitted(): Promise<Proposal[]> {
    return this.findByStatus('submitted');
  }

  async findAccepted(): Promise<Proposal[]> {
    return this.findByStatus('accepted');
  }

  async findByProjectAndFreelancer(projectId: string, freelancerId: string): Promise<Proposal | null> {
    const proposals = await this.findByProject(projectId);
    return proposals.find(p => p.freelancerId === freelancerId) || null;
  }

  // Get statistics
  getStats() {
    const statusCounts: Record<string, number> = {};
    let totalProposedAmount = 0;
    let totalProposals = 0;

    for (const proposal of this.proposals.values()) {
      statusCounts[proposal.status] = (statusCounts[proposal.status] || 0) + 1;
      totalProposedAmount += proposal.proposedBudget.amount;
      totalProposals++;
    }

    return {
      totalProposals,
      totalFreelancers: this.freelancerIndex.size,
      totalProjects: this.projectIndex.size,
      statusCounts,
      totalProposedAmount,
      averageProposalAmount: totalProposals > 0 ? totalProposedAmount / totalProposals : 0,
    };
  }
}
