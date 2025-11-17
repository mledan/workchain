import { IRepository } from './IRepository';
import { Board, Column } from '../types';
import { nanoid } from 'nanoid';

/**
 * BoardRepository - Manages board data access
 *
 * In-memory implementation for MVP
 */
export class BoardRepository implements IRepository<Board> {
  private boards: Map<string, Board> = new Map();
  private userIndex: Map<string, Set<string>> = new Map(); // ownerId -> Set<boardId>

  async findById(id: string): Promise<Board | null> {
    return this.boards.get(id) || null;
  }

  async findAll(): Promise<Board[]> {
    return Array.from(this.boards.values());
  }

  async create(board: Board): Promise<Board> {
    this.boards.set(board.id, board);

    // Update user index
    if (!this.userIndex.has(board.ownerId)) {
      this.userIndex.set(board.ownerId, new Set());
    }
    this.userIndex.get(board.ownerId)!.add(board.id);

    return board;
  }

  async update(id: string, updates: Partial<Board>): Promise<Board> {
    const board = this.boards.get(id);
    if (!board) {
      throw new Error(`Board ${id} not found`);
    }

    const updatedBoard = { ...board, ...updates, updatedAt: new Date() };
    this.boards.set(id, updatedBoard);

    return updatedBoard;
  }

  async delete(id: string): Promise<boolean> {
    const board = this.boards.get(id);
    if (!board) {
      return false;
    }

    // Remove from user index
    this.userIndex.get(board.ownerId)?.delete(id);

    this.boards.delete(id);
    return true;
  }

  /**
   * Find all boards owned by a user
   */
  async findByOwner(ownerId: string): Promise<Board[]> {
    const boardIds = this.userIndex.get(ownerId) || new Set();
    return Array.from(boardIds)
      .map((id) => this.boards.get(id))
      .filter((board): board is Board => board !== undefined);
  }

  /**
   * Add a column to a board
   */
  async addColumn(boardId: string, column: Column): Promise<Board> {
    const board = this.boards.get(boardId);
    if (!board) {
      throw new Error(`Board ${boardId} not found`);
    }

    board.columns.push(column);
    board.updatedAt = new Date();

    return board;
  }

  /**
   * Remove a column from a board
   */
  async removeColumn(boardId: string, columnId: string): Promise<Board> {
    const board = this.boards.get(boardId);
    if (!board) {
      throw new Error(`Board ${boardId} not found`);
    }

    board.columns = board.columns.filter((col) => col.id !== columnId);
    board.updatedAt = new Date();

    return board;
  }

  /**
   * Reorder columns
   */
  async reorderColumns(boardId: string, columnIds: string[]): Promise<Board> {
    const board = this.boards.get(boardId);
    if (!board) {
      throw new Error(`Board ${boardId} not found`);
    }

    // Create a map for quick lookup
    const columnMap = new Map(board.columns.map((col) => [col.id, col]));

    // Reorder columns based on provided IDs
    board.columns = columnIds
      .map((id) => columnMap.get(id))
      .filter((col): col is Column => col !== undefined);

    // Update positions
    board.columns.forEach((col, index) => {
      col.position = index;
    });

    board.updatedAt = new Date();

    return board;
  }

  getStats() {
    return {
      totalBoards: this.boards.size,
      totalOwners: this.userIndex.size,
    };
  }
}
