import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { TransactionService } from '../services/api/transactionService';
import { Transaction } from '../db/schema';
import { useToast } from './useToast';

const transactionService = new TransactionService();

export const useTransactions = () => {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const { data: activeTransactions, isLoading, error } = useQuery({
    queryKey: ['transactions', 'active'],
    queryFn: async () => {
      const response = await transactionService.getActiveTransactions();
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data;
    }
  });

  const createTransaction = useMutation({
    mutationFn: async (transaction: Omit<Transaction, 'id' | 'syncStatus'>) => {
      const response = await transactionService.createTransaction(transaction);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      addToast('Transacción creada exitosamente', 'success');
    },
    onError: (error: Error) => {
      addToast(error.message, 'error');
    }
  });

  const completeTransaction = useMutation({
    mutationFn: async ({ id, exitTime, amount }: { id: number; exitTime: Date; amount: number }) => {
      const response = await transactionService.completeTransaction(id, exitTime, amount);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      addToast('Transacción completada exitosamente', 'success');
    },
    onError: (error: Error) => {
      addToast(error.message, 'error');
    }
  });

  return {
    activeTransactions,
    isLoading,
    error,
    createTransaction,
    completeTransaction
  };
};
