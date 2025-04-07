import { ParkiuDB } from '../../db/schema';
import { ITransactionService, ApiResponse, ApiError } from './types';
import { Transaction } from '../../db/schema';

export class TransactionService implements ITransactionService {
  private db: ParkiuDB;

  constructor() {
    this.db = new ParkiuDB();
  }

  private handleError(error: unknown): ApiError {
    console.error('TransactionService error:', error);
    return {
      code: 'TRANSACTION_SERVICE_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error',
      userMessage: 'Ha ocurrido un error al procesar la solicitud'
    };
  }

  async createTransaction(transaction: Omit<Transaction, 'id' | 'syncStatus'>): Promise<ApiResponse<Transaction>> {
    try {
      const id = await this.db.transactions.add({
        ...transaction,
        syncStatus: 'pending'
      });

      const newTransaction = await this.db.transactions.get(id);
      if (!newTransaction) {
        throw new Error('Transaction not found after creation');
      }

      return { data: newTransaction };
    } catch (error) {
      return { data: null as unknown as Transaction, error: this.handleError(error).userMessage };
    }
  }

  async completeTransaction(id: number, exitTime: Date, amount: number): Promise<ApiResponse<Transaction>> {
    try {
      await this.db.transactions.update(id, {
        exitTime,
        amount,
        status: 'completed',
        syncStatus: 'pending'
      });

      const updatedTransaction = await this.db.transactions.get(id);
      if (!updatedTransaction) {
        throw new Error('Transaction not found after update');
      }

      return { data: updatedTransaction };
    } catch (error) {
      return { data: null as unknown as Transaction, error: this.handleError(error).userMessage };
    }
  }

  async getActiveTransactions(): Promise<ApiResponse<Transaction[]>> {
    try {
      const transactions = await this.db.transactions
        .where('status')
        .equals('active')
        .toArray();

      return { data: transactions };
    } catch (error) {
      return { data: [], error: this.handleError(error).userMessage };
    }
  }
}
