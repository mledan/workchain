import { NotificationRepository } from '../repositories/NotificationRepository';
import {
  Notification,
  NotificationType,
  ActionType
} from '../types';
import { Chain } from '../blockchain/Chain';

/**
 * NotificationService manages user notifications for all platform events
 */
export class NotificationService {
  constructor(
    private notificationRepo: NotificationRepository,
    private chain: Chain
  ) {}

  /**
   * Create a notification
   */
  async createNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    options?: {
      referenceId?: string;
      referenceType?: string;
      actionUrl?: string;
      priority?: 'low' | 'normal' | 'high' | 'urgent';
    }
  ): Promise<Notification> {
    const notification = await this.notificationRepo.create({
      userId,
      type,
      title,
      message,
      referenceId: options?.referenceId,
      referenceType: options?.referenceType,
      actionUrl: options?.actionUrl,
      priority: options?.priority || 'normal'
    });

    // Record in blockchain
    this.chain.addBlock(
      ActionType.SEND_NOTIFICATION,
      'Notification',
      notification.id,
      { notification },
      'system'
    );

    return notification;
  }

  /**
   * Notify when a contribution is verified
   */
  async notifyContributionVerified(
    userId: string,
    contributionId: string,
    creditsEarned: number,
    projectTitle: string
  ): Promise<Notification> {
    return this.createNotification(
      userId,
      NotificationType.CONTRIBUTION_VERIFIED,
      'Contribution Verified!',
      `Your contribution to "${projectTitle}" has been verified. You earned ${creditsEarned} credits!`,
      {
        referenceId: contributionId,
        referenceType: 'contribution',
        actionUrl: `/contributions/${contributionId}`,
        priority: 'high'
      }
    );
  }

  /**
   * Notify when credits are earned
   */
  async notifyCreditsEarned(
    userId: string,
    amount: number,
    reason: string,
    referenceId: string
  ): Promise<Notification> {
    return this.createNotification(
      userId,
      NotificationType.CREDITS_EARNED,
      'Credits Earned!',
      `You earned ${amount} credits: ${reason}`,
      {
        referenceId,
        referenceType: 'credit',
        actionUrl: `/credits`,
        priority: 'normal'
      }
    );
  }

  /**
   * Notify when payment is received
   */
  async notifyPaymentReceived(
    userId: string,
    amount: number,
    currency: string,
    projectId: string,
    projectTitle: string
  ): Promise<Notification> {
    return this.createNotification(
      userId,
      NotificationType.PAYMENT_RECEIVED,
      'Payment Received!',
      `You received ${currency} ${amount.toFixed(2)} for "${projectTitle}"`,
      {
        referenceId: projectId,
        referenceType: 'payment',
        actionUrl: `/payments`,
        priority: 'high'
      }
    );
  }

  /**
   * Notify when tax form is required
   */
  async notifyTaxFormRequired(
    userId: string,
    reason: string
  ): Promise<Notification> {
    return this.createNotification(
      userId,
      NotificationType.TAX_FORM_REQUIRED,
      'Tax Information Required',
      `Please submit your tax information: ${reason}`,
      {
        actionUrl: `/settings/tax`,
        priority: 'urgent'
      }
    );
  }

  /**
   * Notify when agreement is pending signature
   */
  async notifyAgreementPending(
    userId: string,
    agreementId: string,
    agreementType: string,
    projectTitle: string
  ): Promise<Notification> {
    return this.createNotification(
      userId,
      NotificationType.AGREEMENT_PENDING,
      'Agreement Requires Signature',
      `Please sign the ${agreementType} for "${projectTitle}"`,
      {
        referenceId: agreementId,
        referenceType: 'agreement',
        actionUrl: `/agreements/${agreementId}`,
        priority: 'high'
      }
    );
  }

  /**
   * Notify when invited to a team
   */
  async notifyTeamInvitation(
    userId: string,
    projectId: string,
    projectTitle: string,
    role: string,
    invitedBy: string
  ): Promise<Notification> {
    return this.createNotification(
      userId,
      NotificationType.TEAM_INVITATION,
      'Team Invitation',
      `You've been invited to join "${projectTitle}" as ${role}`,
      {
        referenceId: projectId,
        referenceType: 'project',
        actionUrl: `/projects/${projectId}/join`,
        priority: 'high'
      }
    );
  }

  /**
   * Notify when milestone is approved
   */
  async notifyMilestoneApproved(
    userId: string,
    milestoneId: string,
    milestoneTitle: string,
    amount: number
  ): Promise<Notification> {
    return this.createNotification(
      userId,
      NotificationType.MILESTONE_APPROVED,
      'Milestone Approved!',
      `Your milestone "${milestoneTitle}" has been approved. Payment of $${amount} is being processed.`,
      {
        referenceId: milestoneId,
        referenceType: 'milestone',
        actionUrl: `/milestones/${milestoneId}`,
        priority: 'high'
      }
    );
  }

  /**
   * Notify when a review is received
   */
  async notifyReviewReceived(
    userId: string,
    reviewId: string,
    rating: number,
    projectTitle: string
  ): Promise<Notification> {
    return this.createNotification(
      userId,
      NotificationType.REVIEW_RECEIVED,
      'New Review Received',
      `You received a ${rating}-star review for "${projectTitle}"`,
      {
        referenceId: reviewId,
        referenceType: 'review',
        actionUrl: `/reviews/${reviewId}`,
        priority: 'normal'
      }
    );
  }

  /**
   * Notify when invited to a project
   */
  async notifyProjectInvitation(
    userId: string,
    projectId: string,
    projectTitle: string,
    budget: number
  ): Promise<Notification> {
    return this.createNotification(
      userId,
      NotificationType.PROJECT_INVITATION,
      'Project Invitation',
      `You've been invited to bid on "${projectTitle}" (Budget: $${budget})`,
      {
        referenceId: projectId,
        referenceType: 'project',
        actionUrl: `/projects/${projectId}`,
        priority: 'normal'
      }
    );
  }

  /**
   * Notify when code review is requested
   */
  async notifyCodeReviewRequest(
    userId: string,
    contributionId: string,
    projectTitle: string,
    requestedBy: string
  ): Promise<Notification> {
    return this.createNotification(
      userId,
      NotificationType.CODE_REVIEW_REQUEST,
      'Code Review Requested',
      `Your review is requested for a contribution in "${projectTitle}"`,
      {
        referenceId: contributionId,
        referenceType: 'contribution',
        actionUrl: `/contributions/${contributionId}/review`,
        priority: 'high'
      }
    );
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<Notification | undefined> {
    const notification = await this.notificationRepo.markAsRead(notificationId);

    if (notification) {
      this.chain.addBlock(
        ActionType.READ_NOTIFICATION,
        'Notification',
        notificationId,
        { notificationId, readAt: notification.readAt },
        notification.userId
      );
    }

    return notification;
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<number> {
    return this.notificationRepo.markAllAsRead(userId);
  }

  /**
   * Get user notifications
   */
  async getUserNotifications(userId: string, unreadOnly: boolean = false): Promise<Notification[]> {
    if (unreadOnly) {
      return this.notificationRepo.findUnreadByUser(userId);
    }
    return this.notificationRepo.findByUser(userId);
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationRepo.getUnreadCount(userId);
  }

  /**
   * Get urgent notifications
   */
  async getUrgentNotifications(userId: string): Promise<Notification[]> {
    return this.notificationRepo.findUrgent(userId);
  }

  /**
   * Delete old read notifications (cleanup)
   */
  async cleanupOldNotifications(daysOld: number = 30): Promise<number> {
    return this.notificationRepo.deleteOldNotifications(daysOld);
  }

  /**
   * Get notification statistics for a user
   */
  async getUserStats(userId: string): Promise<any> {
    return this.notificationRepo.getUserNotificationStats(userId);
  }
}
