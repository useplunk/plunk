import {Button, Dialog, DialogContent, DialogHeader, DialogTitle} from '@plunk/ui';
import {Monitor, Smartphone, Tablet} from 'lucide-react';
import {useState} from 'react';
import {wrapEmailWithStyles} from '../lib/emailStyles';

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

type PreviewDevice = 'mobile' | 'tablet' | 'desktop';

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
  const [previewDevice, setPreviewDevice] = useState<PreviewDevice>('desktop');

  const getPreviewContainerWidth = () => {
    switch (previewDevice) {
      case 'mobile':
        return '375px';
      case 'tablet':
        return '768px';
      case 'desktop':
        return '100%';
    }
  };

  const getDeviceLabel = () => {
    switch (previewDevice) {
      case 'mobile':
        return '375px';
      case 'tablet':
        return '768px';
      case 'desktop':
        return '1200px';
    }
  };

  const displayFrom = fromName ? `${fromName} <${from}>` : from;

  // Wrap the body with styles for proper rendering
  const styledBody = wrapEmailWithStyles(body);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0">
          <DialogTitle className="pr-8">Email preview</DialogTitle>
        </DialogHeader>

        {/* Device Selector */}
        <div className="border-t border-b border-neutral-200 bg-neutral-100 px-6 py-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <p className="text-xs font-medium text-neutral-600">Preview</p>
              <span className="text-xs text-neutral-500">({getDeviceLabel()})</span>
            </div>
            <div className="flex gap-1">
              <Button
                type="button"
                variant={previewDevice === 'mobile' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setPreviewDevice('mobile')}
                className="h-7 w-7 p-0"
                title="Mobile (375px)"
              >
                <Smartphone className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant={previewDevice === 'tablet' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setPreviewDevice('tablet')}
                className="h-7 w-7 p-0"
                title="Tablet (768px)"
              >
                <Tablet className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant={previewDevice === 'desktop' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setPreviewDevice('desktop')}
                className="h-7 w-7 p-0"
                title="Desktop (1200px)"
              >
                <Monitor className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Preview Area - Single scroll container */}
        <div className="flex-1 overflow-y-auto bg-neutral-50">
          <div className="p-6 flex justify-center items-start min-h-full">
            <div
              className="transition-all duration-300"
              style={{
                width: getPreviewContainerWidth(),
                maxWidth: '100%',
              }}
            >
              <div className="bg-white rounded-lg border border-neutral-300 shadow-lg overflow-hidden">
                {/* Email Header Preview */}
                <div className="bg-neutral-50 border-b border-neutral-200 p-4 space-y-2">
                  {/* To Section */}
                  {(toName || toEmail) && (
                    <div>
                      <p className="text-xs text-neutral-500 uppercase tracking-wide font-medium">To</p>
                      <p className="text-sm text-neutral-900 mt-1">
                        {toName && toEmail ? `${toName} <${toEmail}>` : toName || toEmail}
                      </p>
                    </div>
                  )}

                  {/* Subject Section */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-xs text-neutral-500 uppercase tracking-wide font-medium">Subject</p>
                      <p className="text-base font-semibold text-neutral-900 mt-1">{subject}</p>
                    </div>
                  </div>

                  {/* From and Reply-To Section */}
                  {(from || replyTo) && (
                    <div className="flex gap-6 pt-2 border-t border-neutral-200">
                      {from && (
                        <div>
                          <p className="text-xs text-neutral-500">From</p>
                          <p className="text-sm text-neutral-900 mt-0.5">{displayFrom}</p>
                        </div>
                      )}
                      {replyTo && (
                        <div>
                          <p className="text-xs text-neutral-500">Reply-To</p>
                          <p className="text-sm text-neutral-900 mt-0.5">{replyTo}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Email Body */}
                <div className="bg-white">
                  <iframe
                    sandbox="allow-same-origin"
                    srcDoc={styledBody}
                    className="w-full border-0 block"
                    style={{minHeight: '500px'}}
                    title="Email preview"
                    loading="lazy"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
