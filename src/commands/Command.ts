import { ActionType, CommandData } from '../types';
import { Chain } from '../blockchain/Chain';

/**
 * Command Pattern - Base interface for all actions in the system
 *
 * Benefits:
 * - Encapsulates actions as objects
 * - Easy to serialize and store in blockchain
 * - Supports undo/redo
 * - Separates action request from execution
 */
export interface ICommand {
  execute(): Promise<void>;
  undo?(): Promise<void>;
  getActionType(): ActionType;
  getEntityType(): 'Board' | 'Card' | 'Comment' | 'User';
  getEntityId(): string;
  getData(): CommandData;
  getActorId(): string;
}

/**
 * Abstract base class for commands
 */
export abstract class Command implements ICommand {
  protected chain: Chain;

  constructor(chain: Chain) {
    this.chain = chain;
  }

  abstract execute(): Promise<void>;
  abstract getActionType(): ActionType;
  abstract getEntityType(): 'Board' | 'Card' | 'Comment' | 'User';
  abstract getEntityId(): string;
  abstract getData(): CommandData;
  abstract getActorId(): string;

  /**
   * Add this command to the blockchain
   */
  protected addToChain(): void {
    this.chain.addBlock(
      this.getActionType(),
      this.getEntityType(),
      this.getEntityId(),
      this.getData(),
      this.getActorId()
    );
  }
}
