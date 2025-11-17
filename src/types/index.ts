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

  // Contribution Actions
  CREATE_CONTRIBUTION = 'CREATE_CONTRIBUTION',
  VERIFY_CONTRIBUTION = 'VERIFY_CONTRIBUTION',
  DISPUTE_CONTRIBUTION = 'DISPUTE_CONTRIBUTION',

  // Credit Actions
  EARN_CREDITS = 'EARN_CREDITS',
  SPEND_CREDITS = 'SPEND_CREDITS',
  TRANSFER_CREDITS = 'TRANSFER_CREDITS',
  CONVERT_CREDITS_TO_PAYMENT = 'CONVERT_CREDITS_TO_PAYMENT',

  // Team Collaboration Actions
  INVITE_TEAM_MEMBER = 'INVITE_TEAM_MEMBER',
  ACCEPT_TEAM_INVITATION = 'ACCEPT_TEAM_INVITATION',
  REMOVE_TEAM_MEMBER = 'REMOVE_TEAM_MEMBER',
  UPDATE_PROFIT_SHARE = 'UPDATE_PROFIT_SHARE',

  // Tax Actions
  SUBMIT_TAX_INFO = 'SUBMIT_TAX_INFO',
  VERIFY_TAX_INFO = 'VERIFY_TAX_INFO',
  GENERATE_TAX_DOCUMENT = 'GENERATE_TAX_DOCUMENT',

  // Agreement Actions
  CREATE_AGREEMENT = 'CREATE_AGREEMENT',
  SIGN_AGREEMENT = 'SIGN_AGREEMENT',
  TERMINATE_AGREEMENT = 'TERMINATE_AGREEMENT',

  // Notification Actions
  SEND_NOTIFICATION = 'SEND_NOTIFICATION',
  READ_NOTIFICATION = 'READ_NOTIFICATION',
}

export interface CommandData {
  [key: string]: any;
}

export interface Block {
  blockNumber: number;
  timestamp: Date;
  action: ActionType;
  entityType: 'Board' | 'Card' | 'Comment' | 'User' | 'Project' | 'Proposal' | 'Milestone' | 'Payment' | 'Review' | 'Integration' | 'Contribution' | 'CreditTransaction' | 'TeamMember' | 'TaxInfo' | 'Agreement' | 'Notification';
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

// ==================== COLLABORATION CREDIT SYSTEM ====================

export enum ContributionType {
  CODE = 'code',                    // Code commits, PRs
  CODE_REVIEW = 'code_review',      // Reviewing others' code
  DESIGN = 'design',                // UI/UX design work
  DOCUMENTATION = 'documentation',  // Writing docs
  TESTING = 'testing',              // QA, test writing
  MENTORING = 'mentoring',          // Helping team members
  PROJECT_MANAGEMENT = 'project_management', // PM work
  BUG_FIX = 'bug_fix',             // Quick fixes
  ARCHITECTURE = 'architecture',    // System design
  DEVOPS = 'devops'                // CI/CD, infrastructure
}

export interface ContributionMetrics {
  linesOfCode?: number;
  filesChanged?: number;
  commitsCount?: number;
  reviewsCompleted?: number;
  bugsFixed?: number;
  testsWritten?: number;
  hoursSpent?: number;
  impactScore: number; // 1-10, based on significance
}

export interface Contribution {
  id: string;
  projectId: string;
  contributorId: string;
  type: ContributionType;
  description: string;
  metrics: ContributionMetrics;
  creditsEarned: number;
  reputationImpact: number;
  verifiedBy?: string; // Optional peer verification
  integrationData?: {
    platform: IntegrationType;
    externalId: string; // e.g., GitHub PR number
    url: string;
  };
  status: 'pending' | 'verified' | 'disputed';
  createdAt: Date;
  verifiedAt?: Date;
  blockchainHash: string; // Immutable contribution record
}

export enum CreditTransactionType {
  EARNED_CONTRIBUTION = 'earned_contribution',
  EARNED_MILESTONE = 'earned_milestone',
  EARNED_BONUS = 'earned_bonus',
  SPENT_PURCHASE = 'spent_purchase',
  CONVERTED_TO_PAYMENT = 'converted_to_payment',
  TRANSFERRED = 'transferred',
  PLATFORM_FEE = 'platform_fee'
}

export interface CreditTransaction {
  id: string;
  userId: string;
  amount: number; // Positive for earning, negative for spending
  type: CreditTransactionType;
  balance: number; // Balance after transaction
  referenceId: string; // ID of contribution, project, etc.
  referenceType: 'contribution' | 'milestone' | 'project' | 'payment';
  description: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  blockchainHash: string;
}

export interface CreditBalance {
  userId: string;
  totalEarned: number;
  totalSpent: number;
  currentBalance: number;
  lockedCredits: number; // Credits in pending transactions
  lifetimeContributions: number;
  lastUpdated: Date;
}

// ==================== TEAM COLLABORATION ====================

export enum CollaborationRole {
  LEAD = 'lead',                    // Project lead, main contractor
  CONTRIBUTOR = 'contributor',      // Regular contributor
  REVIEWER = 'reviewer',            // Code reviewer
  CONSULTANT = 'consultant',        // Advises on specific issues
  MENTOR = 'mentor',                // Mentors team members
  QA = 'qa'                         // Quality assurance
}

export interface TeamMember {
  userId: string;
  role: CollaborationRole;
  profitSharePercentage: number; // % of project payment
  hourlyRate?: number;
  joinedAt: Date;
  contributions: string[]; // Contribution IDs
  status: 'active' | 'inactive' | 'removed';
  invitedBy: string;
}

export interface CollaborativeProject extends Omit<Project, 'assignedFreelancerId'> {
  teamMembers: TeamMember[];
  profitDistribution: {
    type: 'equal' | 'role-based' | 'contribution-based' | 'custom';
    distribution: Record<string, number>; // userId -> percentage
  };
  collaborationSettings: {
    requireCodeReview: boolean;
    minimumReviewers: number;
    autoApproveContributions: boolean;
    creditMultiplier: number; // Bonus multiplier for this project
  };
}

// ==================== TAX HANDLING SYSTEM ====================

export enum TaxFormType {
  W9 = 'w9',           // US contractors
  W8_BEN = 'w8_ben',   // Non-US individuals
  W8_BEN_E = 'w8_ben_e' // Non-US entities
}

export interface TaxInformation {
  id: string;
  userId: string;
  formType: TaxFormType;
  businessName?: string;
  taxIdType: 'ssn' | 'ein' | 'itin' | 'foreign';
  taxId: string; // Encrypted
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  isUsCitizen: boolean;
  taxTreaty?: {
    country: string;
    articleNumber: string;
    withholdingRate: number;
  };
  signedAt: Date;
  formDocumentUrl: string; // Securely stored signed form
  verified: boolean;
  verifiedAt?: Date;
}

export interface TaxDocument {
  id: string;
  userId: string;
  year: number;
  type: '1099-NEC' | '1099-K' | 'summary';
  totalEarnings: number;
  platformFees: number;
  netEarnings: number;
  documentUrl: string; // PDF of tax form
  filedWithIRS: boolean;
  filedAt?: Date;
  generatedAt: Date;
}

export interface TaxLiability {
  userId: string;
  year: number;
  quarter: number;
  totalIncome: number;
  estimatedTaxOwed: number;
  withholdingRate: number;
  taxReserve: number; // Amount set aside for taxes
  lastCalculated: Date;
}

// ==================== CONTRACTOR COMPLIANCE ====================

export enum AgreementType {
  INDEPENDENT_CONTRACTOR = 'independent_contractor',
  NDA = 'nda',
  IP_ASSIGNMENT = 'ip_assignment',
  GENERAL_TERMS = 'general_terms'
}

export interface ContractorAgreement {
  id: string;
  projectId: string;
  clientId: string;
  contractorId: string;
  type: AgreementType;
  terms: {
    scope: string;
    deliverables: string[];
    paymentTerms: string;
    timeline: {
      startDate: Date;
      endDate: Date;
    };
    terminationClauses: string[];
    confidentialityPeriod?: number; // Months
    ipOwnership: 'client' | 'contractor' | 'shared';
  };
  status: 'draft' | 'pending_signature' | 'signed' | 'active' | 'completed' | 'terminated';
  documentUrl: string;
  signatures: {
    clientSignedAt?: Date;
    contractorSignedAt?: Date;
    clientIpAddress?: string;
    contractorIpAddress?: string;
  };
  createdAt: Date;
  effectiveDate?: Date;
  blockchainHash: string; // Immutable contract record
}

export interface ComplianceRecord {
  id: string;
  userId: string;
  checks: {
    taxInfoComplete: boolean;
    agreementSigned: boolean;
    identityVerified: boolean;
    paymentMethodVerified: boolean;
    backgroundCheckComplete?: boolean;
  };
  status: 'incomplete' | 'pending_review' | 'approved' | 'rejected';
  notes?: string;
  reviewedBy?: string;
  reviewedAt?: Date;
  lastUpdated: Date;
}

// ==================== ENHANCED PROJECT TYPES ====================

export enum VibeProjectType {
  VIBE_CODE_FIX = 'vibe_code_fix',     // Quick collaborative fixes
  PRODUCT_BUILDOUT = 'product_buildout', // Full product development
  MVP_SPRINT = 'mvp_sprint',            // Rapid MVP creation
  FEATURE_COLLABORATION = 'feature_collaboration', // Team feature work
  CODE_REVIEW_SESSION = 'code_review_session',   // Dedicated review
  ARCHITECTURE_DESIGN = 'architecture_design'    // System design work
}

export interface VibeCodeFix extends Project {
  vibeType: VibeProjectType.VIBE_CODE_FIX;
  urgency: 'critical' | 'high' | 'normal';
  codebase: {
    repoUrl: string;
    branch: string;
    filesPaths: string[];
    issueDescription: string;
  };
  expectedFixTime: number; // Hours
  bonusForSpeed: number; // Extra payment if completed early
}

export interface ProductBuildout extends Project {
  vibeType: VibeProjectType.PRODUCT_BUILDOUT;
  phases: {
    id: string;
    name: string;
    description: string;
    deliverables: string[];
    teamSize: number;
    duration: number; // Weeks
    budget: number;
    status: 'pending' | 'in_progress' | 'completed';
  }[];
  techStack: string[];
  designAssets?: string[];
  targetLaunchDate: Date;
}

// ==================== NOTIFICATION SYSTEM ====================

export enum NotificationType {
  CONTRIBUTION_VERIFIED = 'contribution_verified',
  CREDITS_EARNED = 'credits_earned',
  PAYMENT_RECEIVED = 'payment_received',
  TAX_FORM_REQUIRED = 'tax_form_required',
  AGREEMENT_PENDING = 'agreement_pending',
  TEAM_INVITATION = 'team_invitation',
  MILESTONE_APPROVED = 'milestone_approved',
  REVIEW_RECEIVED = 'review_received',
  PROJECT_INVITATION = 'project_invitation',
  CODE_REVIEW_REQUEST = 'code_review_request'
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  referenceId?: string; // ID of related entity
  referenceType?: string;
  actionUrl?: string;
  read: boolean;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  createdAt: Date;
  readAt?: Date;
}

// ==================== ENHANCED USER TYPES ====================

export interface ExtendedUserProfile extends UserProfile {
  // Credit system
  creditBalance: CreditBalance;

  // Reputation breakdown
  reputationBreakdown: {
    codeQuality: number;
    collaboration: number;
    reliability: number;
    communication: number;
    leadership: number;
  };

  // Compliance
  complianceStatus: ComplianceRecord;
  taxInfo?: TaxInformation;

  // Contractor specific
  contractorProfile?: {
    specializations: ContributionType[];
    preferredProjectTypes: (ProjectType | VibeProjectType)[];
    teamExperience: boolean;
    leadExperience: boolean;
    portfolioHighlights: PortfolioItem[];
    certifications: string[];
    languages: string[];
  };

  // Client specific
  clientProfile?: {
    companyName?: string;
    industry?: string;
    projectsPosted: number;
    averageBudget: number;
    paymentReliability: number; // 0-100
    preferredPaymentMethod: PaymentGateway;
  };
}
