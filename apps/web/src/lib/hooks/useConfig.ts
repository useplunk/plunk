import useSWR from 'swr';

export interface ConfigResponse {
  environment: string;
  urls: {
    api: string;
    dashboard: string;
    landing: string;
    wiki: string | null;
  };
  features: {
    storage: {storageEnabled: boolean};
    authProviders: {github: boolean; google: boolean};
    email: {trackingToggleEnabled: boolean};
    smtp: {
      enabled: boolean;
      domain: string | null;
      ports: {secure: number; submission: number} | null;
    };
}

/**
 * Fetch global instance configuration and feature flags.
 *
 * - `data` is undefined while loading, then a ConfigResponse on success.
 * - Errors do not retry by default.
 */
export function useConfig() {
  return useSWR<ConfigResponse>('/config', {shouldRetryOnError: false});
}
