import {EmailSourceType} from '@plunk/db';
import {describe, expect, it} from 'vitest';

import {DASHBOARD_URI} from '../../app/constants';
import {bodyHasListManagementLink, buildEmailHeaders, classifyEmail} from '../EmailHeaderService';

describe('bodyHasListManagementLink', () => {
  it('detects an unsubscribe link for the contact', () => {
    expect(bodyHasListManagementLink('<a href="https://app.test/unsubscribe/contact-123">out</a>', 'contact-123')).toBe(
      true,
    );
  });

  it('detects a manage (preference center) link for the contact', () => {
    expect(bodyHasListManagementLink('<a href="https://app.test/manage/contact-123">prefs</a>', 'contact-123')).toBe(
      true,
    );
  });

  it('returns false when the body has no opt-out link', () => {
    expect(bodyHasListManagementLink('<p>Your receipt</p>', 'contact-123')).toBe(false);
  });

  it('does not match a link belonging to a different contact', () => {
    expect(bodyHasListManagementLink('<a href="https://app.test/unsubscribe/other">x</a>', 'contact-123')).toBe(false);
  });
});

describe('classifyEmail', () => {
  it('classifies non-transactional sources as marketing', () => {
    expect(classifyEmail({sourceType: EmailSourceType.CAMPAIGN})).toBe('marketing');
    expect(classifyEmail({sourceType: EmailSourceType.WORKFLOW})).toBe('marketing');
  });

  it('classifies a transactional source as transactional', () => {
    expect(classifyEmail({sourceType: EmailSourceType.TRANSACTIONAL})).toBe('transactional');
  });

  it('classifies HEADLESS template or campaign as headless, regardless of source', () => {
    expect(classifyEmail({sourceType: EmailSourceType.CAMPAIGN, campaignType: 'HEADLESS'})).toBe('headless');
    expect(classifyEmail({sourceType: EmailSourceType.WORKFLOW, templateType: 'HEADLESS'})).toBe('headless');
    // HEADLESS wins even when the source is transactional.
    expect(classifyEmail({sourceType: EmailSourceType.TRANSACTIONAL, templateType: 'HEADLESS'})).toBe('headless');
  });

  it('treats a MARKETING template as marketing', () => {
    expect(classifyEmail({sourceType: EmailSourceType.CAMPAIGN, campaignType: 'MARKETING'})).toBe('marketing');
  });
});

describe('buildEmailHeaders', () => {
  describe('marketing sends', () => {
    it('emits the full bulk-mail header set when an unsubscribe id is provided', () => {
      const headers = buildEmailHeaders({emailClass: 'marketing', unsubscribeId: 'contact-123'});

      expect(headers).toEqual({
        'List-Unsubscribe': `<${DASHBOARD_URI}/unsubscribe/contact-123>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        Precedence: 'bulk',
        'Auto-Submitted': 'auto-generated',
        'X-Auto-Response-Suppress': 'All',
      });
    });

    it('omits the List-Unsubscribe pair when there is no unsubscribe id, keeping the suppression headers', () => {
      const headers = buildEmailHeaders({emailClass: 'marketing'});

      expect(headers).toEqual({
        Precedence: 'bulk',
        'Auto-Submitted': 'auto-generated',
        'X-Auto-Response-Suppress': 'All',
      });
      expect(headers).not.toHaveProperty('List-Unsubscribe');
      expect(headers).not.toHaveProperty('List-Unsubscribe-Post');
    });
  });

  describe('non-campaign transactional and headless sends', () => {
    it('adds no headers for a transactional 1:1 send', () => {
      expect(buildEmailHeaders({emailClass: 'transactional', unsubscribeId: 'contact-123'})).toEqual({});
    });

    it('adds no headers for a headless 1:1 send', () => {
      expect(buildEmailHeaders({emailClass: 'headless', unsubscribeId: 'contact-123'})).toEqual({});
    });

    it('passes caller headers through untouched for transactional sends', () => {
      const headers = buildEmailHeaders({
        emailClass: 'transactional',
        customHeaders: {'X-Custom': 'value'},
      });

      expect(headers).toEqual({'X-Custom': 'value'});
    });
  });

  describe('campaign broadcasts', () => {
    it('adds the bulk suppression headers to a transactional campaign, but no List-Unsubscribe', () => {
      const headers = buildEmailHeaders({
        emailClass: 'transactional',
        isCampaign: true,
        unsubscribeId: 'contact-123',
      });

      expect(headers).toEqual({
        Precedence: 'bulk',
        'Auto-Submitted': 'auto-generated',
        'X-Auto-Response-Suppress': 'All',
      });
      expect(headers).not.toHaveProperty('List-Unsubscribe');
    });

    it('adds the bulk suppression headers to a headless campaign, but no List-Unsubscribe', () => {
      const headers = buildEmailHeaders({emailClass: 'headless', isCampaign: true});

      expect(headers).toEqual({
        Precedence: 'bulk',
        'Auto-Submitted': 'auto-generated',
        'X-Auto-Response-Suppress': 'All',
      });
      expect(headers).not.toHaveProperty('List-Unsubscribe');
    });

    it('gives a marketing campaign the full set (unsubscribe + suppression)', () => {
      const headers = buildEmailHeaders({
        emailClass: 'marketing',
        isCampaign: true,
        unsubscribeId: 'contact-123',
      });

      expect(headers).toEqual({
        'List-Unsubscribe': `<${DASHBOARD_URI}/unsubscribe/contact-123>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        Precedence: 'bulk',
        'Auto-Submitted': 'auto-generated',
        'X-Auto-Response-Suppress': 'All',
      });
    });
  });

  describe('body-embedded opt-out links (any class)', () => {
    it('adds the List-Unsubscribe pair to a transactional send whose body has an opt-out link', () => {
      const headers = buildEmailHeaders({
        emailClass: 'transactional',
        hasListManagementLink: true,
        unsubscribeId: 'contact-123',
      });

      expect(headers['List-Unsubscribe']).toBe(`<${DASHBOARD_URI}/unsubscribe/contact-123>`);
      expect(headers['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click');
      // A 1:1 transactional send is not bulk, so no suppression headers.
      expect(headers).not.toHaveProperty('Precedence');
    });

    it('adds the List-Unsubscribe pair to a headless send whose body has an opt-out link', () => {
      const headers = buildEmailHeaders({
        emailClass: 'headless',
        hasListManagementLink: true,
        unsubscribeId: 'contact-123',
      });

      expect(headers['List-Unsubscribe']).toBe(`<${DASHBOARD_URI}/unsubscribe/contact-123>`);
      expect(headers['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click');
    });

    it('emits no pair when a link is present but no unsubscribe id is available', () => {
      const headers = buildEmailHeaders({emailClass: 'transactional', hasListManagementLink: true});

      expect(headers).not.toHaveProperty('List-Unsubscribe');
      expect(headers).not.toHaveProperty('List-Unsubscribe-Post');
    });
  });

  describe('non-campaign marketing sends (e.g. workflow automations)', () => {
    it('still gets the full set — marketing mail is bulk regardless of campaign membership', () => {
      const headers = buildEmailHeaders({
        emailClass: 'marketing',
        isCampaign: false,
        unsubscribeId: 'contact-123',
      });

      expect(headers).toEqual({
        'List-Unsubscribe': `<${DASHBOARD_URI}/unsubscribe/contact-123>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        Precedence: 'bulk',
        'Auto-Submitted': 'auto-generated',
        'X-Auto-Response-Suppress': 'All',
      });
    });
  });

  describe('custom header merging', () => {
    it('appends caller-only headers after the defaults', () => {
      const headers = buildEmailHeaders({
        emailClass: 'marketing',
        unsubscribeId: 'contact-123',
        customHeaders: {'X-Campaign-Id': 'abc'},
      });

      expect(headers['X-Campaign-Id']).toBe('abc');
      expect(headers.Precedence).toBe('bulk');
    });

    it('lets a caller header override a default of the same name', () => {
      const headers = buildEmailHeaders({
        emailClass: 'marketing',
        unsubscribeId: 'contact-123',
        customHeaders: {Precedence: 'list'},
      });

      expect(headers.Precedence).toBe('list');
    });

    it('overrides case-insensitively without emitting a duplicate header', () => {
      const headers = buildEmailHeaders({
        emailClass: 'marketing',
        unsubscribeId: 'contact-123',
        customHeaders: {'x-auto-response-suppress': 'OOF'},
      });

      // The caller's casing and value win, and the default key is gone.
      expect(headers['x-auto-response-suppress']).toBe('OOF');
      expect(headers).not.toHaveProperty('X-Auto-Response-Suppress');
      const suppressKeys = Object.keys(headers).filter(k => k.toLowerCase() === 'x-auto-response-suppress');
      expect(suppressKeys).toHaveLength(1);
    });
  });
});
