import {Keys} from './keys';
import {wrapRedis} from './redis';
import {prisma} from '../database/prisma';

export class CampaignService {
  public static id(id: string) {
    return wrapRedis(Keys.Campaign.id(id), async () => {
      return prisma.campaign.findUnique({
        where: {id},
        include: {
          recipients: {select: {id: true}},
          emails: {select: {id: true, status: true, contact: {select: {id: true, email: true}}}},
        },
      });
    });
  }
}
