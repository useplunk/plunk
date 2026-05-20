import {Controller, Post} from '@overnightjs/core';
import type {Request, Response} from 'express';

import {CatchAsync} from '../utils/asyncHandler.js';
import {Webhooks} from './Webhooks.js';

/**
 * Compatibility aliases for deployments that expose the API under /api.
 */
@Controller('api/webhooks')
export class ApiPrefixedWebhooks extends Webhooks {
  @Post('sns')
  @CatchAsync
  public async receiveSNSWebhook(req: Request, res: Response) {
    return this.handleSNSWebhook(req, res);
  }

  @Post('incoming/sns')
  @CatchAsync
  public async receiveIncomingSNSWebhook(req: Request, res: Response) {
    return this.handleSNSWebhook(req, res);
  }
}
