import { Block } from './Block';
import { ActionType, CommandData, ChainValidationResult, Block as IBlock } from '../types';

/**
 * Chain - Our faux-blockchain implementation
 *
 * Manages a linked list of immutable blocks (events).
 * Provides event sourcing capabilities and audit trail.
 *
 * Design Patterns Used:
 * - Singleton: Only one chain instance per application
 * - Event Sourcing: State is derived from events, not stored directly
 * - Chain of Responsibility: Blocks link to previous blocks
 */
export class Chain {
  private blocks: Block[] = [];
  private blockIndex: Map<string, Block[]> = new Map(); // entityId -> blocks

  constructor() {
    // Genesis block - the first block in the chain
    this.addGenesisBlock();
  }

  /**
   * Create the genesis (first) block
   */
  private addGenesisBlock(): void {
    const genesisBlock = new Block(
      0,
      ActionType.CREATE_BOARD,
      'Board',
      'genesis',
      { message: 'Genesis Block' },
      'system',
      '0'
    );
    this.blocks.push(genesisBlock);
  }

  /**
   * Add a new block to the chain
   * Returns the created block
   */
  addBlock(
    action: ActionType,
    entityType: 'Board' | 'Card' | 'Comment' | 'User',
    entityId: string,
    data: CommandData,
    actorId: string
  ): Block {
    const previousBlock = this.getLatestBlock();
    const newBlock = new Block(
      this.blocks.length,
      action,
      entityType,
      entityId,
      data,
      actorId,
      previousBlock.hash
    );

    this.blocks.push(newBlock);

    // Update index for fast lookups
    if (!this.blockIndex.has(entityId)) {
      this.blockIndex.set(entityId, []);
    }
    this.blockIndex.get(entityId)!.push(newBlock);

    return newBlock;
  }

  /**
   * Get the most recent block
   */
  getLatestBlock(): Block {
    return this.blocks[this.blocks.length - 1];
  }

  /**
   * Get all blocks
   */
  getAllBlocks(): Block[] {
    return [...this.blocks];
  }

  /**
   * Get history for a specific entity (card, board, etc)
   * O(1) lookup thanks to index
   */
  getHistory(entityId: string): Block[] {
    return this.blockIndex.get(entityId) || [];
  }

  /**
   * Get blocks within a time range
   */
  getBlocksInRange(startTime: Date, endTime: Date): Block[] {
    return this.blocks.filter(
      (block) => block.timestamp >= startTime && block.timestamp <= endTime
    );
  }

  /**
   * Validate entire chain integrity
   *
   * Algorithm: O(n) - must check every block
   * 1. Check each block's hash is correct
   * 2. Check each block links to previous block correctly
   */
  validateChain(): ChainValidationResult {
    // Genesis block is always valid
    for (let i = 1; i < this.blocks.length; i++) {
      const currentBlock = this.blocks[i];
      const previousBlock = this.blocks[i - 1];

      // Verify current block's hash
      if (!currentBlock.isValid()) {
        return {
          valid: false,
          brokenAtBlock: currentBlock.blockNumber,
          error: 'Block hash mismatch - data may be corrupted',
        };
      }

      // Verify link to previous block
      if (currentBlock.previousHash !== previousBlock.hash) {
        return {
          valid: false,
          brokenAtBlock: currentBlock.blockNumber,
          error: 'Chain broken - previousHash does not match previous block',
        };
      }
    }

    return { valid: true };
  }

  /**
   * Replay events up to a specific time to reconstruct state
   * This is the core of Event Sourcing!
   *
   * @param entityId - Optional: replay only events for this entity
   * @param upToTime - Optional: replay only up to this timestamp
   */
  replayEvents(entityId?: string, upToTime?: Date): Block[] {
    let events = entityId ? this.getHistory(entityId) : this.blocks;

    if (upToTime) {
      events = events.filter((block) => block.timestamp <= upToTime);
    }

    return events;
  }

  /**
   * Get chain statistics
   */
  getStats() {
    const actionCounts = new Map<ActionType, number>();
    const actorCounts = new Map<string, number>();

    for (const block of this.blocks) {
      actionCounts.set(block.action, (actionCounts.get(block.action) || 0) + 1);
      actorCounts.set(block.actorId, (actorCounts.get(block.actorId) || 0) + 1);
    }

    return {
      totalBlocks: this.blocks.length,
      uniqueEntities: this.blockIndex.size,
      actionCounts: Object.fromEntries(actionCounts),
      actorCounts: Object.fromEntries(actorCounts),
      latestBlockTime: this.getLatestBlock().timestamp,
    };
  }

  /**
   * Export chain to JSON for persistence
   */
  toJSON(): IBlock[] {
    return this.blocks.map((block) => block.toJSON());
  }

  /**
   * Import chain from JSON
   */
  static fromJSON(json: IBlock[]): Chain {
    const chain = new Chain();
    chain.blocks = []; // Remove genesis block

    for (const blockData of json) {
      const block = Block.fromJSON(blockData);
      chain.blocks.push(block);

      // Rebuild index
      if (!chain.blockIndex.has(block.entityId)) {
        chain.blockIndex.set(block.entityId, []);
      }
      chain.blockIndex.get(block.entityId)!.push(block);
    }

    return chain;
  }

  /**
   * Get the length of the chain
   */
  get length(): number {
    return this.blocks.length;
  }
}
