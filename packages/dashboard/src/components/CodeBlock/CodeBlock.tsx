import SyntaxHighlighter from 'react-syntax-highlighter';
import React from 'react';

export interface CodeBlockProps {
  language: string;
  code: string;
  style?: React.CSSProperties;
}

/**
 *
 * @param root0
 * @param root0.code
 * @param root0.language
 * @param root0.style
 */
export default function ({code, language, style}: CodeBlockProps) {
  return (
    <SyntaxHighlighter
      customStyle={style}
      showLineNumbers
      language={language}
      style={{
        'hljs': {
          display: 'block',
          overflowX: 'auto',
          padding: '0.5em',
          background: '#1e293b',
          color: '#f8f8f2',
        },
        'hljs-keyword': {
          color: '#8be9fd',
          fontWeight: 'bold',
        },
        'hljs-selector-tag': {
          color: '#8be9fd',
          fontWeight: 'bold',
        },
        'hljs-literal': {
          color: '#8be9fd',
          fontWeight: 'bold',
        },
        'hljs-section': {
          color: '#8be9fd',
          fontWeight: 'bold',
        },
        'hljs-link': {
          color: '#8be9fd',
        },
        'hljs-function .hljs-keyword': {
          color: '#ff79c6',
        },
        'hljs-subst': {
          color: '#f8f8f2',
        },
        'hljs-string': {
          color: '#d8b4fe',
        },
        'hljs-title': {
          color: '#c3e88d',
          fontWeight: 'bold',
        },
        'hljs-name': {
          color: '#c3e88d',
          fontWeight: 'bold',
        },
        'hljs-type': {
          color: '#f1fa8c',
          fontWeight: 'bold',
        },
        'hljs-attribute': {
          color: '#f1fa8c',
        },
        'hljs-symbol': {
          color: '#f1fa8c',
        },
        'hljs-bullet': {
          color: '#f1fa8c',
        },
        'hljs-addition': {
          color: '#f1fa8c',
        },
        'hljs-variable': {
          color: '#f1fa8c',
        },
        'hljs-template-tag': {
          color: '#f1fa8c',
        },
        'hljs-template-variable': {
          color: '#f1fa8c',
        },
        'hljs-comment': {
          color: '#6272a4',
        },
        'hljs-quote': {
          color: '#6272a4',
        },
        'hljs-deletion': {
          color: '#6272a4',
        },
        'hljs-meta': {
          color: '#6272a4',
        },
        'hljs-doctag': {
          fontWeight: 'bold',
        },
        'hljs-strong': {
          fontWeight: 'bold',
        },
        'hljs-emphasis': {
          fontStyle: 'italic',
        },
      }}
    >
      {code}
    </SyntaxHighlighter>
  );
}
