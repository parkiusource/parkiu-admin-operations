import { createContext } from 'react';
import { QueryClient } from '@tanstack/react-query';

export const QueryClientContext = createContext<QueryClient | null>(null);
