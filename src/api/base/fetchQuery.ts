import Axios from 'axios';
import { QueryFunction } from '@tanstack/react-query';

interface FetchParams {
  signal?: AbortSignal;
}

export const fetchQuery = <T>(
  params: FetchParams
): QueryFunction<T> => {
  return async ({ signal }) => {
    const response = await Axios({ ...params, signal });
    return response.data;
  };
};
