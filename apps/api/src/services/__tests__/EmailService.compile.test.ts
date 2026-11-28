import {describe, expect, it} from 'vitest';

import {EmailService} from '../EmailService';
import {factories} from '../../../../../test/helpers';

/**
 * The visual editor serialises a centred or right-aligned image as a paragraph wrapping the
 * <img>, with inline margins (apps/web/src/components/EmailEditor/ResizableImage.tsx; the same
 * markup is pinned in its __tests__/ResizableImage.test.ts). That markup has to count as
 * visual-editor content here too, so the email is sent inside the same styled wrapper the
 * editor previews it in, with the alignment styles untouched.
 */
describe('EmailService.compile — aligned images from the visual editor', () => {
  it.each([
    [
      'centred',
      '<p style="text-align: center;"><img src="https://example.com/logo.png" width="300" height="200" class="email-image" style="display: block; margin-left: auto; margin-right: auto;"></p>',
    ],
    [
      'right-aligned',
      '<p style="text-align: right;"><img src="https://example.com/logo.png" width="300" height="200" class="email-image" style="display: block; margin-left: auto; margin-right: 0px;"></p>',
    ],
  ])('sends a %s image inside the styled wrapper, unchanged', async (_label, image) => {
    const {project} = await factories.createUserWithProject();
    const contact = await factories.createContact({projectId: project.id});

    const html = EmailService.compile({content: `<p>Hello</p>${image}`, contact, project, includeUnsubscribe: false});

    expect(html).toContain('<div class="prose prose-sm max-w-none">');
    expect(html).toContain(image);
  });
});
