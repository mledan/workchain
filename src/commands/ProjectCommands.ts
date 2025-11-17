import { Command } from './Command';
import { Chain } from '../blockchain/Chain';
import { ProjectRepository } from '../repositories/ProjectRepository';
import { ProposalRepository } from '../repositories/ProposalRepository';
import { Project, ProjectStatus, ProjectType, Proposal, Milestone, Requirement } from '../types';
import { nanoid } from 'nanoid';

/**
 * CreateProjectCommand - Creates a new project
 */
export class CreateProjectCommand implements Command {
  private chain: Chain;
  private projectRepository: ProjectRepository;
  private projectData: {
    clientId: string;
    title: string;
    description: string;
    projectType: ProjectType;
    budget: {
      type: 'fixed' | 'hourly';
      amount: number;
      currency: string;
    };
    skills: string[];
    requirements: Requirement[];
    timeline?: {
      estimatedHours?: number;
      deadline?: Date;
    };
    actorId: string;
  };
  private projectId: string;

  constructor(
    chain: Chain,
    projectRepository: ProjectRepository,
    projectData: CreateProjectCommand['projectData']
  ) {
    this.chain = chain;
    this.projectRepository = projectRepository;
    this.projectData = projectData;
    this.projectId = nanoid();
  }

  async execute(): Promise<void> {
    const project: Project = {
      id: this.projectId,
      clientId: this.projectData.clientId,
      title: this.projectData.title,
      description: this.projectData.description,
      projectType: this.projectData.projectType,
      status: ProjectStatus.DRAFT,
      budget: this.projectData.budget,
      timeline: {
        estimatedHours: this.projectData.timeline?.estimatedHours,
        deadline: this.projectData.timeline?.deadline,
        milestones: [],
      },
      requirements: this.projectData.requirements,
      skills: this.projectData.skills,
      attachments: [],
      proposals: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Save to repository
    await this.projectRepository.create(project);

    // Log to blockchain
    this.chain.addBlock(
      'CREATE_PROJECT' as any,
      'Project',
      this.projectId,
      {
        title: project.title,
        clientId: project.clientId,
        budget: project.budget.amount,
        projectType: project.projectType,
      },
      this.projectData.actorId
    );
  }

  getProjectId(): string {
    return this.projectId;
  }
}

/**
 * PublishProjectCommand - Publishes a project for freelancers to see
 */
export class PublishProjectCommand implements Command {
  private chain: Chain;
  private projectRepository: ProjectRepository;
  private projectId: string;
  private actorId: string;

  constructor(
    chain: Chain,
    projectRepository: ProjectRepository,
    data: { projectId: string; actorId: string }
  ) {
    this.chain = chain;
    this.projectRepository = projectRepository;
    this.projectId = data.projectId;
    this.actorId = data.actorId;
  }

  async execute(): Promise<void> {
    const project = await this.projectRepository.findById(this.projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    if (project.status !== ProjectStatus.DRAFT) {
      throw new Error('Only draft projects can be published');
    }

    // Update project status
    await this.projectRepository.update(this.projectId, {
      status: ProjectStatus.OPEN,
    });

    // Log to blockchain
    this.chain.addBlock(
      'PUBLISH_PROJECT' as any,
      'Project',
      this.projectId,
      {
        title: project.title,
        budget: project.budget.amount,
      },
      this.actorId
    );
  }
}

/**
 * SubmitProposalCommand - Freelancer submits a proposal
 */
export class SubmitProposalCommand implements Command {
  private chain: Chain;
  private projectRepository: ProjectRepository;
  private proposalRepository: ProposalRepository;
  private proposalData: {
    projectId: string;
    freelancerId: string;
    coverLetter: string;
    proposedBudget: {
      type: 'fixed' | 'hourly';
      amount: number;
      currency: string;
    };
    estimatedTimeline: {
      hours: number;
      completionDate: Date;
    };
    milestones: any[];
    portfolioSamples: any[];
  };
  private proposalId: string;

  constructor(
    chain: Chain,
    projectRepository: ProjectRepository,
    proposalRepository: ProposalRepository,
    proposalData: SubmitProposalCommand['proposalData']
  ) {
    this.chain = chain;
    this.projectRepository = projectRepository;
    this.proposalRepository = proposalRepository;
    this.proposalData = proposalData;
    this.proposalId = nanoid();
  }

  async execute(): Promise<void> {
    const project = await this.projectRepository.findById(this.proposalData.projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    if (project.status !== ProjectStatus.OPEN) {
      throw new Error('Project is not open for proposals');
    }

    // Check if freelancer already submitted a proposal
    const existing = await this.proposalRepository.findByProjectAndFreelancer(
      this.proposalData.projectId,
      this.proposalData.freelancerId
    );

    if (existing) {
      throw new Error('Freelancer already submitted a proposal for this project');
    }

    const proposal: Proposal = {
      id: this.proposalId,
      projectId: this.proposalData.projectId,
      freelancerId: this.proposalData.freelancerId,
      coverLetter: this.proposalData.coverLetter,
      proposedBudget: this.proposalData.proposedBudget,
      estimatedTimeline: this.proposalData.estimatedTimeline,
      milestones: this.proposalData.milestones,
      portfolioSamples: this.proposalData.portfolioSamples,
      status: 'submitted',
      submittedAt: new Date(),
    };

    // Save to repository
    await this.proposalRepository.create(proposal);

    // Add proposal to project
    await this.projectRepository.addProposal(this.proposalData.projectId, proposal);

    // Update project status if needed
    if (project.status === ProjectStatus.OPEN) {
      await this.projectRepository.update(this.proposalData.projectId, {
        status: ProjectStatus.IN_REVIEW,
      });
    }

    // Log to blockchain
    this.chain.addBlock(
      'SUBMIT_PROPOSAL' as any,
      'Proposal',
      this.proposalId,
      {
        projectId: this.proposalData.projectId,
        freelancerId: this.proposalData.freelancerId,
        proposedBudget: this.proposalData.proposedBudget.amount,
      },
      this.proposalData.freelancerId
    );
  }

  getProposalId(): string {
    return this.proposalId;
  }
}

/**
 * AcceptProposalCommand - Client accepts a proposal
 */
export class AcceptProposalCommand implements Command {
  private chain: Chain;
  private projectRepository: ProjectRepository;
  private proposalRepository: ProposalRepository;
  private proposalId: string;
  private actorId: string;

  constructor(
    chain: Chain,
    projectRepository: ProjectRepository,
    proposalRepository: ProposalRepository,
    data: { proposalId: string; actorId: string }
  ) {
    this.chain = chain;
    this.projectRepository = projectRepository;
    this.proposalRepository = proposalRepository;
    this.proposalId = data.proposalId;
    this.actorId = data.actorId;
  }

  async execute(): Promise<void> {
    const proposal = await this.proposalRepository.findById(this.proposalId);
    if (!proposal) {
      throw new Error('Proposal not found');
    }

    const project = await this.projectRepository.findById(proposal.projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    // Update proposal status
    await this.proposalRepository.update(this.proposalId, {
      status: 'accepted',
    });

    // Reject all other proposals
    const allProposals = await this.proposalRepository.findByProject(proposal.projectId);
    for (const p of allProposals) {
      if (p.id !== this.proposalId && p.status === 'submitted') {
        await this.proposalRepository.update(p.id, { status: 'rejected' });
      }
    }

    // Update project
    await this.projectRepository.update(proposal.projectId, {
      status: ProjectStatus.ASSIGNED,
      assignedFreelancerId: proposal.freelancerId,
      budget: proposal.proposedBudget,
      timeline: {
        estimatedHours: proposal.estimatedTimeline.hours,
        deadline: proposal.estimatedTimeline.completionDate,
        milestones: proposal.milestones.map((m, idx) => ({
          id: nanoid(),
          projectId: proposal.projectId,
          title: m.title,
          description: '',
          deliverables: m.deliverables,
          amount: m.amount,
          deadline: new Date(Date.now() + m.estimatedDays * 24 * 60 * 60 * 1000),
          status: idx === 0 ? ('in_progress' as const) : ('pending' as const),
          deliveryFiles: [],
        })),
      },
    });

    // Log to blockchain
    this.chain.addBlock(
      'ACCEPT_PROPOSAL' as any,
      'Proposal',
      this.proposalId,
      {
        projectId: proposal.projectId,
        freelancerId: proposal.freelancerId,
        amount: proposal.proposedBudget.amount,
      },
      this.actorId
    );
  }
}

/**
 * SubmitMilestoneCommand - Freelancer submits a milestone
 */
export class SubmitMilestoneCommand implements Command {
  private chain: Chain;
  private projectRepository: ProjectRepository;
  private data: {
    projectId: string;
    milestoneId: string;
    deliveryFiles: any[];
    actorId: string;
  };

  constructor(chain: Chain, projectRepository: ProjectRepository, data: SubmitMilestoneCommand['data']) {
    this.chain = chain;
    this.projectRepository = projectRepository;
    this.data = data;
  }

  async execute(): Promise<void> {
    const project = await this.projectRepository.findById(this.data.projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    const milestone = project.timeline.milestones.find(m => m.id === this.data.milestoneId);
    if (!milestone) {
      throw new Error('Milestone not found');
    }

    if (milestone.status !== 'in_progress') {
      throw new Error('Milestone must be in progress to submit');
    }

    // Update milestone status
    milestone.status = 'submitted';
    milestone.submittedAt = new Date();
    milestone.deliveryFiles = this.data.deliveryFiles;

    await this.projectRepository.update(this.data.projectId, {
      timeline: project.timeline,
    });

    // Log to blockchain
    this.chain.addBlock(
      'SUBMIT_MILESTONE' as any,
      'Milestone',
      this.data.milestoneId,
      {
        projectId: this.data.projectId,
        milestoneTitle: milestone.title,
      },
      this.data.actorId
    );
  }
}

/**
 * ApproveMilestoneCommand - Client approves a milestone
 */
export class ApproveMilestoneCommand implements Command {
  private chain: Chain;
  private projectRepository: ProjectRepository;
  private data: {
    projectId: string;
    milestoneId: string;
    actorId: string;
  };

  constructor(chain: Chain, projectRepository: ProjectRepository, data: ApproveMilestoneCommand['data']) {
    this.chain = chain;
    this.projectRepository = projectRepository;
    this.data = data;
  }

  async execute(): Promise<void> {
    const project = await this.projectRepository.findById(this.data.projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    const milestoneIndex = project.timeline.milestones.findIndex(m => m.id === this.data.milestoneId);
    if (milestoneIndex === -1) {
      throw new Error('Milestone not found');
    }

    const milestone = project.timeline.milestones[milestoneIndex];

    if (milestone.status !== 'submitted') {
      throw new Error('Milestone must be submitted to approve');
    }

    // Update milestone status
    milestone.status = 'approved';
    milestone.approvedAt = new Date();

    // Start next milestone if available
    if (milestoneIndex + 1 < project.timeline.milestones.length) {
      project.timeline.milestones[milestoneIndex + 1].status = 'in_progress';
    }

    // Check if all milestones are completed
    const allCompleted = project.timeline.milestones.every(m => m.status === 'approved');

    await this.projectRepository.update(this.data.projectId, {
      timeline: project.timeline,
      status: allCompleted ? ProjectStatus.COMPLETED : ProjectStatus.IN_PROGRESS,
    });

    // Log to blockchain
    this.chain.addBlock(
      'APPROVE_MILESTONE' as any,
      'Milestone',
      this.data.milestoneId,
      {
        projectId: this.data.projectId,
        milestoneTitle: milestone.title,
        allCompleted,
      },
      this.data.actorId
    );
  }
}
