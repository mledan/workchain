/**
 * Observer Pattern - For event notifications and real-time updates
 *
 * Benefits:
 * - Loose coupling between components
 * - Easy to add new subscribers without modifying existing code
 * - Perfect for WebSocket broadcasting, logging, analytics
 * - Supports multiple notification channels
 */

export type EventType =
  | 'board:created'
  | 'board:updated'
  | 'card:created'
  | 'card:updated'
  | 'card:moved'
  | 'card:deleted'
  | 'card:assigned'
  | 'comment:added'
  | 'user:joined';

export interface Event {
  type: EventType;
  data: any;
  timestamp: Date;
  actorId?: string;
  boardId?: string;
}

/**
 * Observer interface - objects that want to be notified of events
 */
export interface IObserver {
  update(event: Event): void;
}

/**
 * Subject interface - objects that emit events
 */
export interface ISubject {
  attach(observer: IObserver, eventType?: EventType): void;
  detach(observer: IObserver, eventType?: EventType): void;
  notify(event: Event): void;
}

/**
 * EventEmitter - Central event dispatcher
 *
 * Uses the Observer pattern to notify subscribers of events
 */
export class EventEmitter implements ISubject {
  private observers: Map<EventType, Set<IObserver>> = new Map();
  private globalObservers: Set<IObserver> = new Set(); // Notified of all events

  /**
   * Attach an observer to specific event type or all events
   */
  attach(observer: IObserver, eventType?: EventType): void {
    if (eventType) {
      if (!this.observers.has(eventType)) {
        this.observers.set(eventType, new Set());
      }
      this.observers.get(eventType)!.add(observer);
    } else {
      // Subscribe to all events
      this.globalObservers.add(observer);
    }
  }

  /**
   * Detach an observer
   */
  detach(observer: IObserver, eventType?: EventType): void {
    if (eventType) {
      this.observers.get(eventType)?.delete(observer);
    } else {
      this.globalObservers.delete(observer);
    }
  }

  /**
   * Notify all relevant observers of an event
   */
  notify(event: Event): void {
    // Notify type-specific observers
    const typeObservers = this.observers.get(event.type);
    if (typeObservers) {
      typeObservers.forEach((observer) => observer.update(event));
    }

    // Notify global observers
    this.globalObservers.forEach((observer) => observer.update(event));
  }

  /**
   * Emit an event to all subscribers
   */
  emit(type: EventType, data: any, actorId?: string, boardId?: string): void {
    const event: Event = {
      type,
      data,
      timestamp: new Date(),
      actorId,
      boardId,
    };

    this.notify(event);
  }

  /**
   * Get statistics about observers
   */
  getStats() {
    const typeStats: { [key: string]: number } = {};

    this.observers.forEach((observers, type) => {
      typeStats[type] = observers.size;
    });

    return {
      globalObservers: this.globalObservers.size,
      typeSpecificObservers: typeStats,
      totalTypes: this.observers.size,
    };
  }
}

/**
 * ConsoleLogger - Example observer that logs events to console
 */
export class ConsoleLoggerObserver implements IObserver {
  update(event: Event): void {
    console.log(`[${event.timestamp.toISOString()}] ${event.type}:`, event.data);
  }
}

/**
 * WebSocketObserver - Broadcasts events to WebSocket clients
 * (Implementation will be completed when WebSocket server is added)
 */
export class WebSocketObserver implements IObserver {
  private io: any; // Socket.io instance

  constructor(io: any) {
    this.io = io;
  }

  update(event: Event): void {
    // Broadcast to all connected clients
    this.io.emit('event', event);

    // Also broadcast to board-specific room if applicable
    if (event.boardId) {
      this.io.to(`board:${event.boardId}`).emit('event', event);
    }
  }
}

/**
 * AuditLogObserver - Records events for compliance/auditing
 */
export class AuditLogObserver implements IObserver {
  private logs: Event[] = [];

  update(event: Event): void {
    this.logs.push(event);
  }

  getLogs(): Event[] {
    return [...this.logs];
  }

  getLogsSince(timestamp: Date): Event[] {
    return this.logs.filter((event) => event.timestamp >= timestamp);
  }
}
