import { IRepository } from './IRepository';
import { Card } from '../types';

/**
 * CardRepository - Manages card data access
 *
 * In-memory implementation for MVP.
 * Later can be replaced with DatabaseCardRepository without changing business logic.
 *
 * Data Structures Used:
 * - HashMap (Map) for O(1) lookups by ID
 * - HashMap for indexing by boardId, columnId for fast queries
 * - Arrays maintain insertion order for position
 */
export class CardRepository implements IRepository<Card> {
  private cards: Map<string, Card> = new Map();
  private boardIndex: Map<string, Set<string>> = new Map(); // boardId -> Set<cardId>
  private columnIndex: Map<string, string[]> = new Map(); // columnId -> [cardIds] (ordered)
  private userIndex: Map<string, Set<string>> = new Map(); // assigneeId -> Set<cardId>
  private parentIndex: Map<string, string[]> = new Map(); // parentId -> [childCardIds]

  async findById(id: string): Promise<Card | null> {
    return this.cards.get(id) || null;
  }

  async findAll(): Promise<Card[]> {
    return Array.from(this.cards.values());
  }

  async create(card: Card): Promise<Card> {
    // Set position to end of column
    const columnCards = this.columnIndex.get(card.columnId) || [];
    card.position = columnCards.length;

    // Store card
    this.cards.set(card.id, card);

    // Update indices
    this.updateIndices(card);

    return card;
  }

  async update(id: string, updates: Partial<Card>): Promise<Card> {
    const card = this.cards.get(id);
    if (!card) {
      throw new Error(`Card ${id} not found`);
    }

    // Remove old index entries if changing indexed fields
    if (updates.columnId && updates.columnId !== card.columnId) {
      this.removeFromColumnIndex(card);
    }
    if (updates.assigneeId && updates.assigneeId !== card.assigneeId) {
      this.removeFromUserIndex(card);
    }

    // Apply updates
    const updatedCard = { ...card, ...updates, updatedAt: new Date() };
    this.cards.set(id, updatedCard);

    // Update indices with new values
    this.updateIndices(updatedCard);

    return updatedCard;
  }

  async delete(id: string): Promise<boolean> {
    const card = this.cards.get(id);
    if (!card) {
      return false;
    }

    // Remove from indices
    this.removeFromIndices(card);

    // Delete card
    this.cards.delete(id);

    return true;
  }

  /**
   * Move card to different column with new position
   */
  async move(cardId: string, toColumnId: string, position: number): Promise<Card> {
    const card = this.cards.get(cardId);
    if (!card) {
      throw new Error(`Card ${cardId} not found`);
    }

    const fromColumnId = card.columnId;

    // Remove from old column
    this.removeFromColumnIndex(card);

    // Update card
    card.columnId = toColumnId;
    card.position = position;
    card.updatedAt = new Date();

    // Add to new column at position
    let columnCards = this.columnIndex.get(toColumnId) || [];
    columnCards.splice(position, 0, cardId);
    this.columnIndex.set(toColumnId, columnCards);

    // Reorder positions in new column
    columnCards.forEach((id, index) => {
      const c = this.cards.get(id);
      if (c) {
        c.position = index;
      }
    });

    return card;
  }

  /**
   * Query cards by board
   */
  async findByBoard(boardId: string): Promise<Card[]> {
    const cardIds = this.boardIndex.get(boardId) || new Set();
    return Array.from(cardIds)
      .map((id) => this.cards.get(id))
      .filter((card): card is Card => card !== undefined);
  }

  /**
   * Query cards by column (returns ordered by position)
   */
  async findByColumn(columnId: string): Promise<Card[]> {
    const cardIds = this.columnIndex.get(columnId) || [];
    return cardIds
      .map((id) => this.cards.get(id))
      .filter((card): card is Card => card !== undefined)
      .sort((a, b) => a.position - b.position);
  }

  /**
   * Query cards assigned to user
   */
  async findByAssignee(assigneeId: string): Promise<Card[]> {
    const cardIds = this.userIndex.get(assigneeId) || new Set();
    return Array.from(cardIds)
      .map((id) => this.cards.get(id))
      .filter((card): card is Card => card !== undefined);
  }

  /**
   * Get child cards (for hierarchical cards)
   */
  async findChildren(parentId: string): Promise<Card[]> {
    const childIds = this.parentIndex.get(parentId) || [];
    return childIds
      .map((id) => this.cards.get(id))
      .filter((card): card is Card => card !== undefined);
  }

  /**
   * Get all descendants using DFS
   * Algorithm: Depth-First Search on card tree
   */
  async findAllDescendants(parentId: string): Promise<Card[]> {
    const descendants: Card[] = [];
    const stack = [parentId];

    while (stack.length > 0) {
      const currentId = stack.pop()!;
      const children = await this.findChildren(currentId);

      for (const child of children) {
        descendants.push(child);
        stack.push(child.id);
      }
    }

    return descendants;
  }

  /**
   * Update all indices for a card
   */
  private updateIndices(card: Card): void {
    // Board index
    if (!this.boardIndex.has(card.boardId)) {
      this.boardIndex.set(card.boardId, new Set());
    }
    this.boardIndex.get(card.boardId)!.add(card.id);

    // Column index
    if (!this.columnIndex.has(card.columnId)) {
      this.columnIndex.set(card.columnId, []);
    }
    const columnCards = this.columnIndex.get(card.columnId)!;
    if (!columnCards.includes(card.id)) {
      columnCards.push(card.id);
    }

    // User index
    if (card.assigneeId) {
      if (!this.userIndex.has(card.assigneeId)) {
        this.userIndex.set(card.assigneeId, new Set());
      }
      this.userIndex.get(card.assigneeId)!.add(card.id);
    }

    // Parent index
    if (card.parentId) {
      if (!this.parentIndex.has(card.parentId)) {
        this.parentIndex.set(card.parentId, []);
      }
      const siblings = this.parentIndex.get(card.parentId)!;
      if (!siblings.includes(card.id)) {
        siblings.push(card.id);
      }
    }
  }

  /**
   * Remove card from all indices
   */
  private removeFromIndices(card: Card): void {
    this.boardIndex.get(card.boardId)?.delete(card.id);
    this.removeFromColumnIndex(card);
    this.removeFromUserIndex(card);

    if (card.parentId) {
      const siblings = this.parentIndex.get(card.parentId);
      if (siblings) {
        const index = siblings.indexOf(card.id);
        if (index > -1) {
          siblings.splice(index, 1);
        }
      }
    }
  }

  private removeFromColumnIndex(card: Card): void {
    const columnCards = this.columnIndex.get(card.columnId);
    if (columnCards) {
      const index = columnCards.indexOf(card.id);
      if (index > -1) {
        columnCards.splice(index, 1);
        // Reorder remaining cards
        columnCards.forEach((id, idx) => {
          const c = this.cards.get(id);
          if (c) {
            c.position = idx;
          }
        });
      }
    }
  }

  private removeFromUserIndex(card: Card): void {
    if (card.assigneeId) {
      this.userIndex.get(card.assigneeId)?.delete(card.id);
    }
  }

  /**
   * Get repository statistics
   */
  getStats() {
    return {
      totalCards: this.cards.size,
      boards: this.boardIndex.size,
      columns: this.columnIndex.size,
      assignedCards: Array.from(this.userIndex.values()).reduce(
        (sum, set) => sum + set.size,
        0
      ),
    };
  }
}
