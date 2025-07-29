export interface LoadingState<T> {
  isLoading: boolean;
  error: Error | null;
  data?: T | unknown;
}