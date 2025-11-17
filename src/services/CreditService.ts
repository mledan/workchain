import { ContributionRepository } from '../repositories/ContributionRepository';
import { CreditTransactionRepository } from '../repositories/CreditTransactionRepository';
import {
  Contribution,
  ContributionType,
  ContributionMetrics,
  CreditTransaction,
  CreditTransactionType,
  CreditBalance,
  ActionType
} from '../types';
import { Chain } from '../blockchain/Chain';

/**
 * CreditService manages the collaboration credit system
 * Credits are earned through contributions and can be converted to payments
 */
export class CreditService {
  private static readonly CREDIT_CONVERSION_RATE = 100; // 100 credits = $1 USD
  private static readonly MINIMUM_CONVERSION = 1000; // Minimum 1000 credits ($10) to convert

  // Credit multipliers by contribution type
  private static readonly TYPE_MULTIPLIERS: Record<ContributionType, number> = {
    [ContributionType.CODE]: 1.0,
    [ContributionType.CODE_REVIEW]: 0.5,
    [ContributionType.DESIGN]: 1.0,
    [ContributionType.DOCUMENTATION]: 0.7,
    [ContributionType.TESTING]: 0.8,
    [ContributionType.MENTORING]: 0.6,
    [ContributionType.PROJECT_MANAGEMENT]: 0.9,
    [ContributionType.BUG_FIX]: 1.2, // Bonus for bug fixes
    [ContributionType.ARCHITECTURE]: 1.5, // Bonus for architecture
    [ContributionType.DEVOPS]: 1.0
  };

  constructor(
    private contributionRepo: ContributionRepository,
    private creditTransactionRepo: CreditTransactionRepository,
    private chain: Chain
  ) {}

  /**
   * Calculate credits earned for a contribution based on metrics and type
   */
  calculateCredits(type: ContributionType, metrics: ContributionMetrics): number {
    let baseCredits = 0;

    // Base calculation varies by contribution type
    switch (type) {
      case ContributionType.CODE:
        // Credits based on lines of code (with diminishing returns)
        if (metrics.linesOfCode) {
          baseCredits = Math.min(
            metrics.linesOfCode * 0.1, // 0.1 credit per line
            500 // Cap at 500 for LOC
          );
        }
        // Bonus for files changed
        if (metrics.filesChanged) {
          baseCredits += metrics.filesChanged * 10;
        }
        break;

      case ContributionType.CODE_REVIEW:
        if (metrics.reviewsCompleted) {
          baseCredits = metrics.reviewsCompleted * 50; // 50 credits per review
        }
        break;

      case ContributionType.BUG_FIX:
        if (metrics.bugsFixed) {
          baseCredits = metrics.bugsFixed * 100; // 100 credits per bug
        }
        break;

      case ContributionType.TESTING:
        if (metrics.testsWritten) {
          baseCredits = metrics.testsWritten * 30; // 30 credits per test
        }
        break;

      case ContributionType.DOCUMENTATION:
      case ContributionType.DESIGN:
      case ContributionType.MENTORING:
      case ContributionType.PROJECT_MANAGEMENT:
      case ContributionType.ARCHITECTURE:
      case ContributionType.DEVOPS:
        // Time-based for these types
        if (metrics.hoursSpent) {
          baseCredits = metrics.hoursSpent * 100; // 100 credits per hour
        }
        break;
    }

    // Apply type multiplier
    baseCredits *= CreditService.TYPE_MULTIPLIERS[type];

    // Apply impact score multiplier (1-10 scale)
    const impactMultiplier = metrics.impactScore / 5; // Normalize to 0.2-2.0
    baseCredits *= impactMultiplier;

    return Math.round(baseCredits);
  }

  /**
   * Calculate reputation impact for a contribution
   */
  calculateReputationImpact(type: ContributionType, metrics: ContributionMetrics, credits: number): number {
    // Reputation is based on credits earned and impact score
    const baseReputation = credits / 10; // 10 credits = 1 reputation point
    const impactBonus = metrics.impactScore * 2; // High impact adds more reputation

    return Math.round(baseReputation + impactBonus);
  }

  /**
   * Create a new contribution and award credits
   */
  async createContribution(
    projectId: string,
    contributorId: string,
    type: ContributionType,
    description: string,
    metrics: ContributionMetrics,
    integrationData?: {
      platform: string;
      externalId: string;
      url: string;
    },
    actorId: string = contributorId
  ): Promise<Contribution> {
    // Calculate credits and reputation
    const creditsEarned = this.calculateCredits(type, metrics);
    const reputationImpact = this.calculateReputationImpact(type, metrics, creditsEarned);

    // Create contribution
    const contribution = await this.contributionRepo.create({
      projectId,
      contributorId,
      type,
      description,
      metrics,
      creditsEarned,
      reputationImpact,
      integrationData: integrationData as any,
      status: 'pending',
      blockchainHash: '' // Will be set when added to blockchain
    });

    // Record in blockchain
    const block = this.chain.addBlock(
      ActionType.CREATE_CONTRIBUTION,
      'Contribution',
      contribution.id,
      { contribution },
      actorId
    );

    // Update blockchain hash
    await this.contributionRepo.update(contribution.id, {
      blockchainHash: block.hash
    });

    return contribution;
  }

  /**
   * Verify a contribution and issue credits
   */
  async verifyContribution(
    contributionId: string,
    verifiedBy: string
  ): Promise<{ contribution: Contribution; transaction: CreditTransaction }> {
    const contribution = await this.contributionRepo.findById(contributionId);
    if (!contribution) {
      throw new Error('Contribution not found');
    }

    if (contribution.status === 'verified') {
      throw new Error('Contribution already verified');
    }

    // Update contribution status
    const updated = await this.contributionRepo.update(contributionId, {
      status: 'verified',
      verifiedBy,
      verifiedAt: new Date()
    });

    if (!updated) {
      throw new Error('Failed to update contribution');
    }

    // Create credit transaction
    const currentBalance = await this.creditTransactionRepo.getBalance(contribution.contributorId);
    const transaction = await this.creditTransactionRepo.create({
      userId: contribution.contributorId,
      amount: contribution.creditsEarned,
      type: CreditTransactionType.EARNED_CONTRIBUTION,
      balance: currentBalance.currentBalance + contribution.creditsEarned,
      referenceId: contributionId,
      referenceType: 'contribution',
      description: `Credits earned for ${contribution.type} contribution`,
      blockchainHash: '' // Will be set when added to blockchain
    });

    // Record both actions in blockchain
    const verifyBlock = this.chain.addBlock(
      ActionType.VERIFY_CONTRIBUTION,
      'Contribution',
      contributionId,
      { contributionId, verifiedBy },
      verifiedBy
    );

    const creditBlock = this.chain.addBlock(
      ActionType.EARN_CREDITS,
      'CreditTransaction',
      transaction.id,
      { transaction },
      contribution.contributorId
    );

    // Update blockchain hashes
    await this.creditTransactionRepo.update(transaction.id, {
      blockchainHash: creditBlock.hash
    });

    return { contribution: updated, transaction };
  }

  /**
   * Convert credits to payment
   */
  async convertCreditsToPayment(
    userId: string,
    credits: number,
    actorId: string
  ): Promise<{ transaction: CreditTransaction; amountUSD: number }> {
    // Validate minimum conversion
    if (credits < CreditService.MINIMUM_CONVERSION) {
      throw new Error(`Minimum ${CreditService.MINIMUM_CONVERSION} credits required for conversion`);
    }

    // Check balance
    const balance = await this.creditTransactionRepo.getBalance(userId);
    if (balance.currentBalance < credits) {
      throw new Error('Insufficient credits');
    }

    // Calculate USD amount
    const amountUSD = credits / CreditService.CREDIT_CONVERSION_RATE;

    // Create transaction
    const transaction = await this.creditTransactionRepo.create({
      userId,
      amount: -credits,
      type: CreditTransactionType.CONVERTED_TO_PAYMENT,
      balance: balance.currentBalance - credits,
      referenceId: userId,
      referenceType: 'payment',
      description: `Converted ${credits} credits to $${amountUSD.toFixed(2)} USD`,
      metadata: { amountUSD },
      blockchainHash: '' // Will be set when added to blockchain
    });

    // Record in blockchain
    const block = this.chain.addBlock(
      ActionType.CONVERT_CREDITS_TO_PAYMENT,
      'CreditTransaction',
      transaction.id,
      { transaction, amountUSD },
      actorId
    );

    await this.creditTransactionRepo.update(transaction.id, {
      blockchainHash: block.hash
    });

    return { transaction, amountUSD };
  }

  /**
   * Transfer credits between users
   */
  async transferCredits(
    fromUserId: string,
    toUserId: string,
    amount: number,
    reason: string,
    actorId: string
  ): Promise<{ fromTransaction: CreditTransaction; toTransaction: CreditTransaction }> {
    if (amount <= 0) {
      throw new Error('Transfer amount must be positive');
    }

    // Check sender balance
    const fromBalance = await this.creditTransactionRepo.getBalance(fromUserId);
    if (fromBalance.currentBalance < amount) {
      throw new Error('Insufficient credits');
    }

    // Create debit transaction
    const fromTransaction = await this.creditTransactionRepo.create({
      userId: fromUserId,
      amount: -amount,
      type: CreditTransactionType.TRANSFERRED,
      balance: fromBalance.currentBalance - amount,
      referenceId: toUserId,
      referenceType: 'payment',
      description: `Transferred ${amount} credits to user ${toUserId}: ${reason}`,
      blockchainHash: ''
    });

    // Create credit transaction
    const toBalance = await this.creditTransactionRepo.getBalance(toUserId);
    const toTransaction = await this.creditTransactionRepo.create({
      userId: toUserId,
      amount: amount,
      type: CreditTransactionType.TRANSFERRED,
      balance: toBalance.currentBalance + amount,
      referenceId: fromUserId,
      referenceType: 'payment',
      description: `Received ${amount} credits from user ${fromUserId}: ${reason}`,
      blockchainHash: ''
    });

    // Record in blockchain
    const block = this.chain.addBlock(
      ActionType.TRANSFER_CREDITS,
      'CreditTransaction',
      fromTransaction.id,
      { fromTransaction, toTransaction, reason },
      actorId
    );

    await this.creditTransactionRepo.update(fromTransaction.id, {
      blockchainHash: block.hash
    });
    await this.creditTransactionRepo.update(toTransaction.id, {
      blockchainHash: block.hash
    });

    return { fromTransaction, toTransaction };
  }

  /**
   * Get user's credit balance and history
   */
  async getUserCredits(userId: string): Promise<{
    balance: CreditBalance;
    recentTransactions: CreditTransaction[];
    contributionStats: any;
  }> {
    const balance = await this.creditTransactionRepo.getBalance(userId);
    const recentTransactions = (await this.creditTransactionRepo.findByUser(userId)).slice(0, 20);
    const contributionStats = await this.contributionRepo.getContributorStats(userId);

    return {
      balance,
      recentTransactions,
      contributionStats
    };
  }

  /**
   * Get credit leaderboard
   */
  async getLeaderboard(limit: number = 10): Promise<any[]> {
    return this.creditTransactionRepo.getLeaderboard(limit);
  }

  /**
   * Get platform-wide credit statistics
   */
  async getPlatformStats(): Promise<{
    totalCredits: any;
    totalContributions: number;
    contributionsByType: Record<ContributionType, number>;
  }> {
    const totalCredits = await this.creditTransactionRepo.getTotalPlatformCredits();
    const allContributions = await this.contributionRepo.findAll();

    const contributionsByType: Partial<Record<ContributionType, number>> = {};
    allContributions.forEach(c => {
      contributionsByType[c.type] = (contributionsByType[c.type] || 0) + 1;
    });

    return {
      totalCredits,
      totalContributions: allContributions.length,
      contributionsByType: contributionsByType as Record<ContributionType, number>
    };
  }
}
