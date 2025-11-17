// Core domain types for WorkChain Freelancer Marketplace

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

// ==================== FREELANCER MARKETPLACE TYPES ====================

// User System
export enum UserRole {
  FREELANCER = 'freelancer',
  CLIENT = 'client',
  ADMIN = 'admin'
}

export type Availability = 'full-time' | 'part-time' | 'contract';

export interface UserProfile extends User {
  roles: UserRole[];
  skills: string[];
  hourlyRate?: number;
  portfolioUrl?: string;
  githubUsername?: string;
  linkedinUrl?: string;
  bio: string;
  timezone: string;
  availability: Availability;
  rating: number; // 0-5 stars
  totalEarned?: number; // For freelancers
  totalSpent?: number; // For clients
  completedProjects: number;
  successRate: number; // Percentage
  responseTime: number; // Hours average
  verified: boolean;
}

// Project System
export enum ProjectStatus {
  DRAFT = 'draft',
  OPEN = 'open',
  IN_REVIEW = 'in_review', // Reviewing proposals
  ASSIGNED = 'assigned',
  IN_PROGRESS = 'in_progress',
  IN_REVIEW_DELIVERY = 'in_review_delivery',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export enum ProjectType {
  FEATURE = 'feature',
  BUG_FIX = 'bug_fix',
  USER_STORY = 'user_story',
  EPIC = 'epic',
  TESTING = 'testing',
  DESIGN = 'design',
  DOCUMENTATION = 'documentation',
  CONSULTATION = 'consultation'
}

export interface Attachment {
  id: string;
  filename: string;
  url: string;
  mimeType: string;
  size: number;
  uploadedBy: string;
  uploadedAt: Date;
}

export interface Requirement {
  id: string;
  title: string;
  description: string;
  acceptanceCriteria: string[];
  priority: Priority;
  category: 'functional' | 'technical' | 'design' | 'other';
}

export interface Milestone {
  id: string;
  projectId: string;
  title: string;
  description: string;
  deliverables: string[];
  amount: number; // Payment for this milestone
  deadline: Date;
  status: 'pending' | 'in_progress' | 'submitted' | 'approved' | 'paid';
  submittedAt?: Date;
  approvedAt?: Date;
  deliveryFiles: Attachment[];
}

export interface Project {
  id: string;
  clientId: string;
  title: string;
  description: string;
  projectType: ProjectType;
  status: ProjectStatus;
  budget: {
    type: 'fixed' | 'hourly';
    amount: number;
    currency: string;
  };
  timeline: {
    estimatedHours?: number;
    deadline?: Date;
    milestones: Milestone[];
  };
  requirements: Requirement[];
  skills: string[];
  attachments: Attachment[];
  proposals: Proposal[];
  assignedFreelancerId?: string;
  boardId?: string; // Link to Kanban board
  createdAt: Date;
  updatedAt: Date;
}

// Proposal/Bidding System
export interface PortfolioItem {
  id: string;
  title: string;
  description: string;
  url?: string;
  thumbnailUrl?: string;
  tags: string[];
}

export interface ProposedMilestone {
  title: string;
  deliverables: string[];
  amount: number;
  estimatedDays: number;
}

export interface Proposal {
  id: string;
  projectId: string;
  freelancerId: string;
  coverLetter: string;
  proposedBudget: {
    type: 'fixed' | 'hourly';
    amount: number;
    currency: string;
  };
  estimatedTimeline: {
    hours: number;
    completionDate: Date;
  };
  milestones: ProposedMilestone[];
  portfolioSamples: PortfolioItem[];
  status: 'submitted' | 'under_review' | 'accepted' | 'rejected' | 'withdrawn';
  submittedAt: Date;
}

// Payment System
export enum PaymentStatus {
  PENDING = 'pending',
  ESCROWED = 'escrowed',
  RELEASED = 'released',
  REFUNDED = 'refunded',
  DISPUTED = 'disputed'
}

export type PaymentGateway = 'stripe' | 'paypal' | 'venmo' | 'wise' | 'crypto';

export interface Payment {
  id: string;
  projectId: string;
  milestoneId?: string;
  clientId: string;
  freelancerId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  gateway: PaymentGateway;
  gatewayTransactionId?: string;
  escrowedAt?: Date;
  releasedAt?: Date;
  fees: {
    platformFee: number; // e.g., 10%
    gatewayFee: number;
  };
  createdAt: Date;
}

// Integration System
export type IntegrationType = 'github' | 'jira' | 'slack' | 'teams' | 'figma' | 'drive' | 'loom';

export interface Integration {
  id: string;
  userId: string;
  platform: IntegrationType;
  credentials: {
    accessToken: string;
    refreshToken?: string;
    expiresAt?: Date;
  };
  config: Record<string, any>; // Platform-specific settings
  linkedProjects: string[]; // Project IDs using this integration
  active: boolean;
  createdAt: Date;
}

// Review/Rating System
export interface Review {
  id: string;
  projectId: string;
  reviewerId: string; // Who left the review
  revieweeId: string; // Who is being reviewed
  rating: number; // 1-5 stars
  feedback: {
    communication: number;
    quality: number;
    timeliness: number;
    professionalism: number;
  };
  comment: string;
  response?: string; // Reviewee can respond
  createdAt: Date;
  blockchainHash: string; // Immutable review record
}

// Message/Chat System
export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  recipientId: string;
  content: string;
  attachments: Attachment[];
  read: boolean;
  createdAt: Date;
}

export interface Conversation {
  id: string;
  projectId?: string;
  participants: string[]; // User IDs
  lastMessage?: Message;
  unreadCount: Record<string, number>; // userId -> unread count
  createdAt: Date;
  updatedAt: Date;
}

// Event/Command types for our faux-blockchain
export enum ActionType {
  // Board Actions
  CREATE_BOARD = 'CREATE_BOARD',
  UPDATE_BOARD = 'UPDATE_BOARD',
  DELETE_BOARD = 'DELETE_BOARD',

  // Card Actions
  CREATE_CARD = 'CREATE_CARD',
  UPDATE_CARD = 'UPDATE_CARD',
  MOVE_CARD = 'MOVE_CARD',
  DELETE_CARD = 'DELETE_CARD',
  ASSIGN_CARD = 'ASSIGN_CARD',
  UPDATE_PRIORITY = 'UPDATE_PRIORITY',

  // Comment Actions
  ADD_COMMENT = 'ADD_COMMENT',
  UPDATE_COMMENT = 'UPDATE_COMMENT',
  DELETE_COMMENT = 'DELETE_COMMENT',

  // Project Actions
  CREATE_PROJECT = 'CREATE_PROJECT',
  UPDATE_PROJECT = 'UPDATE_PROJECT',
  PUBLISH_PROJECT = 'PUBLISH_PROJECT',
  CANCEL_PROJECT = 'CANCEL_PROJECT',
  COMPLETE_PROJECT = 'COMPLETE_PROJECT',

  // Proposal Actions
  SUBMIT_PROPOSAL = 'SUBMIT_PROPOSAL',
  ACCEPT_PROPOSAL = 'ACCEPT_PROPOSAL',
  REJECT_PROPOSAL = 'REJECT_PROPOSAL',
  WITHDRAW_PROPOSAL = 'WITHDRAW_PROPOSAL',

  // Milestone Actions
  CREATE_MILESTONE = 'CREATE_MILESTONE',
  SUBMIT_MILESTONE = 'SUBMIT_MILESTONE',
  APPROVE_MILESTONE = 'APPROVE_MILESTONE',
  REJECT_MILESTONE = 'REJECT_MILESTONE',

  // Payment Actions
  CREATE_PAYMENT = 'CREATE_PAYMENT',
  ESCROW_PAYMENT = 'ESCROW_PAYMENT',
  RELEASE_PAYMENT = 'RELEASE_PAYMENT',
  REFUND_PAYMENT = 'REFUND_PAYMENT',
  DISPUTE_PAYMENT = 'DISPUTE_PAYMENT',

  // Review Actions
  CREATE_REVIEW = 'CREATE_REVIEW',
  RESPOND_TO_REVIEW = 'RESPOND_TO_REVIEW',

  // User Actions
  CREATE_USER = 'CREATE_USER',
  UPDATE_USER_PROFILE = 'UPDATE_USER_PROFILE',
  VERIFY_USER = 'VERIFY_USER',

  // Integration Actions
  ADD_INTEGRATION = 'ADD_INTEGRATION',
  REMOVE_INTEGRATION = 'REMOVE_INTEGRATION',
  SYNC_INTEGRATION = 'SYNC_INTEGRATION',
}

export interface CommandData {
  [key: string]: any;
}

export interface Block {
  blockNumber: number;
  timestamp: Date;
  action: ActionType;
  entityType: 'Board' | 'Card' | 'Comment' | 'User' | 'Project' | 'Proposal' | 'Milestone' | 'Payment' | 'Review' | 'Integration';
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
