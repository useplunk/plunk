import {Keys} from './keys';
import {wrapRedis} from './redis';
import {prisma} from '../database/prisma';

export class ContactService {
  public static id(id: string) {
    return wrapRedis(Keys.Contact.id(id), async () => {
      return prisma.contact.findUnique({
        where: {id},
        include: {triggers: {include: {event: true, action: true}}, emails: {where: {subject: {not: null}}}},
      });
    });
  }

  public static email(projectId: string, email: string) {
    return wrapRedis(Keys.Contact.email(projectId, email), () => {
      return prisma.contact.findFirst({where: {projectId, email}});
    });
  }

  public static async triggers(id: string) {
    return prisma.contact.findUniqueOrThrow({where: {id}}).triggers();
  }
}
