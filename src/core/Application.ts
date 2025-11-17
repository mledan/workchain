import { Chain } from '../blockchain/Chain';
import { CardRepository } from '../repositories/CardRepository';
import { BoardRepository } from '../repositories/BoardRepository';
import { UserProfileRepository } from '../repositories/UserProfileRepository';
import { ProjectRepository } from '../repositories/ProjectRepository';
import { ProposalRepository } from '../repositories/ProposalRepository';
import { PaymentRepository } from '../repositories/PaymentRepository';
import { ReviewRepository } from '../repositories/ReviewRepository';
import { ContributionRepository } from '../repositories/ContributionRepository';
import { CreditTransactionRepository } from '../repositories/CreditTransactionRepository';
import { TaxInformationRepository } from '../repositories/TaxInformationRepository';
import { TaxDocumentRepository } from '../repositories/TaxDocumentRepository';
import { ComplianceRepository } from '../repositories/ComplianceRepository';
import { AgreementRepository } from '../repositories/AgreementRepository';
import { NotificationRepository } from '../repositories/NotificationRepository';
import { EventEmitter, ConsoleLoggerObserver, AuditLogObserver } from '../observers/EventObserver';
import { CreateCardCommand, MoveCardCommand, UpdateCardCommand, AssignCardCommand } from '../commands/CardCommands';
import { BoardFactory, TemplateName } from '../factories/BoardFactory';
import { CreditService } from '../services/CreditService';
import { TaxService } from '../services/TaxService';
import { ComplianceService } from '../services/ComplianceService';
import { CollaborationService } from '../services/CollaborationService';
import { PaymentService } from '../services/PaymentService';
import { NotificationService } from '../services/NotificationService';
import { IntegrationService } from '../services/IntegrationService';
import { Board, Card, Priority } from '../types';

/**
 * Application - Main application class that ties all patterns together
 *
 * This is the Facade pattern - provides a simple interface to the complex subsystem
 *
 * Design Patterns Used:
 * - Singleton: One application instance
 * - Facade: Simplified interface to complex subsystems
 * - Dependency Injection: Inject repositories, chain, etc.
 */
export class Application {
  private static instance: Application;

  // Core components
  private chain: Chain;
  private eventEmitter: EventEmitter;

  // Kanban Repositories
  private cardRepository: CardRepository;
  private boardRepository: BoardRepository;

  // Marketplace Repositories
  private userProfileRepository: UserProfileRepository;
  private projectRepository: ProjectRepository;
  private proposalRepository: ProposalRepository;
  private paymentRepository: PaymentRepository;
  private reviewRepository: ReviewRepository;

  // Collaboration Repositories
  private contributionRepository: ContributionRepository;
  private creditTransactionRepository: CreditTransactionRepository;

  // Compliance Repositories
  private taxInformationRepository: TaxInformationRepository;
  private taxDocumentRepository: TaxDocumentRepository;
  private complianceRepository: ComplianceRepository;
  private agreementRepository: AgreementRepository;

  // Communication Repositories
  private notificationRepository: NotificationRepository;

  // Services
  private creditService: CreditService;
  private taxService: TaxService;
  private complianceService: ComplianceService;
  private collaborationService: CollaborationService;
  private paymentService: PaymentService;
  private notificationService: NotificationService;
  private integrationService: IntegrationService;

  // Observers
  private consoleLogger: ConsoleLoggerObserver;
  private auditLogger: AuditLogObserver;

  private constructor() {
    // Initialize core components
    this.chain = new Chain();
    this.eventEmitter = new EventEmitter();

    // Initialize Kanban repositories
    this.cardRepository = new CardRepository();
    this.boardRepository = new BoardRepository();

    // Initialize Marketplace repositories
    this.userProfileRepository = new UserProfileRepository();
    this.projectRepository = new ProjectRepository();
    this.proposalRepository = new ProposalRepository();
    this.paymentRepository = new PaymentRepository();
    this.reviewRepository = new ReviewRepository();

    // Initialize Collaboration repositories
    this.contributionRepository = new ContributionRepository();
    this.creditTransactionRepository = new CreditTransactionRepository();

    // Initialize Compliance repositories
    this.taxInformationRepository = new TaxInformationRepository();
    this.taxDocumentRepository = new TaxDocumentRepository();
    this.complianceRepository = new ComplianceRepository();
    this.agreementRepository = new AgreementRepository();

    // Initialize Communication repositories
    this.notificationRepository = new NotificationRepository();

    // Initialize Services
    this.creditService = new CreditService(
      this.contributionRepository,
      this.creditTransactionRepository,
      this.chain
    );

    this.taxService = new TaxService(
      this.taxInformationRepository,
      this.taxDocumentRepository,
      this.paymentRepository,
      this.chain
    );

    this.complianceService = new ComplianceService(
      this.complianceRepository,
      this.agreementRepository,
      this.taxInformationRepository,
      this.chain
    );

    this.paymentService = new PaymentService(
      this.paymentRepository,
      this.chain
    );

    this.collaborationService = new CollaborationService(
      this.projectRepository,
      this.contributionRepository,
      this.creditService,
      this.paymentService,
      this.chain
    );

    this.notificationService = new NotificationService(
      this.notificationRepository,
      this.chain
    );

    this.integrationService = new IntegrationService(
      this.userProfileRepository,
      this.projectRepository,
      this.chain
    );

    // Initialize observers
    this.consoleLogger = new ConsoleLoggerObserver();
    this.auditLogger = new AuditLogObserver();

    // Attach observers to event emitter
    this.eventEmitter.attach(this.consoleLogger);
    this.eventEmitter.attach(this.auditLogger);
  }

  /**
   * Get singleton instance
   */
  static getInstance(): Application {
    if (!Application.instance) {
      Application.instance = new Application();
    }
    return Application.instance;
  }

  // ==================== Board Operations ====================

  /**
   * Create a new board from template
   */
  async createBoard(
    templateName: TemplateName,
    ownerId: string,
    customName?: string
  ): Promise<Board> {
    const board = BoardFactory.createFromTemplate(templateName, ownerId, customName);
    await this.boardRepository.create(board);

    // Log to blockchain
    this.chain.addBlock(
      'CREATE_BOARD' as any,
      'Board',
      board.id,
      { name: board.name, ownerId: board.ownerId },
      ownerId
    );

    // Emit event
    this.eventEmitter.emit('board:created', board, ownerId, board.id);

    return board;
  }

  /**
   * Get a board by ID
   */
  async getBoard(boardId: string): Promise<Board | null> {
    return this.boardRepository.findById(boardId);
  }

  /**
   * Get all boards for a user
   */
  async getUserBoards(userId: string): Promise<Board[]> {
    return this.boardRepository.findByOwner(userId);
  }

  // ==================== Card Operations ====================

  /**
   * Create a new card
   */
  async createCard(
    boardId: string,
    columnId: string,
    title: string,
    description: string,
    priority: Priority,
    actorId: string,
    parentId?: string
  ): Promise<Card> {
    const command = new CreateCardCommand(this.chain, this.cardRepository, {
      boardId,
      columnId,
      title,
      description,
      priority,
      actorId,
      parentId,
    });

    await command.execute();

    const card = await this.cardRepository.findById(command.getCardId());
    if (!card) {
      throw new Error('Failed to create card');
    }

    // Emit event
    this.eventEmitter.emit('card:created', card, actorId, boardId);

    return card;
  }

  /**
   * Move a card to a different column
   */
  async moveCard(
    cardId: string,
    fromColumnId: string,
    toColumnId: string,
    position: number,
    actorId: string
  ): Promise<Card> {
    const command = new MoveCardCommand(this.chain, this.cardRepository, {
      cardId,
      fromColumnId,
      toColumnId,
      position,
      actorId,
    });

    await command.execute();

    const card = await this.cardRepository.findById(cardId);
    if (!card) {
      throw new Error('Card not found after move');
    }

    // Emit event
    this.eventEmitter.emit('card:moved', {
      card,
      fromColumnId,
      toColumnId,
    }, actorId, card.boardId);

    return card;
  }

  /**
   * Update a card
   */
  async updateCard(
    cardId: string,
    updates: Partial<Card>,
    actorId: string
  ): Promise<Card> {
    const command = new UpdateCardCommand(this.chain, this.cardRepository, {
      cardId,
      updates,
      actorId,
    });

    await command.execute();

    const card = await this.cardRepository.findById(cardId);
    if (!card) {
      throw new Error('Card not found after update');
    }

    // Emit event
    this.eventEmitter.emit('card:updated', card, actorId, card.boardId);

    return card;
  }

  /**
   * Assign a card to a user
   */
  async assignCard(
    cardId: string,
    assigneeId: string,
    actorId: string
  ): Promise<Card> {
    const command = new AssignCardCommand(this.chain, this.cardRepository, {
      cardId,
      assigneeId,
      actorId,
    });

    await command.execute();

    const card = await this.cardRepository.findById(cardId);
    if (!card) {
      throw new Error('Card not found after assignment');
    }

    // Emit event
    this.eventEmitter.emit('card:assigned', {
      card,
      assigneeId,
    }, actorId, card.boardId);

    return card;
  }

  /**
   * Get a card by ID
   */
  async getCard(cardId: string): Promise<Card | null> {
    return this.cardRepository.findById(cardId);
  }

  /**
   * Get all cards for a board
   */
  async getBoardCards(boardId: string): Promise<Card[]> {
    return this.cardRepository.findByBoard(boardId);
  }

  /**
   * Get cards in a column (ordered by position)
   */
  async getColumnCards(columnId: string): Promise<Card[]> {
    return this.cardRepository.findByColumn(columnId);
  }

  /**
   * Get cards assigned to a user
   */
  async getUserCards(userId: string): Promise<Card[]> {
    return this.cardRepository.findByAssignee(userId);
  }

  /**
   * Get child cards (for hierarchical cards)
   */
  async getChildCards(parentId: string): Promise<Card[]> {
    return this.cardRepository.findChildren(parentId);
  }

  // ==================== Blockchain Operations ====================

  /**
   * Get history for a card
   */
  getCardHistory(cardId: string) {
    return this.chain.getHistory(cardId);
  }

  /**
   * Get history for a board
   */
  getBoardHistory(boardId: string) {
    return this.chain.getHistory(boardId);
  }

  /**
   * Validate the entire blockchain
   */
  validateChain() {
    return this.chain.validateChain();
  }

  /**
   * Get blockchain statistics
   */
  getChainStats() {
    return this.chain.getStats();
  }

  /**
   * Replay events to reconstruct state at a point in time
   */
  replayToTimestamp(timestamp: Date) {
    return this.chain.replayEvents(undefined, timestamp);
  }

  // ==================== Observer Operations ====================

  /**
   * Get event emitter for external observers
   */
  getEventEmitter(): EventEmitter {
    return this.eventEmitter;
  }

  /**
   * Get audit logs
   */
  getAuditLogs() {
    return this.auditLogger.getLogs();
  }

  // ==================== Service Accessors ====================

  /**
   * Get Credit Service (for managing collaboration credits and reputation)
   */
  getCreditService(): CreditService {
    return this.creditService;
  }

  /**
   * Get Tax Service (for tax handling, 1099 generation, W-9 collection)
   */
  getTaxService(): TaxService {
    return this.taxService;
  }

  /**
   * Get Compliance Service (for contractor agreements and compliance)
   */
  getComplianceService(): ComplianceService {
    return this.complianceService;
  }

  /**
   * Get Collaboration Service (for team-based projects with profit sharing)
   */
  getCollaborationService(): CollaborationService {
    return this.collaborationService;
  }

  /**
   * Get Payment Service (for multi-gateway payment processing)
   */
  getPaymentService(): PaymentService {
    return this.paymentService;
  }

  /**
   * Get Notification Service (for user notifications)
   */
  getNotificationService(): NotificationService {
    return this.notificationService;
  }

  /**
   * Get Integration Service (for GitHub, Jira, Slack, etc.)
   */
  getIntegrationService(): IntegrationService {
    return this.integrationService;
  }

  // ==================== Repository Accessors ====================

  /**
   * Get User Profile Repository
   */
  getUserProfileRepository(): UserProfileRepository {
    return this.userProfileRepository;
  }

  /**
   * Get Project Repository
   */
  getProjectRepository(): ProjectRepository {
    return this.projectRepository;
  }

  /**
   * Get Proposal Repository
   */
  getProposalRepository(): ProposalRepository {
    return this.proposalRepository;
  }

  /**
   * Get Payment Repository
   */
  getPaymentRepository(): PaymentRepository {
    return this.paymentRepository;
  }

  /**
   * Get Review Repository
   */
  getReviewRepository(): ReviewRepository {
    return this.reviewRepository;
  }

  /**
   * Get Contribution Repository
   */
  getContributionRepository(): ContributionRepository {
    return this.contributionRepository;
  }

  /**
   * Get Credit Transaction Repository
   */
  getCreditTransactionRepository(): CreditTransactionRepository {
    return this.creditTransactionRepository;
  }

  /**
   * Get Tax Information Repository
   */
  getTaxInformationRepository(): TaxInformationRepository {
    return this.taxInformationRepository;
  }

  /**
   * Get Agreement Repository
   */
  getAgreementRepository(): AgreementRepository {
    return this.agreementRepository;
  }

  /**
   * Get Compliance Repository
   */
  getComplianceRepository(): ComplianceRepository {
    return this.complianceRepository;
  }

  /**
   * Get Notification Repository
   */
  getNotificationRepository(): NotificationRepository {
    return this.notificationRepository;
  }

  // ==================== Statistics ====================

  /**
   * Get application statistics
   */
  async getStats() {
    const creditStats = await this.creditService.getPlatformStats();
    const taxStats = await this.taxService.getPlatformTaxStats(new Date().getFullYear());
    const complianceStats = await this.complianceService.getPlatformComplianceStats();

    return {
      blockchain: this.chain.getStats(),
      cards: this.cardRepository.getStats(),
      boards: this.boardRepository.getStats(),
      events: this.eventEmitter.getStats(),
      credits: creditStats,
      tax: taxStats,
      compliance: complianceStats,
      users: {
        total: this.userProfileRepository.getStats().total,
        freelancers: this.userProfileRepository.findByRole('freelancer').then(u => u.length),
        clients: this.userProfileRepository.findByRole('client').then(u => u.length)
      }
    };
  }

  // ==================== Testing/Development ====================

  /**
   * Reset all data (for testing)
   */
  reset() {
    this.chain = new Chain();
    this.cardRepository = new CardRepository();
    this.boardRepository = new BoardRepository();
  }
}
