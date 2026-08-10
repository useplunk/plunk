import {beforeEach, describe, expect, it} from 'vitest';

import {clearTemplateCache, compileTemplate, renderTemplate} from '../../packages/shared/src/template/index';

/**
 * Performance Tests: Liquid template rendering
 *
 * Templates are rendered once per recipient, so template rendering sits directly on
 * the campaign send path — a campaign to 1M contacts renders 2M templates (subject +
 * body). CPU cost is therefore the main risk of using a real templating language
 * instead of string interpolation, and these tests pin the throughput floor so that
 * risk cannot quietly materialise later.
 *
 * Measured on a developer machine (logged by every run, so regressions show as a trend
 * rather than only as a failure):
 *
 * | Scenario                                            | Result          |
 * | --------------------------------------------------- | --------------- |
 * | Small template, parse hoisted                       | ~142k renders/s |
 * | Realistic campaign body (loop + filters + branches) | ~18k renders/s  |
 * | Same body via renderTemplate (parse from cache)     | ~0.05 ms/render |
 * | Parsing a 100 KB template                           | ~15 ms (once)   |
 * | Full 500-recipient batch, subject + body            | ~30 ms          |
 * | Heap retained by 3000 distinct templates            | ~6 MB           |
 * | Heap retained by 50k renders of one template        | ~0 MB           |
 *
 * At ~0.05 ms/render a 1M-contact campaign spends under a minute of CPU on rendering,
 * which is negligible next to 1M SES calls.
 *
 * Performance Targets:
 * - Rendering must never dominate the per-email cost (network + SES call): < 1ms/email
 * - Parsing must be hoisted or cached, never repeated per recipient
 * - Memory must stay flat regardless of how many distinct templates are rendered
 */
describe('Performance: Template Rendering at Scale', () => {
  /**
   * The raw throughput floors are calibrated on a developer machine, where a shared CI
   * runner measures 3.5–4.5× slower on identical code: it has a fraction of the cores,
   * and vitest schedules this file alongside the DB-heavy suites, so the benchmark loop
   * only ever gets part of one of them. Left unscaled, the floors fail on CI for reasons
   * that have nothing to do with the code under test.
   *
   * Lowering them for everyone would fix that but stop them catching anything on real
   * hardware, so scale by environment instead. A developer still has to hit the full
   * number; on CI the same assertions become a catastrophic-regression backstop, which
   * is all they can honestly be there — losing the parse cache or reintroducing a
   * per-render compile costs far more than 6×.
   *
   * The margin is wide: a CI run that failed the unscaled floors still measured 41.7k
   * and 4.2k renders/s, roughly 5× above the scaled ones.
   */
  const CI_SLOWDOWN = process.env.CI ? 6 : 1;

  /**
   * heapUsed counts garbage the collector has not reached yet, and rendering produces
   * a lot of it — sampling it raw measures GC timing rather than retained memory. The
   * 50k-render loop below reads +26 MB on a developer machine and +53 MB on CI while
   * actually retaining nothing. Forcing a collection first makes the number mean
   * "still reachable", which is the only version of it that can catch a leak.
   *
   * global.gc comes from `execArgv: ['--expose-gc']` in vitest.config.ts.
   */
  const forceGc = (globalThis as {gc?: () => void}).gc;

  function retainedHeapMB(): number {
    if (!forceGc) {
      throw new Error('These assertions need global.gc — run through vitest.config.ts, which sets --expose-gc.');
    }
    // Twice: the first pass can leave objects queued for the following cycle.
    forceGc();
    forceGc();
    return process.memoryUsage().heapUsed / 1024 / 1024;
  }
  /** A realistic marketing email: conditionals, a loop, filters and fallbacks. */
  const CAMPAIGN_TEMPLATE = `<!doctype html>
<html lang="{{locale ?? en}}">
  <body style="margin: 0; font-family: Arial, sans-serif;">
    <main style="max-width: 600px; margin: 0 auto; padding: 32px;">
      {% if locale == 'es' %}
        <h1>Hola {{firstName ?? cliente}}</h1>
      {% elsif locale == 'fr' %}
        <h1>Bonjour {{firstName ?? client}}</h1>
      {% else %}
        <h1>Hi {{firstName ?? there}}</h1>
      {% endif %}

      <p>You have been on the <strong>{{plan | upcase}}</strong> plan since {{signupDate | date: "%B %Y"}}.</p>

      {% assign discount = ltv | divided_by: 20 %}
      {% if discount > 25 %}{% assign discount = 25 %}{% endif %}
      <p>Here is {{discount}}% off your next renewal.</p>

      <ul>
        {% for product in products %}
          <li>{{forloop.index}}. {{product.name}} — \${{product.price | times: 1.0 | round: 2}}</li>
        {% endfor %}
      </ul>

      <a href="{{unsubscribeUrl}}">Unsubscribe</a>
    </main>
  </body>
</html>`;

  const contactVariables = (index: number) => ({
    id: `contact-${index}`,
    email: `contact${index}@example.com`,
    firstName: index % 3 === 0 ? '' : `Contact ${index}`,
    locale: ['en', 'es', 'fr'][index % 3],
    plan: index % 2 === 0 ? 'pro' : 'free',
    ltv: index % 1000,
    signupDate: '2026-05-06T12:00:00Z',
    products: [
      {name: 'Starter', price: 9.99},
      {name: 'Team', price: 29.99},
    ],
    unsubscribeUrl: `https://example.com/unsubscribe/${index}`,
  });

  beforeEach(() => {
    clearTemplateCache();
  });

  // ========================================
  // THROUGHPUT
  // ========================================
  describe('Render throughput', () => {
    it('renders a minimal template with the parse hoisted at the expected throughput', () => {
      // A deliberately small template — one variable, one filter, one conditional —
      // parsed once outside the loop, so this measures render cost with parse cost
      // removed. Kept separate from the realistic template below so the headline
      // number stays comparable across changes rather than moving whenever the
      // example campaign body is edited.
      const ITERATIONS = 50_000;
      const compiled = compileTemplate(
        `<p>Hello {{ recipient.name }},</p>
         <p>This is render number <strong>{{ i }}</strong>.</p>
         {% assign remainder = i | modulo: 2 %}
         {% if remainder == 0 %}<p>{{ i }} is even.</p>{% else %}<p>{{ i }} is odd.</p>{% endif %}`,
      );

      const startTime = performance.now();
      for (let i = 0; i < ITERATIONS; i += 1) {
        compiled.render({i, recipient: {name: `My Name ${i}`}});
      }
      const duration = performance.now() - startTime;

      const rendersPerSecond = (ITERATIONS / duration) * 1000;
      const floor = 50_000 / CI_SLOWDOWN;
      console.log(
        `[PERF] minimal template, parse hoisted: ${Math.round(rendersPerSecond).toLocaleString()} renders/s ` +
          `(floor ${Math.round(floor).toLocaleString()})`,
      );

      expect(rendersPerSecond).toBeGreaterThan(floor);
    }, 60000);

    it('renders a realistic campaign body at the expected throughput', () => {
      const ITERATIONS = 20_000;
      const compiled = compileTemplate(CAMPAIGN_TEMPLATE);
      expect(compiled.valid).toBe(true);

      const startTime = performance.now();
      let characters = 0;
      for (let i = 0; i < ITERATIONS; i += 1) {
        characters += compiled.render(contactVariables(i)).length;
      }
      const duration = performance.now() - startTime;

      const rendersPerSecond = (ITERATIONS / duration) * 1000;
      const floor = 5_000 / CI_SLOWDOWN;
      console.log(
        `[PERF] compiled render: ${Math.round(rendersPerSecond).toLocaleString()} renders/s ` +
          `(${(duration / ITERATIONS).toFixed(4)} ms/render, ${characters.toLocaleString()} chars, ` +
          `floor ${Math.round(floor).toLocaleString()})`,
      );

      expect(characters).toBeGreaterThan(0);
      expect(rendersPerSecond).toBeGreaterThan(floor);
    }, 60000);

    it('keeps renderTemplate within 1ms/email by caching the parse', () => {
      // This is the path every individual send takes (EmailService.format), where the
      // caller has no compiled template to hand — the parse must come from the cache.
      // Deliberately not scaled by CI_SLOWDOWN: 1ms/email is a product budget rather
      // than a machine measurement, and the loaded runner still comes in at ~0.23ms.
      const ITERATIONS = 10_000;

      const startTime = performance.now();
      for (let i = 0; i < ITERATIONS; i += 1) {
        renderTemplate(CAMPAIGN_TEMPLATE, contactVariables(i));
      }
      const duration = performance.now() - startTime;

      const msPerRender = duration / ITERATIONS;
      console.log(`[PERF] renderTemplate: ${msPerRender.toFixed(4)} ms/render`);

      expect(msPerRender).toBeLessThan(1);
    }, 60000);

    it('parses a 100KB template without stalling the first email of a batch', () => {
      // Parsing happens once per template, so it only needs to be cheap enough not to
      // stall the first email of a batch. Pure CPU, so it scales with the runner.
      const large = CAMPAIGN_TEMPLATE.repeat(Math.ceil(100_000 / CAMPAIGN_TEMPLATE.length));
      const budget = 100 * CI_SLOWDOWN;

      const startTime = performance.now();
      const compiled = compileTemplate(large);
      const duration = performance.now() - startTime;

      console.log(
        `[PERF] parse ${(large.length / 1024).toFixed(0)}KB template: ${duration.toFixed(2)} ms (budget ${budget} ms)`,
      );

      expect(compiled.valid).toBe(true);
      expect(duration).toBeLessThan(budget);
    }, 60000);
  });

  // ========================================
  // CAMPAIGN BATCH BUDGET
  // ========================================
  describe('Campaign batch', () => {
    it('renders a 500-recipient batch (subject + body) in under 500ms', () => {
      // CampaignService.processBatch handles BATCH_SIZE = 500 contacts per job and
      // renders both the subject and the body for each one. Like the 1ms/email budget
      // this is a product target, so it is not scaled — the loaded runner spends ~140ms.
      const BATCH_SIZE = 500;
      const subject = compileTemplate('{% if locale == "es" %}Tu oferta{% else %}Your offer{% endif %}, {{firstName ?? there}}');
      const body = compileTemplate(CAMPAIGN_TEMPLATE);

      const startTime = performance.now();
      for (let i = 0; i < BATCH_SIZE; i += 1) {
        const variables = contactVariables(i);
        subject.render(variables);
        body.render(variables);
      }
      const duration = performance.now() - startTime;

      console.log(`[PERF] 500-recipient batch: ${duration.toFixed(2)} ms`);

      expect(duration).toBeLessThan(500);
    }, 60000);

    it('produces per-recipient output rather than a shared render', () => {
      const compiled = compileTemplate(CAMPAIGN_TEMPLATE);
      const rendered = new Set<string>();

      for (let i = 0; i < 100; i += 1) {
        rendered.add(compiled.render(contactVariables(i)));
      }

      // 100 contacts vary by name, locale, plan and ltv — none should collide.
      expect(rendered.size).toBe(100);
    });
  });

  // ========================================
  // MEMORY
  // ========================================
  describe('Memory', () => {
    it('keeps the parse cache bounded across many distinct templates', () => {
      // A worker sees templates from every project it serves. The cache is capped, so
      // cycling through far more templates than it holds must not accumulate ASTs.
      //
      // The count is what gives this assertion its teeth: retaining all 3000 ASTs costs
      // ~90 MB, while the capped cache settles at ~6 MB — most of which is the 3000
      // source strings below being flattened as they are used as cache keys, not ASTs.
      const TEMPLATE_COUNT = 3_000;
      const templates = Array.from(
        {length: TEMPLATE_COUNT},
        (_, i) => `${CAMPAIGN_TEMPLATE}<!-- project ${i} -->{{firstName ?? there}}`,
      );

      const initialMemory = retainedHeapMB();

      for (const template of templates) {
        renderTemplate(template, contactVariables(1));
      }

      const memoryIncrease = retainedHeapMB() - initialMemory;
      console.log(
        `[PERF] ${TEMPLATE_COUNT.toLocaleString()} distinct templates: +${memoryIncrease.toFixed(1)} MB retained`,
      );

      expect(memoryIncrease).toBeLessThan(25);
    }, 60000);

    it('does not grow the heap while rendering one template repeatedly', () => {
      const compiled = compileTemplate(CAMPAIGN_TEMPLATE);

      // Warm up so lazily-allocated internals are not counted as growth.
      for (let i = 0; i < 1_000; i += 1) {
        compiled.render(contactVariables(i));
      }

      const initialMemory = retainedHeapMB();
      for (let i = 0; i < 50_000; i += 1) {
        compiled.render(contactVariables(i));
      }
      const memoryIncrease = retainedHeapMB() - initialMemory;

      console.log(`[PERF] 50k renders: +${memoryIncrease.toFixed(1)} MB retained`);

      // Nothing survives a render, so this measures ~0 MB. Anything that accumulated
      // per-render state would show up long before 10 MB across 50k iterations.
      expect(memoryIncrease).toBeLessThan(10);
    }, 60000);
  });
});
