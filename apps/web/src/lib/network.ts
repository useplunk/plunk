import type {infer as ZodInfer, ZodSchema} from 'zod';

import {API_URI} from './constants';

/** Paths that must not send auth/project headers (public hosted pages). */
const PUBLIC_PATH_PREFIXES = ['/forms/public/', '/landing-pages/public/', '/contacts/public/'];

function isPublicApiPath(path: string): boolean {
  const pathname = path.startsWith('http') ? new URL(path).pathname : path;
  return PUBLIC_PATH_PREFIXES.some(prefix => pathname.startsWith(prefix));
}

interface Json {
  [x: string]: string | number | boolean | Date | Json | JsonArray;
}

type JsonArray = (string | number | boolean | Date | Json | JsonArray)[];

interface TypedSchema extends ZodSchema {
  _type: unknown;
}

interface ApiResponse {
  message?: string;
  error?: {
    message?: string;
    code?: string;
    [key: string]: unknown;
  };

  [key: string]: unknown;
}

export class network {
  public static async fetch<T, Schema extends TypedSchema | void = void>(
    method: 'GET' | 'PUT' | 'POST' | 'DELETE' | 'PATCH',
    path: string,
    body?: Schema extends TypedSchema ? ZodInfer<Schema> : never,
  ): Promise<T> {
    const url = path.startsWith('http') ? path : API_URI + path;
    const isPublic = isPublicApiPath(path);

    // Get active project ID from localStorage (skip on public endpoints — breaks CORS preflight)
    const activeProjectId =
      !isPublic && typeof window !== 'undefined' ? localStorage.getItem('activeProjectId') : null;

    const headers: Record<string, string> = {};
    if (body) {
      headers['Content-Type'] = 'application/json';
    }
    if (activeProjectId) {
      headers['X-Project-Id'] = activeProjectId;
    }

    const response = await fetch(url, {
      method,
      body: body && JSON.stringify(body),
      headers,
      credentials: isPublic ? 'omit' : 'include',
    });

    // Handle 204 No Content responses (no body to parse)
    if (response.status === 204) {
      return {} as T;
    }

    const res = (await response.json()) as ApiResponse;

    if (response.status >= 400) {
      // Check if this is an email verification required error
      if (res.error?.code === 'EMAIL_VERIFICATION_REQUIRED') {
        // Redirect to verification page
        if (typeof window !== 'undefined' && !window.location.href.includes('/auth/verify-email')) {
          window.location.href = '/auth/verify-email';
        }
        throw new Error(res.error.message ?? 'Please verify your email address to continue');
      }

      // Extract error message from standardized error response or fall back to direct message property
      const errorMessage = res.error?.message ?? res.message ?? 'Something went wrong!';
      throw new Error(errorMessage);
    }

    return res as T;
  }

  /**
   * Upload file using FormData (multipart/form-data)
   * Used for file uploads where Content-Type must be set by browser
   */
  public static async upload<T>(method: 'POST' | 'PUT' | 'PATCH', path: string, formData: FormData): Promise<T> {
    const url = path.startsWith('http') ? path : API_URI + path;

    // Get active project ID from localStorage
    const activeProjectId = typeof window !== 'undefined' ? localStorage.getItem('activeProjectId') : null;

    const headers: Record<string, string> = {};
    // DO NOT set Content-Type - browser will set it automatically with boundary
    if (activeProjectId) {
      headers['X-Project-Id'] = activeProjectId;
    }

    const response = await fetch(url, {
      method,
      body: formData,
      headers,
      credentials: 'include',
    });

    const res = (await response.json()) as ApiResponse;

    if (response.status >= 400) {
      // Check if this is an email verification required error
      if (res.error?.code === 'EMAIL_VERIFICATION_REQUIRED') {
        // Redirect to verification page
        if (typeof window !== 'undefined') {
          window.location.href = '/auth/verify-email';
        }
        throw new Error(res.error.message ?? 'Please verify your email address to continue');
      }

      // Extract error message from standardized error response or fall back to direct message property
      const errorMessage = res.error?.message ?? res.message ?? 'Something went wrong!';
      throw new Error(errorMessage);
    }

    return res as T;
  }
}
