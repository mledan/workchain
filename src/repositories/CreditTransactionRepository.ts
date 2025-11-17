import { IRepository } from './IRepository';
import {
  CreditTransaction,
  CreditTransactionType,
  CreditBalance
} from '../types';
import { nanoid } from 'nanoid';

export class CreditTransactionRepository implements IRepository<CreditTransaction> {
  private transactions: Map<string, CreditTransaction> = new Map();
  private userIndex: Map<string, Set<string>> = new Map(); // userId -> transactionIds
  private typeIndex: Map<CreditTransactionType, Set<string>> = new Map();
  private balances: Map<string, CreditBalance> = new Map(); // userId -> balance

  async create(data: Omit<CreditTransaction, 'id' | 'createdAt'>): Promise<CreditTransaction> {
    const transaction: CreditTransaction = {
      ...data,
      id: nanoid(),
      createdAt: new Date()
    };

    this.transactions.set(transaction.id, transaction);

    // Update indices
    if (!this.userIndex.has(transaction.userId)) {
      this.userIndex.set(transaction.userId, new Set());
    }
    this.userIndex.get(transaction.userId)!.add(transaction.id);

    if (!this.typeIndex.has(transaction.type)) {
      this.typeIndex.set(transaction.type, new Set());
    }
    this.typeIndex.get(transaction.type)!.add(transaction.id);

    // Update balance
    await this.updateBalance(transaction.userId, transaction.amount);

    return transaction;
  }

  async findById(id: string): Promise<CreditTransaction | undefined> {
    return this.transactions.get(id);
  }

  async findAll(): Promise<CreditTransaction[]> {
    return Array.from(this.transactions.values());
  }

  async update(id: string, data: Partial<CreditTransaction>): Promise<CreditTransaction | undefined> {
    const transaction = this.transactions.get(id);
    if (!transaction) return undefined;

    const updated = { ...transaction, ...data };
    this.transactions.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const transaction = this.transactions.get(id);
    if (!transaction) return false;

    // Clean up indices
    this.userIndex.get(transaction.userId)?.delete(id);
    this.typeIndex.get(transaction.type)?.delete(id);

    return this.transactions.delete(id);
  }

  async findByUser(userId: string): Promise<CreditTransaction[]> {
    const ids = this.userIndex.get(userId);
    if (!ids) return [];

    return Array.from(ids)
      .map(id => this.transactions.get(id))
      .filter((t): t is CreditTransaction => t !== undefined)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async findByType(type: CreditTransactionType): Promise<CreditTransaction[]> {
    const ids = this.typeIndex.get(type);
    if (!ids) return [];

    return Array.from(ids)
      .map(id => this.transactions.get(id))
      .filter((t): t is CreditTransaction => t !== undefined);
  }

  async getBalance(userId: string): Promise<CreditBalance> {
    let balance = this.balances.get(userId);

    if (!balance) {
      balance = {
        userId,
        totalEarned: 0,
        totalSpent: 0,
        currentBalance: 0,
        lockedCredits: 0,
        lifetimeContributions: 0,
        lastUpdated: new Date()
      };
      this.balances.set(userId, balance);
    }

    return balance;
  }

  private async updateBalance(userId: string, amount: number): Promise<void> {
    const balance = await this.getBalance(userId);

    balance.currentBalance += amount;

    if (amount > 0) {
      balance.totalEarned += amount;
      balance.lifetimeContributions += amount;
    } else {
      balance.totalSpent += Math.abs(amount);
    }

    balance.lastUpdated = new Date();
    this.balances.set(userId, balance);
  }

  async lockCredits(userId: string, amount: number): Promise<boolean> {
    const balance = await this.getBalance(userId);

    if (balance.currentBalance - balance.lockedCredits < amount) {
      return false; // Insufficient available credits
    }

    balance.lockedCredits += amount;
    balance.lastUpdated = new Date();
    this.balances.set(userId, balance);

    return true;
  }

  async unlockCredits(userId: string, amount: number): Promise<void> {
    const balance = await this.getBalance(userId);
    balance.lockedCredits = Math.max(0, balance.lockedCredits - amount);
    balance.lastUpdated = new Date();
    this.balances.set(userId, balance);
  }

  async getUserTransactionHistory(
    userId: string,
    filters?: {
      type?: CreditTransactionType;
      startDate?: Date;
      endDate?: Date;
      minAmount?: number;
      maxAmount?: number;
    }
  ): Promise<CreditTransaction[]> {
    let transactions = await this.findByUser(userId);

    if (filters) {
      if (filters.type) {
        transactions = transactions.filter(t => t.type === filters.type);
      }
      if (filters.startDate) {
        transactions = transactions.filter(t => t.createdAt >= filters.startDate!);
      }
      if (filters.endDate) {
        transactions = transactions.filter(t => t.createdAt <= filters.endDate!);
      }
      if (filters.minAmount !== undefined) {
        transactions = transactions.filter(t => Math.abs(t.amount) >= filters.minAmount!);
      }
      if (filters.maxAmount !== undefined) {
        transactions = transactions.filter(t => Math.abs(t.amount) <= filters.maxAmount!);
      }
    }

    return transactions;
  }

  async getTransactionsByReference(
    referenceId: string,
    referenceType?: 'contribution' | 'milestone' | 'project' | 'payment'
  ): Promise<CreditTransaction[]> {
    return Array.from(this.transactions.values())
      .filter(t =>
        t.referenceId === referenceId &&
        (!referenceType || t.referenceType === referenceType)
      );
  }

  async getTotalPlatformCredits(): Promise<{
    totalIssued: number;
    totalCirculating: number;
    totalLocked: number;
  }> {
    const allBalances = Array.from(this.balances.values());

    return {
      totalIssued: allBalances.reduce((sum, b) => sum + b.totalEarned, 0),
      totalCirculating: allBalances.reduce((sum, b) => sum + b.currentBalance, 0),
      totalLocked: allBalances.reduce((sum, b) => sum + b.lockedCredits, 0)
    };
  }

  async getLeaderboard(limit: number = 10): Promise<Array<{
    userId: string;
    balance: CreditBalance;
    rank: number;
  }>> {
    const allBalances = Array.from(this.balances.values())
      .sort((a, b) => b.lifetimeContributions - a.lifetimeContributions)
      .slice(0, limit);

    return allBalances.map((balance, index) => ({
      userId: balance.userId,
      balance,
      rank: index + 1
    }));
  }
}
