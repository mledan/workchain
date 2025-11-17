import { Payment, PaymentStatus, PaymentGateway, Project, Milestone } from '../types';
import { PaymentRepository } from '../repositories/PaymentRepository';
import { Chain } from '../blockchain/Chain';
import { nanoid } from 'nanoid';

/**
 * PaymentService - Handles payment processing with multiple gateways
 *
 * Supports: Stripe, PayPal, Venmo, Wise, and future crypto payments
 */
export class PaymentService {
  private paymentRepository: PaymentRepository;
  private chain: Chain;

  // Platform fee percentage (10% total, split 5% client, 5% freelancer)
  private readonly PLATFORM_FEE_RATE = 0.10;

  constructor(paymentRepository: PaymentRepository, chain: Chain) {
    this.paymentRepository = paymentRepository;
    this.chain = chain;
  }

  /**
   * Create a payment and move funds to escrow
   */
  async createPayment(params: {
    projectId: string;
    milestoneId?: string;
    clientId: string;
    freelancerId: string;
    amount: number;
    currency: string;
    gateway: PaymentGateway;
    actorId: string;
  }): Promise<Payment> {
    const { projectId, milestoneId, clientId, freelancerId, amount, currency, gateway, actorId } = params;

    // Calculate fees
    const platformFee = amount * this.PLATFORM_FEE_RATE;
    const gatewayFee = this.calculateGatewayFee(amount, gateway);

    const payment: Payment = {
      id: nanoid(),
      projectId,
      milestoneId,
      clientId,
      freelancerId,
      amount,
      currency,
      status: PaymentStatus.PENDING,
      gateway,
      fees: {
        platformFee,
        gatewayFee,
      },
      createdAt: new Date(),
    };

    // Save to repository
    await this.paymentRepository.create(payment);

    // Log to blockchain
    this.chain.addBlock(
      'CREATE_PAYMENT' as any,
      'Payment',
      payment.id,
      {
        projectId,
        milestoneId,
        amount,
        currency,
        gateway,
        clientId,
        freelancerId,
      },
      actorId
    );

    return payment;
  }

  /**
   * Move payment to escrow
   */
  async escrowPayment(paymentId: string, actorId: string): Promise<Payment> {
    const payment = await this.paymentRepository.findById(paymentId);
    if (!payment) {
      throw new Error('Payment not found');
    }

    if (payment.status !== PaymentStatus.PENDING) {
      throw new Error('Payment must be in PENDING status to escrow');
    }

    // Process escrow based on gateway
    const gatewayTransactionId = await this.processEscrow(payment);

    // Update payment status
    const updated = await this.paymentRepository.update(paymentId, {
      status: PaymentStatus.ESCROWED,
      gatewayTransactionId,
      escrowedAt: new Date(),
    });

    if (!updated) {
      throw new Error('Failed to update payment');
    }

    // Log to blockchain
    this.chain.addBlock(
      'ESCROW_PAYMENT' as any,
      'Payment',
      paymentId,
      {
        gatewayTransactionId,
        amount: payment.amount,
      },
      actorId
    );

    return updated;
  }

  /**
   * Release payment from escrow to freelancer
   */
  async releasePayment(paymentId: string, actorId: string): Promise<Payment> {
    const payment = await this.paymentRepository.findById(paymentId);
    if (!payment) {
      throw new Error('Payment not found');
    }

    if (payment.status !== PaymentStatus.ESCROWED) {
      throw new Error('Payment must be in ESCROWED status to release');
    }

    // Process release based on gateway
    await this.processRelease(payment);

    // Update payment status
    const updated = await this.paymentRepository.update(paymentId, {
      status: PaymentStatus.RELEASED,
      releasedAt: new Date(),
    });

    if (!updated) {
      throw new Error('Failed to update payment');
    }

    // Log to blockchain
    this.chain.addBlock(
      'RELEASE_PAYMENT' as any,
      'Payment',
      paymentId,
      {
        freelancerId: payment.freelancerId,
        amount: payment.amount,
        netAmount: payment.amount - payment.fees.platformFee - payment.fees.gatewayFee,
      },
      actorId
    );

    return updated;
  }

  /**
   * Refund payment to client
   */
  async refundPayment(paymentId: string, actorId: string): Promise<Payment> {
    const payment = await this.paymentRepository.findById(paymentId);
    if (!payment) {
      throw new Error('Payment not found');
    }

    if (payment.status !== PaymentStatus.ESCROWED) {
      throw new Error('Payment must be in ESCROWED status to refund');
    }

    // Process refund based on gateway
    await this.processRefund(payment);

    // Update payment status
    const updated = await this.paymentRepository.update(paymentId, {
      status: PaymentStatus.REFUNDED,
    });

    if (!updated) {
      throw new Error('Failed to update payment');
    }

    // Log to blockchain
    this.chain.addBlock(
      'REFUND_PAYMENT' as any,
      'Payment',
      paymentId,
      {
        clientId: payment.clientId,
        amount: payment.amount,
      },
      actorId
    );

    return updated;
  }

  /**
   * Mark payment as disputed
   */
  async disputePayment(paymentId: string, reason: string, actorId: string): Promise<Payment> {
    const payment = await this.paymentRepository.findById(paymentId);
    if (!payment) {
      throw new Error('Payment not found');
    }

    const updated = await this.paymentRepository.update(paymentId, {
      status: PaymentStatus.DISPUTED,
    });

    if (!updated) {
      throw new Error('Failed to update payment');
    }

    // Log to blockchain
    this.chain.addBlock(
      'DISPUTE_PAYMENT' as any,
      'Payment',
      paymentId,
      {
        reason,
        disputedBy: actorId,
      },
      actorId
    );

    return updated;
  }

  // ==================== Gateway-Specific Methods ====================

  private calculateGatewayFee(amount: number, gateway: PaymentGateway): number {
    switch (gateway) {
      case 'stripe':
        // Stripe: 2.9% + $0.30
        return amount * 0.029 + 0.30;
      case 'paypal':
        // PayPal: 2.9% + $0.30
        return amount * 0.029 + 0.30;
      case 'venmo':
        // Venmo: 1.9% + $0.10 for business
        return amount * 0.019 + 0.10;
      case 'wise':
        // Wise: ~0.5% (varies by currency)
        return amount * 0.005;
      case 'crypto':
        // Crypto: Network fees (estimate)
        return 5.00; // Flat fee estimate
      default:
        return 0;
    }
  }

  /**
   * Process escrow with the payment gateway
   * In a real implementation, this would call the gateway's API
   */
  private async processEscrow(payment: Payment): Promise<string> {
    console.log(`[${payment.gateway}] Processing escrow for payment ${payment.id}`);

    // Simulate gateway-specific escrow logic
    switch (payment.gateway) {
      case 'stripe':
        return await this.stripeEscrow(payment);
      case 'paypal':
        return await this.paypalEscrow(payment);
      case 'venmo':
        return await this.venmoEscrow(payment);
      case 'wise':
        return await this.wiseEscrow(payment);
      case 'crypto':
        return await this.cryptoEscrow(payment);
      default:
        throw new Error(`Unsupported payment gateway: ${payment.gateway}`);
    }
  }

  /**
   * Process release with the payment gateway
   */
  private async processRelease(payment: Payment): Promise<void> {
    console.log(`[${payment.gateway}] Releasing payment ${payment.id} to freelancer`);

    // Simulate gateway-specific release logic
    switch (payment.gateway) {
      case 'stripe':
        await this.stripeRelease(payment);
        break;
      case 'paypal':
        await this.paypalRelease(payment);
        break;
      case 'venmo':
        await this.venmoRelease(payment);
        break;
      case 'wise':
        await this.wiseRelease(payment);
        break;
      case 'crypto':
        await this.cryptoRelease(payment);
        break;
      default:
        throw new Error(`Unsupported payment gateway: ${payment.gateway}`);
    }
  }

  /**
   * Process refund with the payment gateway
   */
  private async processRefund(payment: Payment): Promise<void> {
    console.log(`[${payment.gateway}] Refunding payment ${payment.id} to client`);

    // Simulate gateway-specific refund logic
    switch (payment.gateway) {
      case 'stripe':
        await this.stripeRefund(payment);
        break;
      case 'paypal':
        await this.paypalRefund(payment);
        break;
      case 'venmo':
        await this.venmoRefund(payment);
        break;
      case 'wise':
        await this.wiseRefund(payment);
        break;
      case 'crypto':
        await this.cryptoRefund(payment);
        break;
      default:
        throw new Error(`Unsupported payment gateway: ${payment.gateway}`);
    }
  }

  // ==================== Stripe Integration ====================

  private async stripeEscrow(payment: Payment): Promise<string> {
    // Real implementation would use Stripe API:
    // const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    // const paymentIntent = await stripe.paymentIntents.create({
    //   amount: payment.amount * 100, // Stripe uses cents
    //   currency: payment.currency,
    //   payment_method_types: ['card'],
    //   capture_method: 'manual', // Authorize but don't capture yet
    //   metadata: {
    //     projectId: payment.projectId,
    //     freelancerId: payment.freelancerId,
    //   },
    // });
    // return paymentIntent.id;

    return `stripe_pi_${nanoid()}`;
  }

  private async stripeRelease(payment: Payment): Promise<void> {
    // const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    // await stripe.paymentIntents.capture(payment.gatewayTransactionId);
    //
    // Then transfer to freelancer:
    // await stripe.transfers.create({
    //   amount: (payment.amount - payment.fees.platformFee - payment.fees.gatewayFee) * 100,
    //   currency: payment.currency,
    //   destination: freelancerStripeAccountId,
    // });

    console.log(`Stripe: Released $${payment.amount} to freelancer ${payment.freelancerId}`);
  }

  private async stripeRefund(payment: Payment): Promise<void> {
    // const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    // await stripe.refunds.create({
    //   payment_intent: payment.gatewayTransactionId,
    // });

    console.log(`Stripe: Refunded $${payment.amount} to client ${payment.clientId}`);
  }

  // ==================== PayPal Integration ====================

  private async paypalEscrow(payment: Payment): Promise<string> {
    // Real implementation would use PayPal API:
    // const paypal = require('@paypal/checkout-server-sdk');
    // const request = new paypal.orders.OrdersCreateRequest();
    // request.requestBody({
    //   intent: 'AUTHORIZE',
    //   purchase_units: [{
    //     amount: {
    //       currency_code: payment.currency,
    //       value: payment.amount.toString(),
    //     },
    //   }],
    // });
    // const order = await client.execute(request);
    // return order.result.id;

    return `paypal_order_${nanoid()}`;
  }

  private async paypalRelease(payment: Payment): Promise<void> {
    // const paypal = require('@paypal/checkout-server-sdk');
    // const request = new paypal.orders.OrdersCaptureRequest(payment.gatewayTransactionId);
    // await client.execute(request);

    console.log(`PayPal: Released $${payment.amount} to freelancer ${payment.freelancerId}`);
  }

  private async paypalRefund(payment: Payment): Promise<void> {
    // const paypal = require('@paypal/checkout-server-sdk');
    // const request = new paypal.payments.CapturesRefundRequest(payment.gatewayTransactionId);
    // await client.execute(request);

    console.log(`PayPal: Refunded $${payment.amount} to client ${payment.clientId}`);
  }

  // ==================== Venmo Integration ====================

  private async venmoEscrow(payment: Payment): Promise<string> {
    // Venmo doesn't have a public business API yet
    // You would typically use Braintree (owned by PayPal) which supports Venmo:
    // const braintree = require('braintree');
    // const gateway = new braintree.BraintreeGateway({
    //   environment: braintree.Environment.Production,
    //   merchantId: 'your_merchant_id',
    //   publicKey: 'your_public_key',
    //   privateKey: 'your_private_key',
    // });
    //
    // const result = await gateway.transaction.sale({
    //   amount: payment.amount.toString(),
    //   paymentMethodNonce: nonceFromTheClient,
    //   options: {
    //     submitForSettlement: false, // Authorize but don't settle
    //   },
    // });
    // return result.transaction.id;

    return `venmo_txn_${nanoid()}`;
  }

  private async venmoRelease(payment: Payment): Promise<void> {
    // const gateway = braintree.BraintreeGateway({...});
    // await gateway.transaction.submitForSettlement(payment.gatewayTransactionId);

    console.log(`Venmo: Released $${payment.amount} to freelancer ${payment.freelancerId}`);
  }

  private async venmoRefund(payment: Payment): Promise<void> {
    // const gateway = braintree.BraintreeGateway({...});
    // await gateway.transaction.refund(payment.gatewayTransactionId);

    console.log(`Venmo: Refunded $${payment.amount} to client ${payment.clientId}`);
  }

  // ==================== Wise Integration ====================

  private async wiseEscrow(payment: Payment): Promise<string> {
    // Wise (formerly TransferWise) API:
    // const wise = require('wise-api');
    // const quote = await wise.createQuote({
    //   sourceCurrency: payment.currency,
    //   targetCurrency: payment.currency,
    //   sourceAmount: payment.amount,
    // });
    // const transfer = await wise.createTransfer({
    //   quoteId: quote.id,
    //   targetAccount: freelancerAccountId,
    //   // Hold funds until ready to release
    // });
    // return transfer.id;

    return `wise_transfer_${nanoid()}`;
  }

  private async wiseRelease(payment: Payment): Promise<void> {
    // const wise = require('wise-api');
    // await wise.fundTransfer(payment.gatewayTransactionId);

    console.log(`Wise: Released $${payment.amount} to freelancer ${payment.freelancerId}`);
  }

  private async wiseRefund(payment: Payment): Promise<void> {
    // const wise = require('wise-api');
    // await wise.cancelTransfer(payment.gatewayTransactionId);

    console.log(`Wise: Refunded $${payment.amount} to client ${payment.clientId}`);
  }

  // ==================== Crypto Integration (Future) ====================

  private async cryptoEscrow(payment: Payment): Promise<string> {
    // Using smart contract for escrow:
    // const Web3 = require('web3');
    // const web3 = new Web3(process.env.ETH_PROVIDER_URL);
    // const escrowContract = new web3.eth.Contract(EscrowABI, escrowContractAddress);
    //
    // const tx = await escrowContract.methods.createEscrow(
    //   payment.freelancerId,
    //   web3.utils.toWei(payment.amount.toString(), 'ether')
    // ).send({
    //   from: payment.clientId,
    //   value: web3.utils.toWei(payment.amount.toString(), 'ether'),
    // });
    // return tx.transactionHash;

    return `crypto_txn_${nanoid()}`;
  }

  private async cryptoRelease(payment: Payment): Promise<void> {
    // const escrowContract = new web3.eth.Contract(EscrowABI, escrowContractAddress);
    // await escrowContract.methods.releasePayment(payment.gatewayTransactionId).send({
    //   from: payment.clientId,
    // });

    console.log(`Crypto: Released ${payment.amount} to freelancer ${payment.freelancerId}`);
  }

  private async cryptoRefund(payment: Payment): Promise<void> {
    // const escrowContract = new web3.eth.Contract(EscrowABI, escrowContractAddress);
    // await escrowContract.methods.refundPayment(payment.gatewayTransactionId).send({
    //   from: payment.freelancerId,
    // });

    console.log(`Crypto: Refunded ${payment.amount} to client ${payment.clientId}`);
  }
}
