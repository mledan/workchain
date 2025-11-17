import { IRepository } from './IRepository';
import { Payment, PaymentStatus } from '../types';

/**
 * PaymentRepository - Repository for managing payments
 *
 * Pattern: Repository Pattern
 * Provides data access abstraction for Payment entities
 */
export class PaymentRepository implements IRepository<Payment> {
  private payments: Map<string, Payment> = new Map();
  private projectIndex: Map<string, Set<string>> = new Map(); // projectId -> paymentIds
  private clientIndex: Map<string, Set<string>> = new Map(); // clientId -> paymentIds
  private freelancerIndex: Map<string, Set<string>> = new Map(); // freelancerId -> paymentIds
  private statusIndex: Map<PaymentStatus, Set<string>> = new Map(); // status -> paymentIds
  private milestoneIndex: Map<string, string> = new Map(); // milestoneId -> paymentId

  async findById(id: string): Promise<Payment | null> {
    return this.payments.get(id) || null;
  }

  async create(entity: Payment): Promise<Payment> {
    this.payments.set(entity.id, entity);

    // Update project index
    if (!this.projectIndex.has(entity.projectId)) {
      this.projectIndex.set(entity.projectId, new Set());
    }
    this.projectIndex.get(entity.projectId)!.add(entity.id);

    // Update client index
    if (!this.clientIndex.has(entity.clientId)) {
      this.clientIndex.set(entity.clientId, new Set());
    }
    this.clientIndex.get(entity.clientId)!.add(entity.id);

    // Update freelancer index
    if (!this.freelancerIndex.has(entity.freelancerId)) {
      this.freelancerIndex.set(entity.freelancerId, new Set());
    }
    this.freelancerIndex.get(entity.freelancerId)!.add(entity.id);

    // Update status index
    if (!this.statusIndex.has(entity.status)) {
      this.statusIndex.set(entity.status, new Set());
    }
    this.statusIndex.get(entity.status)!.add(entity.id);

    // Update milestone index if applicable
    if (entity.milestoneId) {
      this.milestoneIndex.set(entity.milestoneId, entity.id);
    }

    return entity;
  }

  async update(id: string, updates: Partial<Payment>): Promise<Payment | null> {
    const payment = this.payments.get(id);
    if (!payment) return null;

    const oldStatus = payment.status;

    const updated = {
      ...payment,
      ...updates,
    };

    this.payments.set(id, updated);

    // Update status index if status changed
    if (updates.status && updates.status !== oldStatus) {
      this.statusIndex.get(oldStatus)?.delete(id);
      if (!this.statusIndex.has(updates.status)) {
        this.statusIndex.set(updates.status, new Set());
      }
      this.statusIndex.get(updates.status)!.add(id);
    }

    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const payment = this.payments.get(id);
    if (!payment) return false;

    this.payments.delete(id);

    // Clean up indices
    this.projectIndex.get(payment.projectId)?.delete(id);
    this.clientIndex.get(payment.clientId)?.delete(id);
    this.freelancerIndex.get(payment.freelancerId)?.delete(id);
    this.statusIndex.get(payment.status)?.delete(id);

    if (payment.milestoneId) {
      this.milestoneIndex.delete(payment.milestoneId);
    }

    return true;
  }

  async findAll(): Promise<Payment[]> {
    return Array.from(this.payments.values());
  }

  // Custom query methods

  async findByProject(projectId: string): Promise<Payment[]> {
    const paymentIds = this.projectIndex.get(projectId) || new Set();
    return Array.from(paymentIds)
      .map(id => this.payments.get(id))
      .filter((p): p is Payment => p !== undefined)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async findByClient(clientId: string): Promise<Payment[]> {
    const paymentIds = this.clientIndex.get(clientId) || new Set();
    return Array.from(paymentIds)
      .map(id => this.payments.get(id))
      .filter((p): p is Payment => p !== undefined)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async findByFreelancer(freelancerId: string): Promise<Payment[]> {
    const paymentIds = this.freelancerIndex.get(freelancerId) || new Set();
    return Array.from(paymentIds)
      .map(id => this.payments.get(id))
      .filter((p): p is Payment => p !== undefined)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async findByStatus(status: PaymentStatus): Promise<Payment[]> {
    const paymentIds = this.statusIndex.get(status) || new Set();
    return Array.from(paymentIds)
      .map(id => this.payments.get(id))
      .filter((p): p is Payment => p !== undefined);
  }

  async findByMilestone(milestoneId: string): Promise<Payment | null> {
    const paymentId = this.milestoneIndex.get(milestoneId);
    return paymentId ? this.payments.get(paymentId) || null : null;
  }

  async findEscrowed(): Promise<Payment[]> {
    return this.findByStatus(PaymentStatus.ESCROWED);
  }

  async findPending(): Promise<Payment[]> {
    return this.findByStatus(PaymentStatus.PENDING);
  }

  async findReleased(): Promise<Payment[]> {
    return this.findByStatus(PaymentStatus.RELEASED);
  }

  // Calculate earnings and spending
  async calculateFreelancerEarnings(freelancerId: string): Promise<{
    total: number;
    escrowed: number;
    released: number;
    pending: number;
  }> {
    const payments = await this.findByFreelancer(freelancerId);

    const earnings = {
      total: 0,
      escrowed: 0,
      released: 0,
      pending: 0,
    };

    for (const payment of payments) {
      const netAmount = payment.amount - payment.fees.platformFee - payment.fees.gatewayFee;

      earnings.total += netAmount;

      switch (payment.status) {
        case PaymentStatus.ESCROWED:
          earnings.escrowed += netAmount;
          break;
        case PaymentStatus.RELEASED:
          earnings.released += netAmount;
          break;
        case PaymentStatus.PENDING:
          earnings.pending += netAmount;
          break;
      }
    }

    return earnings;
  }

  async calculateClientSpending(clientId: string): Promise<{
    total: number;
    escrowed: number;
    released: number;
    pending: number;
  }> {
    const payments = await this.findByClient(clientId);

    const spending = {
      total: 0,
      escrowed: 0,
      released: 0,
      pending: 0,
    };

    for (const payment of payments) {
      spending.total += payment.amount;

      switch (payment.status) {
        case PaymentStatus.ESCROWED:
          spending.escrowed += payment.amount;
          break;
        case PaymentStatus.RELEASED:
          spending.released += payment.amount;
          break;
        case PaymentStatus.PENDING:
          spending.pending += payment.amount;
          break;
      }
    }

    return spending;
  }

  // Get statistics
  getStats() {
    const statusCounts: Record<string, number> = {};
    const gatewayCounts: Record<string, number> = {};
    let totalAmount = 0;
    let totalPlatformFees = 0;
    let totalGatewayFees = 0;

    for (const payment of this.payments.values()) {
      statusCounts[payment.status] = (statusCounts[payment.status] || 0) + 1;
      gatewayCounts[payment.gateway] = (gatewayCounts[payment.gateway] || 0) + 1;
      totalAmount += payment.amount;
      totalPlatformFees += payment.fees.platformFee;
      totalGatewayFees += payment.fees.gatewayFee;
    }

    return {
      totalPayments: this.payments.size,
      totalClients: this.clientIndex.size,
      totalFreelancers: this.freelancerIndex.size,
      statusCounts,
      gatewayCounts,
      totalAmount,
      totalPlatformFees,
      totalGatewayFees,
      averagePayment: this.payments.size > 0 ? totalAmount / this.payments.size : 0,
    };
  }
}
