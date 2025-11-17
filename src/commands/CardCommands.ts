import { Command } from './Command';
import { ActionType, Card, CommandData, Priority } from '../types';
import { Chain } from '../blockchain/Chain';
import { CardRepository } from '../repositories/CardRepository';
import { nanoid } from 'nanoid';

/**
 * CreateCardCommand - Creates a new card
 */
export class CreateCardCommand extends Command {
  private cardId: string;
  private boardId: string;
  private columnId: string;
  private title: string;
  private description: string;
  private priority: Priority;
  private actorId: string;
  private repository: CardRepository;
  private parentId?: string;

  constructor(
    chain: Chain,
    repository: CardRepository,
    data: {
      boardId: string;
      columnId: string;
      title: string;
      description: string;
      priority: Priority;
      actorId: string;
      parentId?: string;
    }
  ) {
    super(chain);
    this.cardId = nanoid();
    this.boardId = data.boardId;
    this.columnId = data.columnId;
    this.title = data.title;
    this.description = data.description;
    this.priority = data.priority;
    this.actorId = data.actorId;
    this.repository = repository;
    this.parentId = data.parentId;
  }

  async execute(): Promise<void> {
    const card: Card = {
      id: this.cardId,
      boardId: this.boardId,
      columnId: this.columnId,
      title: this.title,
      description: this.description,
      priority: this.priority,
      parentId: this.parentId,
      position: 0, // Will be set by repository
      tags: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: this.actorId,
    };

    await this.repository.create(card);
    this.addToChain();
  }

  getActionType(): ActionType {
    return ActionType.CREATE_CARD;
  }

  getEntityType(): 'Card' {
    return 'Card';
  }

  getEntityId(): string {
    return this.cardId;
  }

  getData(): CommandData {
    return {
      cardId: this.cardId,
      boardId: this.boardId,
      columnId: this.columnId,
      title: this.title,
      description: this.description,
      priority: this.priority,
      parentId: this.parentId,
    };
  }

  getActorId(): string {
    return this.actorId;
  }

  getCardId(): string {
    return this.cardId;
  }
}

/**
 * MoveCardCommand - Moves a card to a different column
 */
export class MoveCardCommand extends Command {
  private cardId: string;
  private fromColumnId: string;
  private toColumnId: string;
  private position: number;
  private actorId: string;
  private repository: CardRepository;

  constructor(
    chain: Chain,
    repository: CardRepository,
    data: {
      cardId: string;
      fromColumnId: string;
      toColumnId: string;
      position: number;
      actorId: string;
    }
  ) {
    super(chain);
    this.cardId = data.cardId;
    this.fromColumnId = data.fromColumnId;
    this.toColumnId = data.toColumnId;
    this.position = data.position;
    this.actorId = data.actorId;
    this.repository = repository;
  }

  async execute(): Promise<void> {
    await this.repository.move(this.cardId, this.toColumnId, this.position);
    this.addToChain();
  }

  getActionType(): ActionType {
    return ActionType.MOVE_CARD;
  }

  getEntityType(): 'Card' {
    return 'Card';
  }

  getEntityId(): string {
    return this.cardId;
  }

  getData(): CommandData {
    return {
      cardId: this.cardId,
      fromColumnId: this.fromColumnId,
      toColumnId: this.toColumnId,
      position: this.position,
    };
  }

  getActorId(): string {
    return this.actorId;
  }
}

/**
 * UpdateCardCommand - Updates card properties
 */
export class UpdateCardCommand extends Command {
  private cardId: string;
  private updates: Partial<Card>;
  private actorId: string;
  private repository: CardRepository;

  constructor(
    chain: Chain,
    repository: CardRepository,
    data: {
      cardId: string;
      updates: Partial<Card>;
      actorId: string;
    }
  ) {
    super(chain);
    this.cardId = data.cardId;
    this.updates = data.updates;
    this.actorId = data.actorId;
    this.repository = repository;
  }

  async execute(): Promise<void> {
    await this.repository.update(this.cardId, this.updates);
    this.addToChain();
  }

  getActionType(): ActionType {
    return ActionType.UPDATE_CARD;
  }

  getEntityType(): 'Card' {
    return 'Card';
  }

  getEntityId(): string {
    return this.cardId;
  }

  getData(): CommandData {
    return {
      cardId: this.cardId,
      updates: this.updates,
    };
  }

  getActorId(): string {
    return this.actorId;
  }
}

/**
 * AssignCardCommand - Assigns a card to a user
 */
export class AssignCardCommand extends Command {
  private cardId: string;
  private assigneeId: string;
  private actorId: string;
  private repository: CardRepository;

  constructor(
    chain: Chain,
    repository: CardRepository,
    data: {
      cardId: string;
      assigneeId: string;
      actorId: string;
    }
  ) {
    super(chain);
    this.cardId = data.cardId;
    this.assigneeId = data.assigneeId;
    this.actorId = data.actorId;
    this.repository = repository;
  }

  async execute(): Promise<void> {
    await this.repository.update(this.cardId, { assigneeId: this.assigneeId });
    this.addToChain();
  }

  getActionType(): ActionType {
    return ActionType.ASSIGN_CARD;
  }

  getEntityType(): 'Card' {
    return 'Card';
  }

  getEntityId(): string {
    return this.cardId;
  }

  getData(): CommandData {
    return {
      cardId: this.cardId,
      assigneeId: this.assigneeId,
    };
  }

  getActorId(): string {
    return this.actorId;
  }
}
