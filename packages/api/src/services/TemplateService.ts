import {wrapRedis} from './redis';
import {prisma} from '../database/prisma';
import {Keys} from './keys';

export class TemplateService {
  public static id(id: string) {
    return wrapRedis(Keys.Template.id(id), async () => {
      return prisma.template.findUnique({where: {id}, include: {actions: true}});
    });
  }

  public static actions(templateId: string) {
    return wrapRedis(Keys.Template.actions(templateId), async () => {
      return prisma.template.findUnique({where: {id: templateId}}).actions();
    });
  }
}
