export const Keys = {
  User: {
    id(id: string): string {
      return `account:id:${id}`;
    },
    email(email: string): string {
      return `account:${email}`;
    },
    projects(id: string): string {
      return `account:${id}:projects`;
    },
  },
  Project: {
    id(id: string): string {
      return `project:id:${id}`;
    },
    secret(secretKey: string): string {
      return `project:secret:${secretKey}`;
    },
    public(publicKey: string): string {
      return `project:public:${publicKey}`;
    },
    memberships(id: string): string {
      return `project:${id}:memberships`;
    },
    usage(id: string): string {
      return `project:${id}:usage`;
    },
    events(id: string, triggers: boolean): string {
      if (triggers) {
        return `project:${id}:events:triggers`;
      }

      return `project:${id}:events`;
    },
    metadata(id: string): string {
      return `project:${id}:metadata`;
    },
    actions(id: string): string {
      return `project:${id}:actions`;
    },
    templates(id: string): string {
      return `project:${id}:templates`;
    },
    feed(id: string): string {
      return `project:${id}:feed`;
    },
    contacts(
      id: string,
      options?: {
        page?: number;
        count?: boolean;
      },
    ): string {
      if (options?.count) {
        return `project:${id}:contacts:count`;
      }

      if (options?.page) {
        return `project:${id}:contacts:page:${options.page}`;
      }

      return `project:${id}:contacts`;
    },
    campaigns(id: string): string {
      return `project:${id}:campaigns`;
    },
    analytics(id: string): string {
      return `project:${id}:analytics`;
    },
    emails(
      id: string,
      options?: {
        count?: boolean;
      },
    ): string {
      if (options?.count) {
        return `project:${id}:emails:count`;
      }

      return `project:${id}:emails`;
    },
  },
  ProjectMembership: {
    isMember(projectId: string, accountId: string) {
      return `project:id:${projectId}:ismember:${accountId}`;
    },
    isAdmin(projectId: string, accountId: string) {
      return `project:id:${projectId}:isadmin:${accountId}`;
    },
    isOwner(projectId: string, accountId: string) {
      return `project:id:${projectId}:isowner:${accountId}`;
    },
  },
  Campaign: {
    id(id: string): string {
      return `campaign:id:${id}`;
    },
  },
  Template: {
    id(id: string): string {
      return `template:id:${id}`;
    },
    actions(templateId: string): string {
      return `template:id:${templateId}:actions`;
    },
  },
  Webhook: {
    id(id: string): string {
      return `webhook:id:${id}`;
    },
  },
  Contact: {
    id(id: string): string {
      return `contact:id:${id}`;
    },
    email(projectId: string, email: string): string {
      return `project:id:${projectId}:contact:email:${email}`;
    },
  },
  Action: {
    id(id: string): string {
      return `action:id:${id}`;
    },
    related(id: string): string {
      return `action:id:${id}:related`;
    },
    event(eventId: string): string {
      return `action:event:id:${eventId}`;
    },
  },
  Event: {
    id(id: string): string {
      return `event:id:${id}`;
    },
    event(projectId: string, name: string): string {
      return `project:id:${projectId}:event:name:${name}`;
    },
  },
};
