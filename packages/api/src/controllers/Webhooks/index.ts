import {ChildControllers, Controller} from '@overnightjs/core';
import {IncomingWebhooks} from './Incoming';

@Controller('webhooks')
@ChildControllers([new IncomingWebhooks()])
export class Webhooks {}
