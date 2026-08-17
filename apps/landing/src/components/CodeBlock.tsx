import {motion} from 'framer-motion';
import React, {useState} from 'react';
import {Check, Copy} from 'lucide-react';

interface CodeBlockProps {
  code: string;
  language?: string;
  title?: string;
  showCopy?: boolean;
}

/**
 * Reusable code block component with syntax highlighting styling and copy functionality
 */
export function CodeBlock({code, language = 'javascript', title, showCopy = true}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{opacity: 0, y: 20}}
      whileInView={{opacity: 1, y: 0}}
      viewport={{once: true}}
      transition={{duration: 0.7, ease: [0.22, 1, 0.36, 1]}}
      className={'group relative overflow-hidden rounded-xl border border-neutral-200 bg-neutral-900 w-full max-w-full'}
    >
      {(title || showCopy) && (
        <div className={'flex items-center justify-between border-b border-neutral-800 bg-neutral-900 px-6 py-3'}>
          {title && <span className={'text-ui font-medium text-neutral-400'}>{title}</span>}
          {!title && <span className={'text-xs font-medium text-neutral-500'}>{language}</span>}
          {showCopy && (
            <button
              onClick={handleCopy}
              className={
                'flex items-center gap-2 rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-xs font-medium text-neutral-300 transition hover:bg-neutral-700 hover:text-white'
              }
              aria-label="Copy code"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  Copy
                </>
              )}
            </button>
          )}
        </div>
      )}
      <pre className={'overflow-x-auto p-6 text-neutral-100 w-full max-w-full'} style={{boxSizing: 'border-box'}}>
        <code className={'font-mono text-ui leading-relaxed'} style={{whiteSpace: 'pre-wrap', wordBreak: 'break-word'}}>
          {code}
        </code>
      </pre>
    </motion.div>
  );
}
