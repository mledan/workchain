import { Chain } from '../blockchain/Chain';
import { CardRepository } from '../repositories/CardRepository';
import { BoardRepository } from '../repositories/BoardRepository';
import { EventEmitter, ConsoleLoggerObserver, AuditLogObserver } from '../observers/EventObserver';
import { CreateCardCommand, MoveCardCommand, UpdateCardCommand, AssignCardCommand } from '../commands/CardCommands';
import { BoardFactory, TemplateName } from '../factories/BoardFactory';
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
  private cardRepository: CardRepository;
  private boardRepository: BoardRepository;
  private eventEmitter: EventEmitter;

  // Observers
  private consoleLogger: ConsoleLoggerObserver;
  private auditLogger: AuditLogObserver;

  private constructor() {
    // Initialize core components
    this.chain = new Chain();
    this.cardRepository = new CardRepository();
    this.boardRepository = new BoardRepository();
    this.eventEmitter = new EventEmitter();

    // Initialize observers
    this.consoleLogger = new ConsoleLoggerObserver();
    this.auditLogger = new AuditLogObserver();

    // Attach observers to event emitter
    this.eventEmitter.attach(this.consoleLogger); // Subscribe to all events
    this.eventEmitter.attach(this.auditLogger); // Subscribe to all events
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

  // ==================== Statistics ====================

  /**
   * Get application statistics
   */
  getStats() {
    return {
      blockchain: this.chain.getStats(),
      cards: this.cardRepository.getStats(),
      boards: this.boardRepository.getStats(),
      events: this.eventEmitter.getStats(),
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
