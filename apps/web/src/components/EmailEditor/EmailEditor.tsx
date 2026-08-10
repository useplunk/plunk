/* eslint-disable @typescript-eslint/no-explicit-any */
import {EditorContent, useEditor} from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {TextAlign} from '@tiptap/extension-text-align';
import {Color} from '@tiptap/extension-color';
import {TextStyle} from '@tiptap/extension-text-style';
import {Link} from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import {Variable} from './VariableExtension';
import {setAvailableVariables, VariableMention} from './VariableMention';
import {Toolbar} from './Toolbar';
import {ResizableImage} from './ResizableImage';
import {HtmlEditor} from './HtmlEditor';
import {useContactFields, useContacts, useSegmentContacts} from '../../lib/hooks/useContacts';
import {useConfig} from '../../lib/hooks/useConfig';
import {useTemplateValidation} from '../../lib/hooks/useTemplateValidation';
import {useEffect, useRef, useState} from 'react';
import {renderTemplate} from '@plunk/shared';
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@plunk/ui';
import {AlertTriangle, Code2, Eye, Monitor, Smartphone, Tablet, Upload, X} from 'lucide-react';
import {network} from '../../lib/network';
import {detectCustomHtmlPatterns, wrapEmailWithStyles} from '../../lib/emailStyles';
import 'tippy.js/dist/tippy.css';

interface EmailEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  // Optional props for preview header
  subject?: string;
  from?: string;
  replyTo?: string;
  // When set, the "Preview as" dropdown is scoped to this segment's members
  // instead of all contacts in the project (used for SEGMENT-audience campaigns)
  segmentId?: string;
}

const commonVariables = [
  {name: 'id', description: 'Contact ID'},
  {name: 'email', description: 'Recipient email address'},
  {name: 'unsubscribeUrl', description: 'Unsubscribe link'},
  {name: 'subscribeUrl', description: 'Subscribe link'},
  {name: 'manageUrl', description: 'Manage link'},
];

export function EmailEditor({value, onChange, placeholder, subject, from, replyTo, segmentId}: EmailEditorProps) {
  // Detect if initial value has custom HTML and start in appropriate mode
  const initialMode = detectCustomHtmlPatterns(value) ? 'html' : 'visual';

  const [mode, setMode] = useState<'visual' | 'html'>(initialMode);
  const [htmlContent, setHtmlContent] = useState(value);
  const [showVariableDialog, setShowVariableDialog] = useState(false);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [showModeWarningDialog, setShowModeWarningDialog] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [customVariable, setCustomVariable] = useState('');
  const [defaultValue, setDefaultValue] = useState('');
  const [selectedContactId, setSelectedContactId] = useState<string>('');
  const [previewUpdateTrigger, setPreviewUpdateTrigger] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch available contact fields using SWR
  const {fields: availableFields} = useContactFields();

  // Surface Liquid syntax errors while editing. Saving rejects an unparseable template
  // anyway, so the alternative is learning about a typo from a 400 after the fact.
  const syntaxIssue = useTemplateValidation(htmlContent);

  // Fetch contacts for preview using SWR.
  // When the campaign targets a segment, scope the dropdown to that segment's
  // members; otherwise fall back to all contacts in the project.
  const {contacts: allContacts} = useContacts({limit: 50});
  const {contacts: segmentContacts} = useSegmentContacts(segmentId);
  const contacts = segmentId ? segmentContacts : allContacts;

  useEffect(() => {
    if (availableFields.length > 0) {
      setAvailableVariables(availableFields);
    }
  }, [availableFields]);

  // Clear the preview selection when the chosen contact is no longer in the
  // available list (e.g. the segment changed). Otherwise the preview stays
  // stuck rendering a contact that's no longer selectable in the dropdown.
  useEffect(() => {
    if (selectedContactId && !contacts.some(c => c.id === selectedContactId)) {
      setSelectedContactId('');
    }
  }, [contacts, selectedContactId]);

  const {data: config} = useConfig();
  const canUploadImages = Boolean(config?.features.storage.s3Enabled);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right', 'justify'],
      }),
      Color,
      TextStyle,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          rel: 'noopener noreferrer',
        },
      }),
      ResizableImage,
      Variable,
      VariableMention,
      Placeholder.configure({
        placeholder: placeholder || 'Your next email starts here!',
      }),
    ],
    // Only initialize with content if starting in visual mode
    // If starting in HTML mode (due to custom HTML), keep editor empty
    content: initialMode === 'visual' ? value || '' : '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[400px] px-4 py-3 text-neutral-900',
      },
    },
    onUpdate: ({editor}) => {
      const html = editor.getHTML();
      onChange(html);
      setHtmlContent(html);
      // Trigger preview update
      setPreviewUpdateTrigger(prev => prev + 1);
    },
  });

  // Update editor content when value prop changes from outside
  useEffect(() => {
    if (editor && value !== editor.getHTML() && value !== htmlContent) {
      // Only update editor if in visual mode or if value is simple HTML
      const isCustomHtml = detectCustomHtmlPatterns(value);

      if (!isCustomHtml && mode === 'visual') {
        editor.commands.setContent(value || '');
      }

      // Always update htmlContent to stay in sync
      setHtmlContent(value);

      // If custom HTML is detected and we're in visual mode, switch to HTML mode
      if (isCustomHtml && mode === 'visual') {
        setMode('html');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor]);

  // Use the same pattern detection as initialization (no editor manipulation)
  const detectCustomHtml = (html: string): boolean => {
    return detectCustomHtmlPatterns(html);
  };

  const handleModeToggle = () => {
    if (mode === 'visual') {
      // Switching to HTML mode
      const currentHtml = editor?.getHTML() || '';
      setHtmlContent(currentHtml);
      setMode('html');
    } else {
      // Switching to visual mode - check if custom HTML will be lost
      if (detectCustomHtml(htmlContent)) {
        setShowModeWarningDialog(true);
      } else {
        switchToVisualMode();
      }
    }
  };

  const switchToVisualMode = () => {
    // Only switch if we have an editor and html content
    if (editor) {
      editor.commands.setContent(htmlContent || '');
      onChange(htmlContent);
      setMode('visual');
    }
    setShowModeWarningDialog(false);
  };

  const stayInHtmlMode = () => {
    // Explicitly stay in HTML mode and just close the dialog
    setShowModeWarningDialog(false);
    // Ensure we're in HTML mode
    if (mode !== 'html') {
      setMode('html');
    }
  };

  const handleHtmlChange = (newHtml: string) => {
    setHtmlContent(newHtml);
    onChange(newHtml);
  };

  const insertVariable = (varName: string, withDefault?: boolean) => {
    if (editor) {
      // Insert the variable placeholder as text with optional default value
      const variableText = withDefault && defaultValue ? `{{${varName} ?? ${defaultValue}}}` : `{{${varName}}}`;
      editor.chain().focus().insertContent(variableText).run();
      setShowVariableDialog(false);
      setCustomVariable('');
      setDefaultValue('');
    }
  };

  const handleImageUpload = async () => {
    if (!imageFile && !imageUrl) return;

    if (imageUrl) {
      // Insert external URL
      (editor?.chain().focus() as any).setImage({src: imageUrl}).run();
      setImageUrl('');
      setShowImageDialog(false);
    } else if (imageFile) {
      try {
        // Upload to S3/Minio
        const formData = new FormData();
        formData.append('image', imageFile);

        const response = await network.upload<{url: string; key: string}>('POST', '/uploads/image', formData);

        // Insert the uploaded image URL
        (editor?.chain().focus() as any).setImage({src: response.url}).run();
        setImageFile(null);
        setShowImageDialog(false);
      } catch (error) {
        console.error('Failed to upload image:', error);
        alert('Failed to upload image. Please try again.');
      }
    }
  };

  const replaceVariables = (text: string, contactData: Record<string, unknown>) => {
    return renderTemplate(text, contactData);
  };

  const getPreviewHtml = () => {
    const currentHtml = mode === 'visual' ? editor?.getHTML() || '' : htmlContent;
    if (!selectedContactId) return currentHtml;

    const contact = contacts.find(c => c.id === selectedContactId);
    if (!contact) return currentHtml;

    const contactData = {
      email: contact.email,
      unsubscribed: (contact as {subscribed?: boolean}).subscribed ? 'No' : 'Yes',
      unsubscribeUrl: `${window.location.origin}/unsubscribe/${contact.id}`,
      subscribeUrl: `${window.location.origin}/subscribe/${contact.id}`,
      manageUrl: `${window.location.origin}/manage/${contact.id}`,
      data: contact.data || {},
      ...((contact.data as Record<string, unknown> | null) || {}),
    };

    return replaceVariables(currentHtml, contactData);
  };

  const getPreviewSubject = () => {
    if (!subject || !selectedContactId) return subject || '';

    const contact = contacts.find(c => c.id === selectedContactId);
    if (!contact) return subject;

    const contactData = {
      email: contact.email,
      unsubscribed: (contact as {subscribed?: boolean}).subscribed ? 'No' : 'Yes',
      unsubscribeUrl: `${window.location.origin}/unsubscribe/${contact.id}`,
      subscribeUrl: `${window.location.origin}/subscribe/${contact.id}`,
      manageUrl: `${window.location.origin}/manage/${contact.id}`,
      data: contact.data || {},
      ...((contact.data as Record<string, unknown> | null) || {}),
    };

    return replaceVariables(subject, contactData);
  };

  const getPreviewContainerWidth = () => {
    // Return the actual width the iframe should have (for media queries)
    switch (previewDevice) {
      case 'mobile':
        return '375px';
      case 'tablet':
        return '768px';
      case 'desktop':
      default:
        return '1200px'; // Standard desktop email width
    }
  };

  // Ref for the preview iframe
  const previewIframeRef = useRef<HTMLIFrameElement>(null);

  // Update iframe content when preview changes
  useEffect(() => {
    if (previewIframeRef.current && selectedContactId) {
      const iframe = previewIframeRef.current;
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;

      if (iframeDoc) {
        const previewContent = getPreviewHtml();
        const fullHtml = wrapEmailWithStyles(previewContent);

        iframeDoc.open();
        iframeDoc.write(fullHtml);
        iframeDoc.close();

        // Auto-adjust iframe height to content. Reset to a small value first so
        // body content that uses % / vh heights doesn't lock the iframe to its
        // previous size (which would otherwise cause the iframe to grow by the
        // padding offset on every preview-device switch).
        const adjustHeight = () => {
          if (!iframe.contentWindow) return;
          iframe.style.height = '0px';
          const doc = iframe.contentWindow.document;
          const height = Math.max(
            doc.body?.scrollHeight ?? 0,
            doc.documentElement?.scrollHeight ?? 0,
          );
          iframe.style.height = `${Math.max(400, height + 40)}px`;
        };

        const timeouts = [
          window.setTimeout(adjustHeight, 100),
          window.setTimeout(adjustHeight, 300),
        ];
        iframe.contentWindow?.addEventListener('load', adjustHeight);

        return () => {
          timeouts.forEach(window.clearTimeout);
          iframe.contentWindow?.removeEventListener('load', adjustHeight);
        };
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedContactId, htmlContent, mode, previewDevice, previewUpdateTrigger]);

  return (
    <div className="border border-neutral-200 rounded-lg bg-white">
      {/* Mode toggle */}
      <div className="border-b border-neutral-200 bg-neutral-50 p-2 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
        <div className="flex gap-1">
          <Button
            type="button"
            variant={mode === 'visual' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => mode === 'html' && handleModeToggle()}
          >
            <Eye className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Visual</span>
          </Button>
          <Button
            type="button"
            variant={mode === 'html' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => mode === 'visual' && handleModeToggle()}
          >
            <Code2 className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">HTML</span>
          </Button>
        </div>
        <div className="flex items-center gap-2 flex-1 sm:flex-none">
          <Label htmlFor="preview-contact" className="text-xs text-neutral-600 whitespace-nowrap">
            Preview as:
          </Label>
          <Select
            value={selectedContactId || 'none'}
            onValueChange={val => setSelectedContactId(val === 'none' ? '' : val)}
          >
            <SelectTrigger id="preview-contact" className="h-8 w-full sm:w-[200px] text-xs">
              <SelectValue placeholder="Select contact..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">
                <span className="text-neutral-500">No preview</span>
              </SelectItem>
              {contacts.map(contact => (
                <SelectItem key={contact.id} value={contact.id}>
                  {contact.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Template syntax errors, reported as you type rather than on save */}
      {syntaxIssue && (
        <div className="flex items-start gap-2 border-t border-red-200 bg-red-50 px-4 py-2.5">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-600" />
          <div className="min-w-0 space-y-1">
            <p className="text-xs font-medium text-red-800">{syntaxIssue.message}</p>
            {syntaxIssue.excerpt && (
              <code className="block truncate rounded border border-red-200 bg-white px-1.5 py-0.5 font-mono text-xs text-red-900">
                {syntaxIssue.excerpt}
              </code>
            )}
            <p className="text-[11px] text-red-700">
              {/* Line numbers only exist in the HTML editor's gutter. */}
              {mode === 'html' && syntaxIssue.line !== undefined
                ? `Line ${syntaxIssue.line}, column ${syntaxIssue.column} — saving will fail until this is fixed.`
                : 'Saving will fail until this is fixed.'}
            </p>
          </div>
        </div>
      )}

      {/* Editor content */}
      {mode === 'visual' ? (
        <>
          <Toolbar
            editor={editor}
            onInsertVariable={() => setShowVariableDialog(true)}
            onInsertImage={() => setShowImageDialog(true)}
            canUploadImages={canUploadImages}
          />
          <div className="min-h-[400px] max-h-[600px] overflow-y-auto">
            <EditorContent editor={editor} />
          </div>
          {selectedContactId && (
            <>
              <div className="border-t border-neutral-200 bg-neutral-100 px-4 py-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-medium text-neutral-600">Preview</p>
                    <span className="text-xs text-neutral-500">
                      ({previewDevice === 'mobile' ? '375px' : previewDevice === 'tablet' ? '768px' : '1200px'})
                    </span>
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
              <div className="p-4 bg-neutral-50 flex justify-center items-start overflow-auto min-h-[400px]">
                <div
                  className="transition-all duration-300"
                  style={{
                    width: getPreviewContainerWidth(),
                    maxWidth: '100%',
                  }}
                >
                  <div className="bg-white rounded-lg border border-neutral-300 shadow-lg overflow-hidden">
                    {/* Email Header Preview */}
                    {(subject || from || replyTo) && (
                      <div className="bg-neutral-50 border-b border-neutral-200 p-4 space-y-2">
                        {subject && (
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="text-xs text-neutral-500 uppercase tracking-wide font-medium">Subject</p>
                              <p className="text-base font-semibold text-neutral-900 mt-1">{getPreviewSubject()}</p>
                            </div>
                          </div>
                        )}
                        {(from || replyTo) && (
                          <div className="flex gap-6 pt-2 border-t border-neutral-200">
                            {from && (
                              <div>
                                <p className="text-xs text-neutral-500">From</p>
                                <p className="text-sm text-neutral-900 mt-0.5">{from}</p>
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
                    )}
                    <iframe
                      ref={previewIframeRef}
                      className="w-full border-0"
                      style={{
                        minHeight: '400px',
                        height: '100%',
                      }}
                      title="Email Preview"
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      ) : (
        <>
          <div className="min-h-[400px] max-h-[600px] overflow-hidden">
            <HtmlEditor
              value={htmlContent}
              onChange={handleHtmlChange}
              placeholder={placeholder || 'Your next email starts here!'}
            />
          </div>
          {selectedContactId && (
            <>
              <div className="border-t border-neutral-200 bg-neutral-100 px-4 py-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-medium text-neutral-600">Preview</p>
                    <span className="text-xs text-neutral-500">
                      ({previewDevice === 'mobile' ? '375px' : previewDevice === 'tablet' ? '768px' : '1200px'})
                    </span>
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
              <div className="p-4 bg-neutral-50 flex justify-center items-start overflow-auto min-h-[400px]">
                <div
                  className="transition-all duration-300"
                  style={{
                    width: getPreviewContainerWidth(),
                    maxWidth: '100%',
                  }}
                >
                  <div className="bg-white rounded-lg border border-neutral-300 shadow-lg overflow-hidden">
                    {/* Email Header Preview */}
                    {(subject || from || replyTo) && (
                      <div className="bg-neutral-50 border-b border-neutral-200 p-4 space-y-2">
                        {subject && (
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="text-xs text-neutral-500 uppercase tracking-wide font-medium">Subject</p>
                              <p className="text-base font-semibold text-neutral-900 mt-1">{getPreviewSubject()}</p>
                            </div>
                          </div>
                        )}
                        {(from || replyTo) && (
                          <div className="flex gap-6 pt-2 border-t border-neutral-200">
                            {from && (
                              <div>
                                <p className="text-xs text-neutral-500">From</p>
                                <p className="text-sm text-neutral-900 mt-0.5">{from}</p>
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
                    )}
                    <iframe
                      ref={previewIframeRef}
                      className="w-full border-0"
                      style={{
                        minHeight: '400px',
                        height: '100%',
                      }}
                      title="Email Preview"
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* Variable insertion dialog */}
      <Dialog open={showVariableDialog} onOpenChange={setShowVariableDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Insert Variable</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Common variables</Label>
              <div className="grid grid-cols-2 gap-2">
                {commonVariables.map(v => (
                  <Button
                    key={v.name}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => insertVariable(v.name)}
                    className="justify-start"
                  >
                    <code className="text-xs">{`{{${v.name}}}`}</code>
                  </Button>
                ))}
              </div>
            </div>

            {availableFields.length > 0 && (
              <div>
                <Label className="text-sm font-medium mb-2 block">Contact fields</Label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {availableFields
                    .filter(field => !commonVariables.some(v => v.name === field))
                    .map(field => (
                      <Button
                        key={field}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => insertVariable(field)}
                        className="justify-start"
                      >
                        <code className="text-xs">{`{{${field}}}`}</code>
                      </Button>
                    ))}
                </div>
              </div>
            )}
            <div>
              <Label htmlFor="custom-var" className="text-sm font-medium mb-2 block">
                Custom variable
              </Label>
              <div className="space-y-2">
                <Input
                  id="custom-var"
                  value={customVariable}
                  onChange={e => setCustomVariable(e.target.value)}
                  placeholder="Variable name (e.g., firstName)"
                  onKeyDown={e => {
                    if (e.key === 'Enter' && customVariable) {
                      insertVariable(customVariable, true);
                    }
                  }}
                />
                <Input
                  id="default-value"
                  value={defaultValue}
                  onChange={e => setDefaultValue(e.target.value)}
                  placeholder="Default value (optional, e.g., Friend)"
                  onKeyDown={e => {
                    if (e.key === 'Enter' && customVariable) {
                      insertVariable(customVariable, true);
                    }
                  }}
                />
                <Button
                  type="button"
                  onClick={() => customVariable && insertVariable(customVariable, true)}
                  disabled={!customVariable}
                  className="w-full"
                >
                  Insert Variable
                </Button>
              </div>
              <p className="text-xs text-neutral-500 mt-2">
                Variables are replaced with actual values when sent. Use{' '}
                <code className="text-xs bg-neutral-100 px-1 rounded">{'{{name ?? default}}'}</code> syntax for fallback
                values.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Mode switch warning dialog */}
      <Dialog
        open={showModeWarningDialog}
        onOpenChange={open => {
          // Only allow closing (not opening) and ensure we stay in current mode
          if (!open) {
            setShowModeWarningDialog(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Custom HTML Detected</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-neutral-700">
              Your HTML contains custom formatting, styles, or elements that the visual editor doesn&apos;t support.
              Switching to visual mode will cause these customizations to be lost or modified.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-sm text-amber-800 font-medium">This may affect:</p>
              <ul className="text-sm text-amber-700 mt-2 ml-4 list-disc space-y-1">
                <li>Custom HTML elements and attributes</li>
                <li>Inline styles and CSS classes</li>
                <li>Complex table structures</li>
                <li>Custom formatting or layout</li>
              </ul>
            </div>

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={stayInHtmlMode}>
                Stay in HTML Mode
              </Button>
              <Button type="button" variant="destructive" onClick={switchToVisualMode}>
                Switch Anyway
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image insertion dialog */}
      <Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Insert Image</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="image-url" className="text-sm font-medium mb-2 block">
                Image URL
              </Label>
              <Input
                id="image-url"
                value={imageUrl}
                onChange={e => setImageUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
                type="url"
              />
            </div>

            {canUploadImages && (
              <>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-neutral-200" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-neutral-500">Or upload</span>
                  </div>
                </div>

                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setImageFile(file);
                        setImageUrl('');
                      }
                    }}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Choose file
                  </Button>
                  {imageFile && (
                    <div className="mt-2 flex items-center justify-between p-2 bg-neutral-50 rounded border border-neutral-200">
                      <span className="text-sm text-neutral-700 truncate">{imageFile.name}</span>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setImageFile(null)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </>
            )}

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setShowImageDialog(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={handleImageUpload} disabled={!imageUrl && !imageFile}>
                Insert
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Custom styles for editor */}
      <style jsx global>{`
        .variable-highlight {
          background-color: #dbeafe;
          color: #1e40af;
          padding: 2px 6px;
          border-radius: 3px;
          font-family: 'Courier New', monospace;
          font-size: 14px;
        }

        .variable-placeholder {
          display: inline;
          background-color: #dbeafe;
          color: #1e40af;
          padding: 2px 6px;
          border-radius: 3px;
          font-family: 'Courier New', monospace;
          font-size: 14px;
        }

        .ProseMirror table {
          border-collapse: collapse;
          width: 100%;
          margin: 16px 0;
        }

        .ProseMirror th,
        .ProseMirror td {
          border: 1px solid #e5e7eb;
          padding: 8px 12px;
          text-align: left;
          min-width: 100px;
        }

        .ProseMirror th {
          background-color: #f3f4f6;
          font-weight: 600;
        }

        .ProseMirror .selectedCell {
          background-color: #e0e7ff;
        }

        .ProseMirror img {
          max-width: 100%;
          height: auto;
          display: block;
          margin: 16px 0;
        }

        /* Resizable image styles */
        .resizable-image-wrapper {
          display: block;
          margin: 16px 0;
        }

        .resizable-image-container {
          display: inline-block;
          position: relative;
          max-width: 100%;
        }

        .resizable-image-container.selected {
          outline: 2px solid #3b82f6;
          outline-offset: 2px;
        }

        .resizable-image-container img {
          margin: 0;
        }

        .ProseMirror:focus {
          outline: none;
        }

        .ProseMirror p.is-editor-empty:first-child::before {
          color: #9ca3af;
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }

        /* Variable autocomplete styles */
        .tippy-box[data-theme~='variable-suggestion'] {
          background-color: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          box-shadow:
            0 4px 6px -1px rgba(0, 0, 0, 0.07),
            0 2px 4px -1px rgba(0, 0, 0, 0.04);
          padding: 4px;
          max-height: 320px;
          overflow-y: auto;
        }

        .tippy-box[data-theme~='variable-suggestion'] .tippy-content {
          padding: 0;
        }

        .variable-suggestion-list {
          min-width: 200px;
        }

        .suggestion-item {
          display: flex;
          align-items: center;
          padding: 8px 12px;
          cursor: pointer;
          border-radius: 4px;
          transition: background-color 0.15s;
        }

        .suggestion-item:hover,
        .suggestion-item.is-selected {
          background-color: #e5e7eb;
        }

        .suggestion-item:hover code,
        .suggestion-item.is-selected code {
          background-color: #dbeafe;
          color: #1e3a8a;
        }

        .suggestion-item code {
          font-size: 14px;
          font-family: 'Courier New', monospace;
          font-weight: 500;
          color: #1f2937;
          background-color: #f3f4f6;
          padding: 4px 8px;
          border-radius: 4px;
        }

        .suggestion-item-empty {
          padding: 12px;
          text-align: center;
          color: #9ca3af;
          font-size: 13px;
        }

        .variable-mention {
          background-color: #dbeafe;
          color: #1e40af;
          padding: 2px 6px;
          border-radius: 3px;
          font-family: 'Courier New', monospace;
          font-size: 14px;
        }
      `}</style>
    </div>
  );
}
