import { ProjectRepository } from '../repositories/ProjectRepository';
import { ContributionRepository } from '../repositories/ContributionRepository';
import { CreditService } from './CreditService';
import { PaymentService } from './PaymentService';
import {
  CollaborativeProject,
  TeamMember,
  CollaborationRole,
  Contribution,
  ContributionType,
  ActionType,
  Project
} from '../types';
import { Chain } from '../blockchain/Chain';
import { nanoid } from 'nanoid';

/**
 * CollaborationService manages team-based projects with profit sharing
 * and collaborative contribution tracking
 */
export class CollaborationService {
  constructor(
    private projectRepo: ProjectRepository,
    private contributionRepo: ContributionRepository,
    private creditService: CreditService,
    private paymentService: PaymentService,
    private chain: Chain
  ) {}

  /**
   * Convert a regular project to a collaborative project
   */
  async createCollaborativeProject(
    projectId: string,
    leadUserId: string,
    collaborationSettings: {
      requireCodeReview: boolean;
      minimumReviewers: number;
      autoApproveContributions: boolean;
      creditMultiplier: number;
    },
    profitDistributionType: 'equal' | 'role-based' | 'contribution-based' | 'custom'
  ): Promise<CollaborativeProject> {
    const project = await this.projectRepo.findById(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    // Initialize team with the lead
    const leadMember: TeamMember = {
      userId: leadUserId,
      role: CollaborationRole.LEAD,
      profitSharePercentage: profitDistributionType === 'equal' ? 100 : 50,
      joinedAt: new Date(),
      contributions: [],
      status: 'active',
      invitedBy: leadUserId
    };

    const collaborativeProject: CollaborativeProject = {
      ...project,
      teamMembers: [leadMember],
      profitDistribution: {
        type: profitDistributionType,
        distribution: {
          [leadUserId]: leadMember.profitSharePercentage
        }
      },
      collaborationSettings
    };

    // Record in blockchain
    this.chain.addBlock(
      ActionType.CREATE_PROJECT,
      'Project',
      projectId,
      { collaborativeProject },
      leadUserId
    );

    return collaborativeProject;
  }

  /**
   * Invite a team member to a collaborative project
   */
  async inviteTeamMember(
    projectId: string,
    invitedUserId: string,
    role: CollaborationRole,
    profitSharePercentage: number,
    hourlyRate: number | undefined,
    invitedBy: string
  ): Promise<TeamMember> {
    const project = await this.projectRepo.findById(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    // Validate inviter is a team member
    const collaborativeProject = project as any as CollaborativeProject;
    const inviter = collaborativeProject.teamMembers?.find(m => m.userId === invitedBy);
    if (!inviter || (inviter.role !== CollaborationRole.LEAD && inviter.role !== CollaborationRole.CONTRIBUTOR)) {
      throw new Error('Only team leads and contributors can invite members');
    }

    // Check if user is already a member
    if (collaborativeProject.teamMembers?.some(m => m.userId === invitedUserId)) {
      throw new Error('User is already a team member');
    }

    const newMember: TeamMember = {
      userId: invitedUserId,
      role,
      profitSharePercentage,
      hourlyRate,
      joinedAt: new Date(),
      contributions: [],
      status: 'active',
      invitedBy
    };

    // Record in blockchain
    this.chain.addBlock(
      ActionType.INVITE_TEAM_MEMBER,
      'TeamMember',
      nanoid(),
      { projectId, newMember },
      invitedBy
    );

    return newMember;
  }

  /**
   * Remove a team member from a project
   */
  async removeTeamMember(
    projectId: string,
    userIdToRemove: string,
    removedBy: string
  ): Promise<void> {
    const project = await this.projectRepo.findById(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    const collaborativeProject = project as any as CollaborativeProject;
    const remover = collaborativeProject.teamMembers?.find(m => m.userId === removedBy);

    if (!remover || remover.role !== CollaborationRole.LEAD) {
      throw new Error('Only team leads can remove members');
    }

    // Can't remove the lead
    const memberToRemove = collaborativeProject.teamMembers?.find(m => m.userId === userIdToRemove);
    if (memberToRemove?.role === CollaborationRole.LEAD) {
      throw new Error('Cannot remove the team lead');
    }

    // Record in blockchain
    this.chain.addBlock(
      ActionType.REMOVE_TEAM_MEMBER,
      'TeamMember',
      userIdToRemove,
      { projectId, userIdToRemove, removedBy },
      removedBy
    );
  }

  /**
   * Update profit distribution for a collaborative project
   */
  async updateProfitDistribution(
    projectId: string,
    newDistribution: Record<string, number>,
    updatedBy: string
  ): Promise<void> {
    const project = await this.projectRepo.findById(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    const collaborativeProject = project as any as CollaborativeProject;
    const updater = collaborativeProject.teamMembers?.find(m => m.userId === updatedBy);

    if (!updater || updater.role !== CollaborationRole.LEAD) {
      throw new Error('Only team leads can update profit distribution');
    }

    // Validate percentages sum to 100
    const total = Object.values(newDistribution).reduce((sum, pct) => sum + pct, 0);
    if (Math.abs(total - 100) > 0.01) {
      throw new Error('Profit shares must sum to 100%');
    }

    // Record in blockchain
    this.chain.addBlock(
      ActionType.UPDATE_PROFIT_SHARE,
      'Project',
      projectId,
      { projectId, newDistribution },
      updatedBy
    );
  }

  /**
   * Calculate profit distribution based on contributions
   */
  async calculateContributionBasedDistribution(
    projectId: string
  ): Promise<Record<string, number>> {
    const contributions = await this.contributionRepo.findByProject(projectId);
    const verifiedContributions = contributions.filter(c => c.status === 'verified');

    if (verifiedContributions.length === 0) {
      throw new Error('No verified contributions to calculate distribution');
    }

    // Calculate total credits earned by each contributor
    const contributorCredits: Record<string, number> = {};
    let totalCredits = 0;

    verifiedContributions.forEach(c => {
      contributorCredits[c.contributorId] = (contributorCredits[c.contributorId] || 0) + c.creditsEarned;
      totalCredits += c.creditsEarned;
    });

    // Convert to percentages
    const distribution: Record<string, number> = {};
    Object.entries(contributorCredits).forEach(([userId, credits]) => {
      distribution[userId] = (credits / totalCredits) * 100;
    });

    return distribution;
  }

  /**
   * Distribute payment among team members based on profit share
   */
  async distributePayment(
    projectId: string,
    milestoneId: string,
    totalAmount: number,
    clientId: string,
    actorId: string
  ): Promise<Array<{ userId: string; amount: number; paymentId: string }>> {
    const project = await this.projectRepo.findById(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    const collaborativeProject = project as any as CollaborativeProject;
    const distribution = collaborativeProject.profitDistribution.distribution;

    const payments: Array<{ userId: string; amount: number; paymentId: string }> = [];

    // Create payment for each team member based on their share
    for (const [userId, percentage] of Object.entries(distribution)) {
      const amount = (totalAmount * percentage) / 100;

      // Create payment using PaymentService
      const payment = await this.paymentService.createPayment(
        projectId,
        clientId,
        userId,
        amount,
        'USD',
        'stripe',
        actorId
      );

      // Link to milestone if provided
      if (milestoneId) {
        payment.milestoneId = milestoneId;
      }

      payments.push({
        userId,
        amount,
        paymentId: payment.id
      });
    }

    return payments;
  }

  /**
   * Get team statistics for a project
   */
  async getTeamStats(projectId: string): Promise<{
    totalMembers: number;
    membersByRole: Record<CollaborationRole, number>;
    totalContributions: number;
    totalCreditsEarned: number;
    topContributors: Array<{
      userId: string;
      contributions: number;
      credits: number;
      role: CollaborationRole;
    }>;
  }> {
    const project = await this.projectRepo.findById(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    const collaborativeProject = project as any as CollaborativeProject;
    const teamMembers = collaborativeProject.teamMembers || [];

    const membersByRole: Partial<Record<CollaborationRole, number>> = {};
    teamMembers.forEach(m => {
      membersByRole[m.role] = (membersByRole[m.role] || 0) + 1;
    });

    const projectStats = await this.contributionRepo.getProjectStats(projectId);
    const topContributors = projectStats.topContributors.map(tc => {
      const member = teamMembers.find(m => m.userId === tc.userId);
      return {
        ...tc,
        role: member?.role || CollaborationRole.CONTRIBUTOR
      };
    });

    return {
      totalMembers: teamMembers.length,
      membersByRole: membersByRole as Record<CollaborationRole, number>,
      totalContributions: projectStats.totalContributions,
      totalCreditsEarned: projectStats.topContributors.reduce((sum, c) => sum + c.credits, 0),
      topContributors
    };
  }

  /**
   * Get a user's contribution summary across all projects
   */
  async getUserCollaborationSummary(userId: string): Promise<{
    projectsAsLead: number;
    projectsAsContributor: number;
    totalContributions: number;
    totalCreditsEarned: number;
    contributionBreakdown: Record<ContributionType, number>;
    collaborationScore: number; // 0-100
  }> {
    const allProjects = await this.projectRepo.findAll();
    const collaborativeProjects = allProjects.filter(p =>
      (p as any).teamMembers !== undefined
    ) as any as CollaborativeProject[];

    const projectsAsLead = collaborativeProjects.filter(p =>
      p.teamMembers.some(m => m.userId === userId && m.role === CollaborationRole.LEAD)
    ).length;

    const projectsAsContributor = collaborativeProjects.filter(p =>
      p.teamMembers.some(m => m.userId === userId && m.role !== CollaborationRole.LEAD)
    ).length;

    const stats = await this.contributionRepo.getContributorStats(userId);

    // Calculate collaboration score (0-100)
    // Based on: number of projects, contributions, diversity of contribution types, credits earned
    const projectScore = Math.min(projectsAsLead * 10 + projectsAsContributor * 5, 30);
    const contributionScore = Math.min(stats.totalContributions * 2, 30);
    const diversityScore = Math.min(Object.keys(stats.contributionsByType).length * 5, 20);
    const creditScore = Math.min(stats.totalCredits / 100, 20);

    const collaborationScore = Math.min(
      projectScore + contributionScore + diversityScore + creditScore,
      100
    );

    return {
      projectsAsLead,
      projectsAsContributor,
      totalContributions: stats.totalContributions,
      totalCreditsEarned: stats.totalCredits,
      contributionBreakdown: stats.contributionsByType,
      collaborationScore: Math.round(collaborationScore)
    };
  }
}
