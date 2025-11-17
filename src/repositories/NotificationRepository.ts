import { IRepository } from './IRepository';
import { Notification, NotificationType } from '../types';
import { nanoid } from 'nanoid';

export class NotificationRepository implements IRepository<Notification> {
  private notifications: Map<string, Notification> = new Map();
  private userIndex: Map<string, Set<string>> = new Map(); // userId -> notificationIds
  private typeIndex: Map<NotificationType, Set<string>> = new Map();

  async create(data: Omit<Notification, 'id' | 'createdAt' | 'read'>): Promise<Notification> {
    const notification: Notification = {
      ...data,
      id: nanoid(),
      read: false,
      createdAt: new Date()
    };

    this.notifications.set(notification.id, notification);

    // Update indices
    if (!this.userIndex.has(notification.userId)) {
      this.userIndex.set(notification.userId, new Set());
    }
    this.userIndex.get(notification.userId)!.add(notification.id);

    if (!this.typeIndex.has(notification.type)) {
      this.typeIndex.set(notification.type, new Set());
    }
    this.typeIndex.get(notification.type)!.add(notification.id);

    return notification;
  }

  async findById(id: string): Promise<Notification | undefined> {
    return this.notifications.get(id);
  }

  async findAll(): Promise<Notification[]> {
    return Array.from(this.notifications.values());
  }

  async update(id: string, data: Partial<Notification>): Promise<Notification | undefined> {
    const notification = this.notifications.get(id);
    if (!notification) return undefined;

    const updated = { ...notification, ...data };
    this.notifications.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const notification = this.notifications.get(id);
    if (!notification) return false;

    // Clean up indices
    this.userIndex.get(notification.userId)?.delete(id);
    this.typeIndex.get(notification.type)?.delete(id);

    return this.notifications.delete(id);
  }

  async findByUser(userId: string): Promise<Notification[]> {
    const ids = this.userIndex.get(userId);
    if (!ids) return [];

    return Array.from(ids)
      .map(id => this.notifications.get(id))
      .filter((n): n is Notification => n !== undefined)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async findUnreadByUser(userId: string): Promise<Notification[]> {
    const userNotifications = await this.findByUser(userId);
    return userNotifications.filter(n => !n.read);
  }

  async findByType(type: NotificationType): Promise<Notification[]> {
    const ids = this.typeIndex.get(type);
    if (!ids) return [];

    return Array.from(ids)
      .map(id => this.notifications.get(id))
      .filter((n): n is Notification => n !== undefined);
  }

  async markAsRead(id: string): Promise<Notification | undefined> {
    const notification = this.notifications.get(id);
    if (!notification) return undefined;

    return this.update(id, {
      read: true,
      readAt: new Date()
    });
  }

  async markAllAsRead(userId: string): Promise<number> {
    const unread = await this.findUnreadByUser(userId);
    const now = new Date();

    for (const notification of unread) {
      await this.update(notification.id, {
        read: true,
        readAt: now
      });
    }

    return unread.length;
  }

  async getUnreadCount(userId: string): Promise<number> {
    const unread = await this.findUnreadByUser(userId);
    return unread.length;
  }

  async findByPriority(
    userId: string,
    priority: 'low' | 'normal' | 'high' | 'urgent'
  ): Promise<Notification[]> {
    const userNotifications = await this.findByUser(userId);
    return userNotifications.filter(n => n.priority === priority);
  }

  async findUrgent(userId: string): Promise<Notification[]> {
    return this.findByPriority(userId, 'urgent');
  }

  async deleteOldNotifications(daysOld: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const allNotifications = await this.findAll();
    const oldNotifications = allNotifications.filter(
      n => n.read && n.createdAt < cutoffDate
    );

    for (const notification of oldNotifications) {
      await this.delete(notification.id);
    }

    return oldNotifications.length;
  }

  async getUserNotificationStats(userId: string): Promise<{
    total: number;
    unread: number;
    byType: Record<NotificationType, number>;
    byPriority: Record<string, number>;
  }> {
    const userNotifications = await this.findByUser(userId);
    const unread = userNotifications.filter(n => !n.read);

    const byType: Partial<Record<NotificationType, number>> = {};
    const byPriority: Record<string, number> = {};

    userNotifications.forEach(n => {
      byType[n.type] = (byType[n.type] || 0) + 1;
      byPriority[n.priority] = (byPriority[n.priority] || 0) + 1;
    });

    return {
      total: userNotifications.length,
      unread: unread.length,
      byType: byType as Record<NotificationType, number>,
      byPriority
    };
  }
}
