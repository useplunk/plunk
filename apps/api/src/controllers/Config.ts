import {Controller, Get} from '@overnightjs/core';
import type {Request, Response} from 'express';

import {
  API_URI,
  AWS_SES_REGION,
  DASHBOARD_URI,
  DISABLE_SIGNUPS,
  GITHUB_OAUTH_ENABLED,
  GOOGLE_OAUTH_ENABLED,
  LANDING_URI,
  MAIL_FROM_SUBDOMAIN,
  NODE_ENV,
  S3_ENABLED,
  SHOW_SPONSOR,
  SMTP_DOMAIN,
  SMTP_ENABLED,
  SMTP_PORT_SECURE,
  SMTP_PORT_SUBMISSION,
  STRIPE_ENABLED,
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
        billing: {
          enabled: STRIPE_ENABLED,
        },
        storage: {
          s3Enabled: S3_ENABLED,
        },
        authProviders: {
          github: GITHUB_OAUTH_ENABLED,
          google: GOOGLE_OAUTH_ENABLED,
        },
        signup: {
          signupsDisabled: DISABLE_SIGNUPS,
        },
        email: {
          trackingToggleEnabled: TRACKING_TOGGLE_ENABLED,
        },
        sponsor: {
          enabled: SHOW_SPONSOR,
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
      aws: {
        sesRegion: AWS_SES_REGION,
        mailFromSubdomain: MAIL_FROM_SUBDOMAIN,
      },
    });
  }
}
