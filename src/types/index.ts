// Core domain types for StickyChain

export type Priority = 'high' | 'medium' | 'low';
export type CardStatus = 'backlog' | 'in_progress' | 'review' | 'done';

export interface Card {
  id: string;
  boardId: string;
  columnId: string;
  title: string;
  description: string;
  priority: Priority;
  assigneeId?: string;
  parentId?: string; // For hierarchical cards (Epic -> Story -> Task)
  position: number; // Order within column
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface Board {
  id: string;
  name: string;
  description: string;
  columns: Column[];
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Column {
  id: string;
  boardId: string;
  name: string;
  position: number;
  cardIds: string[]; // Ordered list of card IDs
}

export interface User {
  id: string;
  username: string;
  email: string;
  displayName: string;
  avatar?: string;
  reputation: number;
  createdAt: Date;
}

export interface Comment {
  id: string;
  cardId: string;
  userId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

// Event/Command types for our faux-blockchain
export enum ActionType {
  CREATE_BOARD = 'CREATE_BOARD',
  CREATE_CARD = 'CREATE_CARD',
  UPDATE_CARD = 'UPDATE_CARD',
  MOVE_CARD = 'MOVE_CARD',
  DELETE_CARD = 'DELETE_CARD',
  ADD_COMMENT = 'ADD_COMMENT',
  ASSIGN_CARD = 'ASSIGN_CARD',
  UPDATE_PRIORITY = 'UPDATE_PRIORITY',
}

export interface CommandData {
  [key: string]: any;
}

export interface Block {
  blockNumber: number;
  timestamp: Date;
  action: ActionType;
  entityType: 'Board' | 'Card' | 'Comment' | 'User';
  entityId: string;
  data: CommandData;
  actorId: string; // User who performed the action
  previousHash: string;
  hash: string;
}

export interface ChainValidationResult {
  valid: boolean;
  brokenAtBlock?: number;
  error?: string;
}

export interface BoardState {
  board: Board;
  cards: Map<string, Card>;
  comments: Map<string, Comment[]>; // cardId -> comments
}
