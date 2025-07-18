import {prisma} from '../database/prisma';
import {REDIS_ONE_MINUTE, wrapRedis} from './redis';
import {Keys} from './keys';

export class EventService {
  public static id(id: string) {
    return wrapRedis(
      Keys.Event.id(id),
      () => {
        return prisma.event.findUnique({where: {id}});
      },
      REDIS_ONE_MINUTE * 1440,
    );
  }

  public static event(projectId: string, name: string) {
    return wrapRedis(
      Keys.Event.event(projectId, name),
      () => {
        return prisma.event.findFirst({where: {projectId, name}});
      },
      REDIS_ONE_MINUTE * 1440,
    );
  }
}
