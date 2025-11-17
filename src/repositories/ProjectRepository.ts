import { IRepository } from './IRepository';
import { Project, ProjectStatus, ProjectType, Proposal } from '../types';
import { nanoid } from 'nanoid';

/**
 * ProjectRepository - Repository for managing projects
 *
 * Pattern: Repository Pattern
 * Provides data access abstraction for Project entities
 */
export class ProjectRepository implements IRepository<Project> {
  private projects: Map<string, Project> = new Map();
  private clientIndex: Map<string, Set<string>> = new Map(); // clientId -> projectIds
  private freelancerIndex: Map<string, Set<string>> = new Map(); // freelancerId -> projectIds
  private statusIndex: Map<ProjectStatus, Set<string>> = new Map(); // status -> projectIds
  private skillIndex: Map<string, Set<string>> = new Map(); // skill -> projectIds

  async findById(id: string): Promise<Project | null> {
    return this.projects.get(id) || null;
  }

  async create(entity: Project): Promise<Project> {
    this.projects.set(entity.id, entity);

    // Update client index
    if (!this.clientIndex.has(entity.clientId)) {
      this.clientIndex.set(entity.clientId, new Set());
    }
    this.clientIndex.get(entity.clientId)!.add(entity.id);

    // Update status index
    if (!this.statusIndex.has(entity.status)) {
      this.statusIndex.set(entity.status, new Set());
    }
    this.statusIndex.get(entity.status)!.add(entity.id);

    // Update skill index
    for (const skill of entity.skills) {
      if (!this.skillIndex.has(skill)) {
        this.skillIndex.set(skill, new Set());
      }
      this.skillIndex.get(skill)!.add(entity.id);
    }

    // Update freelancer index if assigned
    if (entity.assignedFreelancerId) {
      if (!this.freelancerIndex.has(entity.assignedFreelancerId)) {
        this.freelancerIndex.set(entity.assignedFreelancerId, new Set());
      }
      this.freelancerIndex.get(entity.assignedFreelancerId)!.add(entity.id);
    }

    return entity;
  }

  async update(id: string, updates: Partial<Project>): Promise<Project | null> {
    const project = this.projects.get(id);
    if (!project) return null;

    const oldStatus = project.status;
    const oldFreelancer = project.assignedFreelancerId;

    const updated = {
      ...project,
      ...updates,
      updatedAt: new Date(),
    };

    this.projects.set(id, updated);

    // Update status index if status changed
    if (updates.status && updates.status !== oldStatus) {
      this.statusIndex.get(oldStatus)?.delete(id);
      if (!this.statusIndex.has(updates.status)) {
        this.statusIndex.set(updates.status, new Set());
      }
      this.statusIndex.get(updates.status)!.add(id);
    }

    // Update freelancer index if assignment changed
    if (updates.assignedFreelancerId !== undefined && updates.assignedFreelancerId !== oldFreelancer) {
      if (oldFreelancer) {
        this.freelancerIndex.get(oldFreelancer)?.delete(id);
      }
      if (updates.assignedFreelancerId) {
        if (!this.freelancerIndex.has(updates.assignedFreelancerId)) {
          this.freelancerIndex.set(updates.assignedFreelancerId, new Set());
        }
        this.freelancerIndex.get(updates.assignedFreelancerId)!.add(id);
      }
    }

    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const project = this.projects.get(id);
    if (!project) return false;

    this.projects.delete(id);

    // Clean up indices
    this.clientIndex.get(project.clientId)?.delete(id);
    this.statusIndex.get(project.status)?.delete(id);

    for (const skill of project.skills) {
      this.skillIndex.get(skill)?.delete(id);
    }

    if (project.assignedFreelancerId) {
      this.freelancerIndex.get(project.assignedFreelancerId)?.delete(id);
    }

    return true;
  }

  async findAll(): Promise<Project[]> {
    return Array.from(this.projects.values());
  }

  // Custom query methods

  async findByClient(clientId: string): Promise<Project[]> {
    const projectIds = this.clientIndex.get(clientId) || new Set();
    return Array.from(projectIds)
      .map(id => this.projects.get(id))
      .filter((p): p is Project => p !== undefined);
  }

  async findByFreelancer(freelancerId: string): Promise<Project[]> {
    const projectIds = this.freelancerIndex.get(freelancerId) || new Set();
    return Array.from(projectIds)
      .map(id => this.projects.get(id))
      .filter((p): p is Project => p !== undefined);
  }

  async findByStatus(status: ProjectStatus): Promise<Project[]> {
    const projectIds = this.statusIndex.get(status) || new Set();
    return Array.from(projectIds)
      .map(id => this.projects.get(id))
      .filter((p): p is Project => p !== undefined);
  }

  async findBySkill(skill: string): Promise<Project[]> {
    const projectIds = this.skillIndex.get(skill) || new Set();
    return Array.from(projectIds)
      .map(id => this.projects.get(id))
      .filter((p): p is Project => p !== undefined);
  }

  async findBySkills(skills: string[]): Promise<Project[]> {
    // Find projects that match ANY of the skills
    const projectIds = new Set<string>();

    for (const skill of skills) {
      const ids = this.skillIndex.get(skill) || new Set();
      ids.forEach(id => projectIds.add(id));
    }

    return Array.from(projectIds)
      .map(id => this.projects.get(id))
      .filter((p): p is Project => p !== undefined);
  }

  async findOpen(): Promise<Project[]> {
    return this.findByStatus(ProjectStatus.OPEN);
  }

  async findInProgress(): Promise<Project[]> {
    return this.findByStatus(ProjectStatus.IN_PROGRESS);
  }

  async search(query: {
    clientId?: string;
    freelancerId?: string;
    status?: ProjectStatus;
    skills?: string[];
    projectType?: ProjectType;
    minBudget?: number;
    maxBudget?: number;
  }): Promise<Project[]> {
    let results = await this.findAll();

    if (query.clientId) {
      results = results.filter(p => p.clientId === query.clientId);
    }

    if (query.freelancerId) {
      results = results.filter(p => p.assignedFreelancerId === query.freelancerId);
    }

    if (query.status) {
      results = results.filter(p => p.status === query.status);
    }

    if (query.skills && query.skills.length > 0) {
      results = results.filter(p =>
        query.skills!.some(skill => p.skills.includes(skill))
      );
    }

    if (query.projectType) {
      results = results.filter(p => p.projectType === query.projectType);
    }

    if (query.minBudget !== undefined) {
      results = results.filter(p => p.budget.amount >= query.minBudget!);
    }

    if (query.maxBudget !== undefined) {
      results = results.filter(p => p.budget.amount <= query.maxBudget!);
    }

    return results;
  }

  // Add proposal to project
  async addProposal(projectId: string, proposal: Proposal): Promise<Project | null> {
    const project = this.projects.get(projectId);
    if (!project) return null;

    project.proposals.push(proposal);
    project.updatedAt = new Date();

    return project;
  }

  // Get statistics
  getStats() {
    const statusCounts: Record<string, number> = {};
    const typeCounts: Record<string, number> = {};
    let totalBudget = 0;

    for (const project of this.projects.values()) {
      statusCounts[project.status] = (statusCounts[project.status] || 0) + 1;
      typeCounts[project.projectType] = (typeCounts[project.projectType] || 0) + 1;
      totalBudget += project.budget.amount;
    }

    return {
      totalProjects: this.projects.size,
      totalClients: this.clientIndex.size,
      totalFreelancers: this.freelancerIndex.size,
      statusCounts,
      typeCounts,
      totalBudget,
      averageBudget: this.projects.size > 0 ? totalBudget / this.projects.size : 0,
    };
  }
}
