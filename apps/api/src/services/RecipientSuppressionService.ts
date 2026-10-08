import {z} from 'zod';

import {prisma} from '../database/prisma.js';
import {HttpException} from '../exceptions/index.js';

export const suppressionRuleSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    kind: z.enum(['ADDRESS', 'DOMAIN', 'PREFIX', 'SUFFIX', 'WILDCARD']),
    pattern: z.string().trim().toLowerCase().min(1).max(254),
    enabled: z.boolean().default(true),
  })
  .strict()
  .superRefine((rule, ctx) => {
    const valid =
      rule.kind === 'ADDRESS'
        ? z.string().email().safeParse(rule.pattern).success
        : rule.kind === 'DOMAIN'
          ? /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}$/.test(rule.pattern)
          : rule.kind === 'WILDCARD'
            ? /^[a-z0-9.!#$%&'*+/=?^_`{|}~@-]+$/.test(rule.pattern) && rule.pattern.includes('@')
            : /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(rule.pattern);
    if (!valid)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['pattern'],
        message:
          'Invalid pattern for this rule type. Wildcards use * and ? against the whole address; regular expressions are not supported.',
      });
  });

type Rule = {id: string; name: string; kind: string; pattern: string; enabled: boolean};

// Bounded dynamic programming, O(address length × pattern length). No user regex execution.
function wildcard(pattern: string, address: string): boolean {
  let previous = Array<boolean>(address.length + 1).fill(false);
  previous[0] = true;
  for (const token of pattern) {
    const current = Array<boolean>(address.length + 1).fill(false);
    current[0] = token === '*' && previous[0]!;
    for (let i = 1; i <= address.length; i++) {
      current[i] =
        token === '*'
          ? previous[i]! || current[i - 1]!
          : previous[i - 1]! && (token === '?' || token === address[i - 1]);
    }
    previous = current;
  }
  return previous[address.length]!;
}

export function matchesRecipient(rule: Rule, recipient: string): boolean {
  if (!rule.enabled || recipient.length > 254) return false;
  const address = recipient.trim().toLowerCase();
  const at = address.lastIndexOf('@');
  if (at < 1) throw new Error('Invalid recipient address');
  const local = address.slice(0, at);
  switch (rule.kind) {
    case 'ADDRESS':
      return address === rule.pattern;
    case 'DOMAIN':
      return address.slice(at + 1) === rule.pattern;
    case 'PREFIX':
      return local.startsWith(rule.pattern);
    case 'SUFFIX':
      return local.endsWith(rule.pattern);
    case 'WILDCARD':
      return wildcard(rule.pattern, address);
    default:
      throw new Error('Unknown suppression rule type');
  }
}

export class RecipientSuppressionService {
  static async match(projectId: string, recipient: string) {
    const rules = await prisma.recipientSuppressionRule.findMany({
      where: {projectId, enabled: true},
      orderBy: [{createdAt: 'asc'}, {id: 'asc'}],
    });
    const rule = rules.find(rule => matchesRecipient(rule, recipient));
    return rule
      ? {
          ruleId: rule.id,
          name: rule.name,
          kind: rule.kind,
          pattern: rule.pattern,
          recipient,
          matchedAt: new Date().toISOString(),
        }
      : undefined;
  }

  static async snapshot(projectId: string, contactId: string, headers?: Record<string, string>, override?: string) {
    const contact = await prisma.contact.findFirst({where: {id: contactId, projectId}, select: {email: true}});
    if (!contact) throw new HttpException(404, 'Contact not found');
    const recipientAddress = override || headers?.['X-Plunk-Recipient-Override'] || contact.email;
    z.string().email().max(254).parse(recipientAddress);
    const suppression = await this.match(projectId, recipientAddress);
    return {recipientAddress, ...(suppression ? {suppression} : {})};
  }
}
