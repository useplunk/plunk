// Environment configuration
// In development: Uses NEXT_PUBLIC_* env vars from .env file
// In production (Docker): Build-time values are replaced at container startup via sed

const env = (value: string | undefined): string | undefined => value?.trim();

export const API_URI = env(process.env.NEXT_PUBLIC_API_URI) || 'http://localhost:8080';
export const DASHBOARD_URI = env(process.env.NEXT_PUBLIC_DASHBOARD_URI) || 'http://localhost:3000';
export const LANDING_URI = env(process.env.NEXT_PUBLIC_LANDING_URI) || 'http://localhost:4000';
export const WIKI_URI = env(process.env.NEXT_PUBLIC_WIKI_URI) || 'http://localhost:1000';
