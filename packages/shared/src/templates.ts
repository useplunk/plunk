export const DEFAULT_FOOTER = `<mj-divider border-width="2px" border-color="#f5f5f5"></mj-divider>
<mj-text align="center">
  <p style="color: #a3a3a3; text-decoration: none; font-size: 12px; line-height: 1.7142857;">
    You received this email because you agreed to receive emails from {{project_name}}. If you no longer wish to receive emails like this, please <a style="text-decoration: underline" href="{{unsubscribe_url}}" target="_blank">update your preferences</a>.
  </p>
</mj-text>`;

export const DEFAULT_BASE_TEMPLATE = `<mjml>
  <mj-head>
    <mj-font name="Inter" href="https://fonts.googleapis.com/css2?family=Inter:wght@100;200;300;400;500;600;700;800;900&display=swap" />
    <mj-style inline="inline">
      .prose {
        color: #4a5568;
        max-width: 600px;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol';
      }

      .prose [class~="lead"] {
        color: #4a5568;
        font-size: 20px;
        line-height: 32px;
        margin-top: 19px;
        margin-bottom: 19px;
      }

      .prose a {
        color: #1a202c;
        text-decoration: underline;
      }

      .prose strong {
        color: #1a202c;
        font-weight: 600;
      }

      .prose ol {
        counter-reset: list-counter;
        margin-top: 20px;
        margin-bottom: 20px;
      }

      .prose ol > li {
        position: relative;
        counter-increment: list-counter;
        padding-left: 28px;
      }

      .prose ol > li::before {
        content: counter(list-counter) ".";
        position: absolute;
        font-weight: 400;
        color: #718096;
      }

      .prose ul > li {
        position: relative;
        padding-left: 28px;
      }

      .prose ul > li::before {
        content: "";
        position: absolute;
        background-color: #cbd5e0;
        border-radius: 50%;
        width: 6px;
        height: 6px;
        top: 11px;
        left: 4px;
      }

      .prose hr {
        border-color: #e2e8f0;
        border-top-width: 1px;
        margin-top: 42px;
        margin-bottom: 42px;
      }

      .prose blockquote {
        font-weight: 500;
        font-style: italic;
        color: #1a202c;
        border-left: 4px solid #e2e8f0;
        quotes: initial;
        margin-top: 25px;
        margin-bottom: 25px;
        padding-left: 16px;
      }

      .prose h1 {
        color: #1a202c;
        font-weight: 800;
        font-size: 36px;
        margin-top: 0px;
        margin-bottom: 14px;
        line-height: 40px;
      }

      .prose h2 {
        color: #1a202c;
        font-weight: 700;
        font-size: 24px;
        margin-top: 32px;
        margin-bottom: 16px;
        line-height: 32px;
      }

      .prose h3 {
        color: #1a202c;
        font-weight: 600;
        font-size: 20px;
        margin-top: 25px;
        margin-bottom: 9.6px;
        line-height: 32px;
      }

      .prose h4 {
        color: #1a202c;
        font-weight: 600;
        margin-top: 24px;
        margin-bottom: 8px;
        line-height: 1.5;
      }

      .prose figure figcaption {
        color: #718096;
        font-size: 14px;
        line-height: 1.4;
        margin-top: 14px;
      }

      .prose code {
        color: #1a202c;
        font-weight: 600;
        font-size: 14px;
      }

      .prose code::before {
        content: "\`";
      }

      .prose code::after {
        content: "\`";
      }

      .prose pre {
        color: #e2e8f0;
        background-color: #2d3748;
        overflow-x: auto;
        font-size: 14px;
        line-height: 1.7142857;
        margin-top: 27px;
        margin-bottom: 27px;
        border-radius: 6px;
        padding-top: 13px;
        padding-right: 18px;
        padding-bottom: 13px;
        padding-left: 18px;
      }

      .prose pre code {
        background-color: transparent;
        border-width: 0;
        border-radius: 0;
        padding: 0;
        font-weight: 400;
        color: inherit;
        font-size: inherit;
        font-family: inherit;
        line-height: inherit;
      }

      .prose pre code::before {
        content: "";
      }

      .prose pre code::after {
        content: "";
      }

      .prose table {
        width: 100%;
        table-layout: auto;
        margin-top: 32px;
        margin-bottom: 32px;
        font-size: 11px;
        line-height: 1.7142857;
      }

      .prose thead {
        color: #1a202c;
        font-weight: 600;
        border-bottom: 1px solid #cbd5e0;
      }

      .prose thead th {
        vertical-align: bottom;
        padding-right: 9px;
        padding-bottom: 9px;
        padding-left: 9px;
      }

      .prose tbody tr {
        border-bottom: 1px solid #e2e8f0;
      }

      .prose tbody tr:last-child {
        border-bottom-width: 0;
      }

      .prose tbody td {
        vertical-align: top;
        padding-top: 9px;
        padding-right: 9px;
        padding-bottom: 9px;
        padding-left: 9px;
      }

      .prose {
        font-size: 16px;
        line-height: 1.75;
      }

      .prose p {
        margin-top: 20px;
        margin-bottom: 20px;
      }

      .prose img {
        margin-top: 32px;
        margin-bottom: 32px;
        max-width: 100%;
        height: auto;
        display: block;
      }

      .prose video {
        margin-top: 32px;
        margin-bottom: 32px;
      }

      .prose figure {
        margin-top: 32px;
        margin-bottom: 32px;
      }

      .prose figure > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .prose h2 code {
        font-size: 14px;
      }

      .prose h3 code {
        font-size: 14px;
      }

      .prose ul {
        margin-top: 20px;
        margin-bottom: 20px;
      }

      .prose li {
        margin-top: 8px;
        margin-bottom: 8px;
      }

      .prose ol > li:before {
        left: 0;
      }

      .prose > ul > li p {
        margin-top: 12px;
        margin-bottom: 12px;
      }

      .prose > ul > li > *:first-child {
        margin-top: 20px;
      }

      .prose > ul > li > *:last-child {
        margin-bottom: 20px;
      }

      .prose > ol > li > *:first-child {
        margin-top: 20px;
      }

      .prose > ol > li > *:last-child {
        margin-bottom: 20px;
      }

      .prose ul ul,
      .prose ul ol,
      .prose ol ul,
      .prose ol ol {
        margin-top: 12px;
        margin-bottom: 12px;
      }

      .prose hr + * {
        margin-top: 0;
      }

      .prose h2 + * {
        margin-top: 0;
      }

      .prose h3 + * {
        margin-top: 0;
      }

      .prose h4 + * {
        margin-top: 0;
      }

      .prose thead th:first-child {
        padding-left: 0;
      }

      .prose thead th:last-child {
        padding-right: 0;
      }

      .prose tbody td:first-child {
        padding-left: 0;
      }

      .prose tbody td:last-child {
        padding-right: 0;
      }

      .prose > :first-child {
        margin-top: 0;
      }

      .prose > :last-child {
        margin-bottom: 0;
      }
    </mj-style>
  </mj-head>
  <mj-body>
    <mj-section>
      <mj-column>
        <mj-raw>
          <tr class="prose prose-neutral">
            <td style="padding:10px 25px;word-break:break-word">
              {{html}}
            </td>
          </tr>
        </mj-raw>
      </mj-column>
    </mj-section>
     <mj-section>
      <mj-column>
        {{unsubscribe_footer}}
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>
`;
