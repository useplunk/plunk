import {ChildControllers, Controller} from '@overnightjs/core';
import {SNSWebhook} from './SNS';

@Controller('incoming')
@ChildControllers([new SNSWebhook()])
export class IncomingWebhooks {}
