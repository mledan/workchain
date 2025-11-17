import { IRepository } from './IRepository';
import {
  Contribution,
  ContributionType,
  ContributionMetrics
} from '../types';
import { nanoid } from 'nanoid';

export class ContributionRepository implements IRepository<Contribution> {
  private contributions: Map<string, Contribution> = new Map();
  private projectIndex: Map<string, Set<string>> = new Map(); // projectId -> contributionIds
  private contributorIndex: Map<string, Set<string>> = new Map(); // userId -> contributionIds
  private typeIndex: Map<ContributionType, Set<string>> = new Map(); // type -> contributionIds

  async create(data: Omit<Contribution, 'id' | 'createdAt'>): Promise<Contribution> {
    const contribution: Contribution = {
      ...data,
      id: nanoid(),
      createdAt: new Date()
    };

    this.contributions.set(contribution.id, contribution);

    // Update indices
    if (!this.projectIndex.has(contribution.projectId)) {
      this.projectIndex.set(contribution.projectId, new Set());
    }
    this.projectIndex.get(contribution.projectId)!.add(contribution.id);

    if (!this.contributorIndex.has(contribution.contributorId)) {
      this.contributorIndex.set(contribution.contributorId, new Set());
    }
    this.contributorIndex.get(contribution.contributorId)!.add(contribution.id);

    if (!this.typeIndex.has(contribution.type)) {
      this.typeIndex.set(contribution.type, new Set());
    }
    this.typeIndex.get(contribution.type)!.add(contribution.id);

    return contribution;
  }

  async findById(id: string): Promise<Contribution | undefined> {
    return this.contributions.get(id);
  }

  async findAll(): Promise<Contribution[]> {
    return Array.from(this.contributions.values());
  }

  async update(id: string, data: Partial<Contribution>): Promise<Contribution | undefined> {
    const contribution = this.contributions.get(id);
    if (!contribution) return undefined;

    const updated = { ...contribution, ...data };
    this.contributions.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const contribution = this.contributions.get(id);
    if (!contribution) return false;

    // Clean up indices
    this.projectIndex.get(contribution.projectId)?.delete(id);
    this.contributorIndex.get(contribution.contributorId)?.delete(id);
    this.typeIndex.get(contribution.type)?.delete(id);

    return this.contributions.delete(id);
  }

  async findByProject(projectId: string): Promise<Contribution[]> {
    const ids = this.projectIndex.get(projectId);
    if (!ids) return [];

    return Array.from(ids)
      .map(id => this.contributions.get(id))
      .filter((c): c is Contribution => c !== undefined);
  }

  async findByContributor(userId: string): Promise<Contribution[]> {
    const ids = this.contributorIndex.get(userId);
    if (!ids) return [];

    return Array.from(ids)
      .map(id => this.contributions.get(id))
      .filter((c): c is Contribution => c !== undefined);
  }

  async findByType(type: ContributionType): Promise<Contribution[]> {
    const ids = this.typeIndex.get(type);
    if (!ids) return [];

    return Array.from(ids)
      .map(id => this.contributions.get(id))
      .filter((c): c is Contribution => c !== undefined);
  }

  async findByStatus(status: 'pending' | 'verified' | 'disputed'): Promise<Contribution[]> {
    return Array.from(this.contributions.values())
      .filter(c => c.status === status);
  }

  async findVerifiedByContributor(userId: string): Promise<Contribution[]> {
    const userContributions = await this.findByContributor(userId);
    return userContributions.filter(c => c.status === 'verified');
  }

  async getContributorStats(userId: string): Promise<{
    totalContributions: number;
    verifiedContributions: number;
    totalCredits: number;
    totalReputation: number;
    contributionsByType: Record<ContributionType, number>;
  }> {
    const contributions = await this.findByContributor(userId);
    const verified = contributions.filter(c => c.status === 'verified');

    const contributionsByType: Partial<Record<ContributionType, number>> = {};
    contributions.forEach(c => {
      contributionsByType[c.type] = (contributionsByType[c.type] || 0) + 1;
    });

    return {
      totalContributions: contributions.length,
      verifiedContributions: verified.length,
      totalCredits: verified.reduce((sum, c) => sum + c.creditsEarned, 0),
      totalReputation: verified.reduce((sum, c) => sum + c.reputationImpact, 0),
      contributionsByType: contributionsByType as Record<ContributionType, number>
    };
  }

  async getProjectStats(projectId: string): Promise<{
    totalContributions: number;
    totalContributors: number;
    contributionsByType: Record<ContributionType, number>;
    topContributors: Array<{ userId: string; count: number; credits: number }>;
  }> {
    const contributions = await this.findByProject(projectId);
    const contributors = new Set(contributions.map(c => c.contributorId));

    const contributionsByType: Partial<Record<ContributionType, number>> = {};
    contributions.forEach(c => {
      contributionsByType[c.type] = (contributionsByType[c.type] || 0) + 1;
    });

    // Calculate top contributors
    const contributorMap = new Map<string, { count: number; credits: number }>();
    contributions.forEach(c => {
      if (!contributorMap.has(c.contributorId)) {
        contributorMap.set(c.contributorId, { count: 0, credits: 0 });
      }
      const stats = contributorMap.get(c.contributorId)!;
      stats.count++;
      if (c.status === 'verified') {
        stats.credits += c.creditsEarned;
      }
    });

    const topContributors = Array.from(contributorMap.entries())
      .map(([userId, stats]) => ({ userId, ...stats }))
      .sort((a, b) => b.credits - a.credits)
      .slice(0, 10);

    return {
      totalContributions: contributions.length,
      totalContributors: contributors.size,
      contributionsByType: contributionsByType as Record<ContributionType, number>,
      topContributors
    };
  }
}
