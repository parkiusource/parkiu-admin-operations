import { MutationFunction } from '@tanstack/react-query';

interface MutationParams {
  url: string;
  method?: 'POST' | 'PUT' | 'DELETE';
  data?: unknown;
}

export const mutationQuery = <T>(
  params: MutationParams
): MutationFunction<T> => {
  return async () => {
    const response = await fetch(params.url, {
      method: params.method || 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: params.data ? JSON.stringify(params.data) : undefined,
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    return response.json();
  };
};
