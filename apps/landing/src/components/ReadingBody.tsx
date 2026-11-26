import {ChevronDown} from 'lucide-react';
import React, {ReactNode, useEffect, useRef, useState} from 'react';

/**
 * A reading column with a quiet contents rail to its left, used by the guides
 * and the legal documents.
 *
 * The rail lists only the h2s that carry an id. Listing h3s too made it as
 * long as the article on some pages, which defeats the point of a contents
 * list. Below `lg` the rail is hidden; `mobileContents` puts the same list in a
 * collapsed disclosure above the column, for long documents read on a phone.
 */
export function ReadingBody({
  children,
  label = 'On this page',
  mobileContents = false,
}: {
  children: ReactNode;
  label?: string;
  mobileContents?: boolean;
}) {
  const article = useRef<HTMLDivElement>(null);
  const [headings, setHeadings] = useState<{id: string; text: string}[]>([]);
  const [active, setActive] = useState('');

  useEffect(() => {
    const root = article.current;
    if (!root) return;

    const elements = Array.from(root.querySelectorAll<HTMLHeadingElement>('h2[id]'));
    setHeadings(elements.map(el => ({id: el.id, text: el.textContent ?? ''})));

    // The active heading is the last one scrolled past the sticky navbar. Derived from
    // scroll position rather than an IntersectionObserver, which never fires for a
    // heading that an anchor jump skips over, leaving the rail on the wrong section.
    let frame = 0;
    const update = () => {
      frame = 0;
      let current = elements[0]?.id ?? '';
      for (const el of elements) {
        if (el.getBoundingClientRect().top > 120) break;
        current = el.id;
      }
      setActive(current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, {passive: true});
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className={'mx-auto max-w-[88rem] px-6 sm:px-10'}>
      <div className={'grid gap-12 lg:grid-cols-12'}>
        <aside className={'hidden lg:col-span-3 lg:block print:hidden'}>
          {headings.length > 0 && (
            <nav aria-label={label} className={'sticky top-28 max-h-[calc(100vh-8rem)] overflow-y-auto pb-8'}>
              <p className={'mb-4 text-ui font-semibold text-neutral-900'}>{label}</p>
              <ul className={'flex flex-col border-l border-neutral-200'}>
                {headings.map(h => (
                  <li key={h.id}>
                    <a
                      href={`#${h.id}`}
                      aria-current={active === h.id ? 'location' : undefined}
                      className={`-ml-px block border-l py-1.5 pl-4 text-ui transition-colors ${
                        active === h.id
                          ? 'border-neutral-900 font-medium text-neutral-900'
                          : 'border-transparent text-neutral-500 hover:text-neutral-900'
                      }`}
                    >
                      {h.text}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </aside>

        <article ref={article} className={'min-w-0 lg:col-span-8 lg:col-start-4 xl:col-span-7 xl:col-start-4'}>
          {mobileContents && headings.length > 0 && (
            <details className={'group mb-12 rounded-card border border-neutral-200 lg:hidden print:hidden'}>
              <summary
                className={
                  'flex cursor-pointer list-none items-center justify-between px-5 py-4 text-ui font-semibold text-neutral-900 [&::-webkit-details-marker]:hidden'
                }
              >
                {label}
                <ChevronDown aria-hidden className={'h-4 w-4 text-neutral-400 transition-transform group-open:rotate-180'} />
              </summary>
              <ul className={'border-t border-neutral-200 px-5 py-3'}>
                {headings.map(h => (
                  <li key={h.id}>
                    <a href={`#${h.id}`} className={'block py-1.5 text-ui text-neutral-600 hover:text-neutral-900'}>
                      {h.text}
                    </a>
                  </li>
                ))}
              </ul>
            </details>
          )}
          {children}
        </article>
      </div>
    </div>
  );
}
