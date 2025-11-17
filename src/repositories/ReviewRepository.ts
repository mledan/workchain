import { IRepository } from './IRepository';
import { Review } from '../types';

/**
 * ReviewRepository - Repository for managing reviews
 *
 * Pattern: Repository Pattern
 * Provides data access abstraction for Review entities
 */
export class ReviewRepository implements IRepository<Review> {
  private reviews: Map<string, Review> = new Map();
  private projectIndex: Map<string, Set<string>> = new Map(); // projectId -> reviewIds
  private reviewerIndex: Map<string, Set<string>> = new Map(); // reviewerId -> reviewIds
  private revieweeIndex: Map<string, Set<string>> = new Map(); // revieweeId -> reviewIds

  async findById(id: string): Promise<Review | null> {
    return this.reviews.get(id) || null;
  }

  async create(entity: Review): Promise<Review> {
    this.reviews.set(entity.id, entity);

    // Update project index
    if (!this.projectIndex.has(entity.projectId)) {
      this.projectIndex.set(entity.projectId, new Set());
    }
    this.projectIndex.get(entity.projectId)!.add(entity.id);

    // Update reviewer index
    if (!this.reviewerIndex.has(entity.reviewerId)) {
      this.reviewerIndex.set(entity.reviewerId, new Set());
    }
    this.reviewerIndex.get(entity.reviewerId)!.add(entity.id);

    // Update reviewee index
    if (!this.revieweeIndex.has(entity.revieweeId)) {
      this.revieweeIndex.set(entity.revieweeId, new Set());
    }
    this.revieweeIndex.get(entity.revieweeId)!.add(entity.id);

    return entity;
  }

  async update(id: string, updates: Partial<Review>): Promise<Review | null> {
    const review = this.reviews.get(id);
    if (!review) return null;

    const updated = {
      ...review,
      ...updates,
    };

    this.reviews.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const review = this.reviews.get(id);
    if (!review) return false;

    this.reviews.delete(id);

    // Clean up indices
    this.projectIndex.get(review.projectId)?.delete(id);
    this.reviewerIndex.get(review.reviewerId)?.delete(id);
    this.revieweeIndex.get(review.revieweeId)?.delete(id);

    return true;
  }

  async findAll(): Promise<Review[]> {
    return Array.from(this.reviews.values());
  }

  // Custom query methods

  async findByProject(projectId: string): Promise<Review[]> {
    const reviewIds = this.projectIndex.get(projectId) || new Set();
    return Array.from(reviewIds)
      .map(id => this.reviews.get(id))
      .filter((r): r is Review => r !== undefined);
  }

  async findByReviewer(reviewerId: string): Promise<Review[]> {
    const reviewIds = this.reviewerIndex.get(reviewerId) || new Set();
    return Array.from(reviewIds)
      .map(id => this.reviews.get(id))
      .filter((r): r is Review => r !== undefined)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async findByReviewee(revieweeId: string): Promise<Review[]> {
    const reviewIds = this.revieweeIndex.get(revieweeId) || new Set();
    return Array.from(reviewIds)
      .map(id => this.reviews.get(id))
      .filter((r): r is Review => r !== undefined)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // Calculate average ratings for a user
  async calculateUserRating(userId: string): Promise<{
    overallRating: number;
    communication: number;
    quality: number;
    timeliness: number;
    professionalism: number;
    totalReviews: number;
  }> {
    const reviews = await this.findByReviewee(userId);

    if (reviews.length === 0) {
      return {
        overallRating: 0,
        communication: 0,
        quality: 0,
        timeliness: 0,
        professionalism: 0,
        totalReviews: 0,
      };
    }

    const totals = reviews.reduce(
      (acc, review) => ({
        rating: acc.rating + review.rating,
        communication: acc.communication + review.feedback.communication,
        quality: acc.quality + review.feedback.quality,
        timeliness: acc.timeliness + review.feedback.timeliness,
        professionalism: acc.professionalism + review.feedback.professionalism,
      }),
      {
        rating: 0,
        communication: 0,
        quality: 0,
        timeliness: 0,
        professionalism: 0,
      }
    );

    const count = reviews.length;

    return {
      overallRating: totals.rating / count,
      communication: totals.communication / count,
      quality: totals.quality / count,
      timeliness: totals.timeliness / count,
      professionalism: totals.professionalism / count,
      totalReviews: count,
    };
  }

  // Get statistics
  getStats() {
    let totalRating = 0;
    let totalCommunication = 0;
    let totalQuality = 0;
    let totalTimeliness = 0;
    let totalProfessionalism = 0;
    const count = this.reviews.size;

    for (const review of this.reviews.values()) {
      totalRating += review.rating;
      totalCommunication += review.feedback.communication;
      totalQuality += review.feedback.quality;
      totalTimeliness += review.feedback.timeliness;
      totalProfessionalism += review.feedback.professionalism;
    }

    return {
      totalReviews: count,
      totalReviewers: this.reviewerIndex.size,
      totalReviewees: this.revieweeIndex.size,
      averageRating: count > 0 ? totalRating / count : 0,
      averageCommunication: count > 0 ? totalCommunication / count : 0,
      averageQuality: count > 0 ? totalQuality / count : 0,
      averageTimeliness: count > 0 ? totalTimeliness / count : 0,
      averageProfessionalism: count > 0 ? totalProfessionalism / count : 0,
    };
  }
}
