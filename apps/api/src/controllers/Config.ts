import {Controller, Get} from '@overnightjs/core';
import type {Request, Response} from 'express';

import {
  API_URI,
  DASHBOARD_URI,
  GITHUB_OAUTH_ENABLED,
  GOOGLE_OAUTH_ENABLED,
  LANDING_URI,
  NODE_ENV,
  AZURE_STORAGE_ENABLED,
  SMTP_DOMAIN,
  SMTP_ENABLED,
  SMTP_PORT_SECURE,
  SMTP_PORT_SUBMISSION,
  TRACKING_TOGGLE_ENABLED,
  WIKI_URI,
} from '../app/constants.js';

@Controller('config')
export class Config {
  /**
   * GET /config
   * Expose a unified view of instance capabilities and feature flags for frontends.
   */
  @Get('')
  public getConfig(req: Request, res: Response) {
    return res.status(200).json({
      environment: NODE_ENV,
      urls: {
        api: API_URI,
        dashboard: DASHBOARD_URI,
        landing: LANDING_URI,
        wiki: WIKI_URI || null,
      },
      features: {
        storage: {
          storageEnabled: AZURE_STORAGE_ENABLED,
        },
        authProviders: {
          github: GITHUB_OAUTH_ENABLED,
          google: GOOGLE_OAUTH_ENABLED,
        },
        email: {
          trackingToggleEnabled: TRACKING_TOGGLE_ENABLED,
        },
        smtp: {
          enabled: SMTP_ENABLED,
          domain: SMTP_ENABLED ? SMTP_DOMAIN : null,
          ports: SMTP_ENABLED
            ? {
                secure: SMTP_PORT_SECURE,
                submission: SMTP_PORT_SUBMISSION,
              }
            : null,
        },
      },
    });
  }
}
