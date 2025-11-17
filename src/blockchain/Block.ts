import crypto from 'crypto';
import { ActionType, CommandData, Block as IBlock } from '../types';

/**
 * Block - A single event in our faux-blockchain
 *
 * Each block represents an immutable action/event that occurred in the system.
 * Blocks are linked via previousHash, forming a chain that can detect tampering.
 */
export class Block implements IBlock {
  blockNumber: number;
  timestamp: Date;
  action: ActionType;
  entityType: 'Board' | 'Card' | 'Comment' | 'User';
  entityId: string;
  data: CommandData;
  actorId: string;
  previousHash: string;
  hash: string;

  constructor(
    blockNumber: number,
    action: ActionType,
    entityType: 'Board' | 'Card' | 'Comment' | 'User',
    entityId: string,
    data: CommandData,
    actorId: string,
    previousHash: string = '0'
  ) {
    this.blockNumber = blockNumber;
    this.timestamp = new Date();
    this.action = action;
    this.entityType = entityType;
    this.entityId = entityId;
    this.data = data;
    this.actorId = actorId;
    this.previousHash = previousHash;
    this.hash = this.calculateHash();
  }

  /**
   * Calculate SHA-256 hash of block contents
   * Hash is based on all block data + previous hash, creating the chain link
   */
  calculateHash(): string {
    const blockData = JSON.stringify({
      blockNumber: this.blockNumber,
      timestamp: this.timestamp.toISOString(),
      action: this.action,
      entityType: this.entityType,
      entityId: this.entityId,
      data: this.data,
      actorId: this.actorId,
      previousHash: this.previousHash,
    });

    return crypto.createHash('sha256').update(blockData).digest('hex');
  }

  /**
   * Verify this block's hash is correct
   */
  isValid(): boolean {
    return this.hash === this.calculateHash();
  }

  /**
   * Serialize block for storage
   */
  toJSON(): IBlock {
    return {
      blockNumber: this.blockNumber,
      timestamp: this.timestamp,
      action: this.action,
      entityType: this.entityType,
      entityId: this.entityId,
      data: this.data,
      actorId: this.actorId,
      previousHash: this.previousHash,
      hash: this.hash,
    };
  }

  /**
   * Deserialize block from storage
   */
  static fromJSON(json: IBlock): Block {
    const block = Object.create(Block.prototype);
    return Object.assign(block, {
      ...json,
      timestamp: new Date(json.timestamp),
    });
  }
}
