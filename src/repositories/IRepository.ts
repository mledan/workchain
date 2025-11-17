/**
 * Repository Pattern - Abstract data access
 *
 * Benefits:
 * - Separates business logic from data access
 * - Easy to swap implementations (in-memory, database, etc.)
 * - Makes testing easier (mock repositories)
 * - Single source of truth for data operations
 */

export interface IRepository<T> {
  findById(id: string): Promise<T | null>;
  findAll(): Promise<T[]>;
  create(entity: T): Promise<T>;
  update(id: string, updates: Partial<T>): Promise<T>;
  delete(id: string): Promise<boolean>;
}

/**
 * Query interface for complex lookups
 */
export interface IQuery<T> {
  where(field: keyof T, operator: '=' | '!=' | '>' | '<' | '>=' | '<=', value: any): IQuery<T>;
  orderBy(field: keyof T, direction: 'asc' | 'desc'): IQuery<T>;
  limit(count: number): IQuery<T>;
  offset(count: number): IQuery<T>;
  execute(): Promise<T[]>;
}
