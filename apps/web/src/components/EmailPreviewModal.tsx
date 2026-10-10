import {Dialog, DialogContent, DialogDescription, DialogTitle, cn} from '@plunk/ui';
import {useEffect, useRef, useState} from 'react';

import {wrapEmailWithStyles} from '../lib/emailStyles';
import {Segmented} from './Segmented';

interface EmailPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subject: string;
  body: string;
  from?: string;
  fromName?: string;
  replyTo?: string;
  toName?: string;
  toEmail?: string;
}

type PreviewDevice = 'desktop' | 'mobile';

const DEVICES = [
  {value: 'desktop', label: 'Desktop'},
  {value: 'mobile', label: 'Mobile'},
] as const;

/**
 * Shows a sent email the way a recipient's mail client would: subject, sender and
 * recipient on top, the rendered body below at its full height.
 */
export function EmailPreviewModal({
  open,
  onOpenChange,
  subject,
  body,
  from,
  fromName,
  replyTo,
  toName,
  toEmail,
}: EmailPreviewModalProps) {
  const [device, setDevice] = useState<PreviewDevice>('desktop');
  const mobile = device === 'mobile';

  const sender = fromName || from || 'Unknown sender';
  const recipient = toName && toEmail ? `${toName} <${toEmail}>` : toName || toEmail;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[90vh] max-w-5xl flex-col gap-0 overflow-hidden p-0">
        <div className="flex min-h-16 shrink-0 items-center justify-between gap-4 border-b border-neutral-200 py-3 pl-5 pr-14">
          <div className="min-w-0">
            <DialogTitle className="text-sm font-medium">Email preview</DialogTitle>
            <DialogDescription className="sr-only">
              How this email looks to the person who received it
            </DialogDescription>
          </div>
          <Segmented label="Preview width" value={device} options={DEVICES} onChange={setDevice} />
        </div>

        <div className="flex-1 overflow-y-auto bg-neutral-100 px-4 py-6 sm:px-8 sm:py-8">
          <article
            className={cn(
              'mx-auto overflow-hidden border border-neutral-200 bg-white shadow-sm transition-[max-width] duration-200 ease-out motion-reduce:transition-none',
              mobile ? 'max-w-[390px] rounded-[28px]' : 'max-w-3xl rounded-xl',
            )}
          >
            <header className={cn('border-b border-neutral-100', mobile ? 'px-5 pt-6 pb-4' : 'px-8 pt-7 pb-5')}>
              <h2
                className={cn(
                  'font-semibold tracking-tight text-neutral-900 [text-wrap:balance]',
                  mobile ? 'text-lg leading-snug' : 'text-xl leading-snug',
                )}
              >
                {subject}
              </h2>

              <div className="mt-4 flex items-start gap-3">
                <span
                  aria-hidden
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-sm font-medium text-white"
                >
                  {sender.trim().charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 text-sm">
                  <p className="truncate">
                    <span className="font-medium text-neutral-900">{sender}</span>
                    {fromName && from && <span className="text-neutral-500">{` <${from}>`}</span>}
                  </p>
                  {recipient && <p className="truncate text-xs text-neutral-500">to {recipient}</p>}
                  {replyTo && replyTo !== from && (
                    <p className="truncate text-xs text-neutral-500">replies go to {replyTo}</p>
                  )}
                </div>
              </div>
            </header>

            <EmailBody html={body} />
          </article>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * The email itself, in a sandboxed frame that grows to fit its content, so the dialog has
 * one scrollbar instead of a box scrolling inside a box. Scripts never run; links open in
 * a new tab rather than trying to load inside the preview.
 */
function EmailBody({html}: {html: string}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(320);
  const [loaded, setLoaded] = useState(false);

  const srcDoc = withNewTabLinks(wrapEmailWithStyles(html));

  useEffect(() => {
    const iframe = frame.current;
    if (!iframe) return;

    let observer: ResizeObserver | undefined;

    // The frame is same-origin (no scripts), so the page can measure it. Watching for
    // resizes catches images that load after the frame does and reflow at a new width.
    const attach = () => {
      const doc = iframe.contentDocument;
      if (!doc?.documentElement) return;
      // The rendered height of the document, not scrollHeight: scrollHeight never reports
      // less than the frame itself, so the frame could grow but never shrink back when the
      // email reflows shorter at a wider or narrower width.
      const measure = () => setHeight(Math.ceil(doc.documentElement.getBoundingClientRect().height));
      measure();
      setLoaded(true);
      observer?.disconnect();
      observer = new ResizeObserver(measure);
      observer.observe(doc.documentElement);
      if (doc.body) observer.observe(doc.body);
    };

    iframe.addEventListener('load', attach);
    if (iframe.contentDocument?.readyState === 'complete') attach();

    return () => {
      iframe.removeEventListener('load', attach);
      observer?.disconnect();
    };
  }, [srcDoc]);

  return (
    <iframe
      ref={frame}
      title="Email content"
      sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
      srcDoc={srcDoc}
      className={cn('block w-full border-0 transition-opacity duration-150', loaded ? 'opacity-100' : 'opacity-0')}
      style={{height}}
    />
  );
}

function withNewTabLinks(document: string): string {
  const base = '<base target="_blank">';
  return /<head[^>]*>/i.test(document)
    ? document.replace(/<head[^>]*>/i, match => `${match}${base}`)
    : `${base}${document}`;
}
