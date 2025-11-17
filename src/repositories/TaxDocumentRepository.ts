import { IRepository } from './IRepository';
import { TaxDocument } from '../types';
import { nanoid } from 'nanoid';

export class TaxDocumentRepository implements IRepository<TaxDocument> {
  private documents: Map<string, TaxDocument> = new Map();
  private userIndex: Map<string, Set<string>> = new Map(); // userId -> documentIds
  private yearIndex: Map<number, Set<string>> = new Map(); // year -> documentIds

  async create(data: Omit<TaxDocument, 'id' | 'generatedAt' | 'filedWithIRS'>): Promise<TaxDocument> {
    const document: TaxDocument = {
      ...data,
      id: nanoid(),
      generatedAt: new Date(),
      filedWithIRS: false
    };

    this.documents.set(document.id, document);

    // Update indices
    if (!this.userIndex.has(document.userId)) {
      this.userIndex.set(document.userId, new Set());
    }
    this.userIndex.get(document.userId)!.add(document.id);

    if (!this.yearIndex.has(document.year)) {
      this.yearIndex.set(document.year, new Set());
    }
    this.yearIndex.get(document.year)!.add(document.id);

    return document;
  }

  async findById(id: string): Promise<TaxDocument | undefined> {
    return this.documents.get(id);
  }

  async findAll(): Promise<TaxDocument[]> {
    return Array.from(this.documents.values());
  }

  async update(id: string, data: Partial<TaxDocument>): Promise<TaxDocument | undefined> {
    const document = this.documents.get(id);
    if (!document) return undefined;

    const updated = { ...document, ...data };
    this.documents.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const document = this.documents.get(id);
    if (!document) return false;

    // Clean up indices
    this.userIndex.get(document.userId)?.delete(id);
    this.yearIndex.get(document.year)?.delete(id);

    return this.documents.delete(id);
  }

  async findByUser(userId: string): Promise<TaxDocument[]> {
    const ids = this.userIndex.get(userId);
    if (!ids) return [];

    return Array.from(ids)
      .map(id => this.documents.get(id))
      .filter((d): d is TaxDocument => d !== undefined)
      .sort((a, b) => b.year - a.year);
  }

  async findByUserAndYear(userId: string, year: number): Promise<TaxDocument[]> {
    const userDocs = await this.findByUser(userId);
    return userDocs.filter(d => d.year === year);
  }

  async findByYear(year: number): Promise<TaxDocument[]> {
    const ids = this.yearIndex.get(year);
    if (!ids) return [];

    return Array.from(ids)
      .map(id => this.documents.get(id))
      .filter((d): d is TaxDocument => d !== undefined);
  }

  async findByType(type: '1099-NEC' | '1099-K' | 'summary'): Promise<TaxDocument[]> {
    return Array.from(this.documents.values()).filter(d => d.type === type);
  }

  async findUnfiled(): Promise<TaxDocument[]> {
    return Array.from(this.documents.values()).filter(d => !d.filedWithIRS);
  }

  async markAsFiled(id: string): Promise<TaxDocument | undefined> {
    return this.update(id, {
      filedWithIRS: true,
      filedAt: new Date()
    });
  }

  async getUserTotalEarnings(userId: string, year: number): Promise<{
    totalEarnings: number;
    platformFees: number;
    netEarnings: number;
    documentCount: number;
  }> {
    const docs = await this.findByUserAndYear(userId, year);

    return {
      totalEarnings: docs.reduce((sum, d) => sum + d.totalEarnings, 0),
      platformFees: docs.reduce((sum, d) => sum + d.platformFees, 0),
      netEarnings: docs.reduce((sum, d) => sum + d.netEarnings, 0),
      documentCount: docs.length
    };
  }

  async getPlatformTotalsByYear(year: number): Promise<{
    total1099NEC: number;
    total1099K: number;
    totalContractors: number;
    totalEarnings: number;
  }> {
    const docs = await this.findByYear(year);
    const contractors = new Set(docs.map(d => d.userId));

    return {
      total1099NEC: docs.filter(d => d.type === '1099-NEC').length,
      total1099K: docs.filter(d => d.type === '1099-K').length,
      totalContractors: contractors.size,
      totalEarnings: docs.reduce((sum, d) => sum + d.totalEarnings, 0)
    };
  }
}
