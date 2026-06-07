import { QueryClient } from '@tanstack/react-query';
import { captureError } from './sentry';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: (failureCount, error: any) => {
        // Don't retry auth errors
        if (error?.status === 401) return false;
        if (error?.status === 403) return false;
        // Retry network errors max 2 times
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => 
        Math.min(1000 * 2 ** attemptIndex, 8000),
    },
    mutations: {
      retry: 1,
      onError: (error: unknown) => {
        captureError(error, {
          context: 'mutation_error'
        });
      },
    },
  },
});

// Listen for query errors globally
queryClient.getQueryCache().subscribe((event) => {
  if (
    event.type === 'updated' &&
    event.query.state.status === 'error'
  ) {
    const error = event.query.state.error;
    // Log to Sentry (only critical queries)
    captureError(error, {
      context: 'query_error',
      queryKey: JSON.stringify(
        event.query.queryKey
      ).substring(0, 100)
    });
  }
});

