import { IRepository } from './IRepository';
import { UserProfile, UserRole } from '../types';

/**
 * UserProfileRepository - Repository for managing user profiles
 *
 * Pattern: Repository Pattern
 * Provides data access abstraction for UserProfile entities
 */
export class UserProfileRepository implements IRepository<UserProfile> {
  private users: Map<string, UserProfile> = new Map();
  private emailIndex: Map<string, string> = new Map(); // email -> userId
  private usernameIndex: Map<string, string> = new Map(); // username -> userId
  private roleIndex: Map<UserRole, Set<string>> = new Map(); // role -> userIds
  private skillIndex: Map<string, Set<string>> = new Map(); // skill -> userIds

  async findById(id: string): Promise<UserProfile | null> {
    return this.users.get(id) || null;
  }

  async create(entity: UserProfile): Promise<UserProfile> {
    this.users.set(entity.id, entity);

    // Update email index
    this.emailIndex.set(entity.email, entity.id);

    // Update username index
    this.usernameIndex.set(entity.username, entity.id);

    // Update role index
    for (const role of entity.roles) {
      if (!this.roleIndex.has(role)) {
        this.roleIndex.set(role, new Set());
      }
      this.roleIndex.get(role)!.add(entity.id);
    }

    // Update skill index
    for (const skill of entity.skills) {
      if (!this.skillIndex.has(skill)) {
        this.skillIndex.set(skill, new Set());
      }
      this.skillIndex.get(skill)!.add(entity.id);
    }

    return entity;
  }

  async update(id: string, updates: Partial<UserProfile>): Promise<UserProfile | null> {
    const user = this.users.get(id);
    if (!user) return null;

    const oldEmail = user.email;
    const oldUsername = user.username;
    const oldSkills = user.skills;

    const updated = {
      ...user,
      ...updates,
    };

    this.users.set(id, updated);

    // Update email index if changed
    if (updates.email && updates.email !== oldEmail) {
      this.emailIndex.delete(oldEmail);
      this.emailIndex.set(updates.email, id);
    }

    // Update username index if changed
    if (updates.username && updates.username !== oldUsername) {
      this.usernameIndex.delete(oldUsername);
      this.usernameIndex.set(updates.username, id);
    }

    // Update skill index if changed
    if (updates.skills) {
      // Remove old skills
      for (const skill of oldSkills) {
        this.skillIndex.get(skill)?.delete(id);
      }
      // Add new skills
      for (const skill of updates.skills) {
        if (!this.skillIndex.has(skill)) {
          this.skillIndex.set(skill, new Set());
        }
        this.skillIndex.get(skill)!.add(id);
      }
    }

    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const user = this.users.get(id);
    if (!user) return false;

    this.users.delete(id);

    // Clean up indices
    this.emailIndex.delete(user.email);
    this.usernameIndex.delete(user.username);

    for (const role of user.roles) {
      this.roleIndex.get(role)?.delete(id);
    }

    for (const skill of user.skills) {
      this.skillIndex.get(skill)?.delete(id);
    }

    return true;
  }

  async findAll(): Promise<UserProfile[]> {
    return Array.from(this.users.values());
  }

  // Custom query methods

  async findByEmail(email: string): Promise<UserProfile | null> {
    const userId = this.emailIndex.get(email);
    return userId ? this.users.get(userId) || null : null;
  }

  async findByUsername(username: string): Promise<UserProfile | null> {
    const userId = this.usernameIndex.get(username);
    return userId ? this.users.get(userId) || null : null;
  }

  async findByRole(role: UserRole): Promise<UserProfile[]> {
    const userIds = this.roleIndex.get(role) || new Set();
    return Array.from(userIds)
      .map(id => this.users.get(id))
      .filter((u): u is UserProfile => u !== undefined);
  }

  async findFreelancers(): Promise<UserProfile[]> {
    return this.findByRole(UserRole.FREELANCER);
  }

  async findClients(): Promise<UserProfile[]> {
    return this.findByRole(UserRole.CLIENT);
  }

  async findBySkill(skill: string): Promise<UserProfile[]> {
    const userIds = this.skillIndex.get(skill) || new Set();
    return Array.from(userIds)
      .map(id => this.users.get(id))
      .filter((u): u is UserProfile => u !== undefined)
      .filter(u => u.roles.includes(UserRole.FREELANCER));
  }

  async findBySkills(skills: string[]): Promise<UserProfile[]> {
    // Find freelancers that match ANY of the skills
    const userIds = new Set<string>();

    for (const skill of skills) {
      const ids = this.skillIndex.get(skill) || new Set();
      ids.forEach(id => userIds.add(id));
    }

    return Array.from(userIds)
      .map(id => this.users.get(id))
      .filter((u): u is UserProfile => u !== undefined)
      .filter(u => u.roles.includes(UserRole.FREELANCER));
  }

  async search(query: {
    role?: UserRole;
    skills?: string[];
    minRating?: number;
    availability?: UserProfile['availability'];
    verified?: boolean;
    minHourlyRate?: number;
    maxHourlyRate?: number;
  }): Promise<UserProfile[]> {
    let results = await this.findAll();

    if (query.role) {
      results = results.filter(u => u.roles.includes(query.role!));
    }

    if (query.skills && query.skills.length > 0) {
      results = results.filter(u =>
        query.skills!.some(skill => u.skills.includes(skill))
      );
    }

    if (query.minRating !== undefined) {
      results = results.filter(u => u.rating >= query.minRating!);
    }

    if (query.availability) {
      results = results.filter(u => u.availability === query.availability);
    }

    if (query.verified !== undefined) {
      results = results.filter(u => u.verified === query.verified);
    }

    if (query.minHourlyRate !== undefined) {
      results = results.filter(u => u.hourlyRate && u.hourlyRate >= query.minHourlyRate!);
    }

    if (query.maxHourlyRate !== undefined) {
      results = results.filter(u => u.hourlyRate && u.hourlyRate <= query.maxHourlyRate!);
    }

    return results;
  }

  // Get statistics
  getStats() {
    const roleCounts: Record<string, number> = {};
    const availabilityCounts: Record<string, number> = {};
    let totalRating = 0;
    let ratedUsers = 0;
    let totalEarned = 0;
    let totalSpent = 0;

    for (const user of this.users.values()) {
      for (const role of user.roles) {
        roleCounts[role] = (roleCounts[role] || 0) + 1;
      }

      availabilityCounts[user.availability] = (availabilityCounts[user.availability] || 0) + 1;

      if (user.rating > 0) {
        totalRating += user.rating;
        ratedUsers++;
      }

      if (user.totalEarned) {
        totalEarned += user.totalEarned;
      }

      if (user.totalSpent) {
        totalSpent += user.totalSpent;
      }
    }

    return {
      totalUsers: this.users.size,
      roleCounts,
      availabilityCounts,
      verifiedUsers: Array.from(this.users.values()).filter(u => u.verified).length,
      averageRating: ratedUsers > 0 ? totalRating / ratedUsers : 0,
      totalEarned,
      totalSpent,
      totalSkills: this.skillIndex.size,
    };
  }
}
