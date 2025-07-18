import Link from 'next/link';
import {useRouter} from 'next/router';

export interface TabProps {
  links: {
    to: string;
    text: string;
    active: boolean;
  }[];
}

/**
 * @param root0
 * @param root0.links
 */
export default function Tabs({links}: TabProps) {
  const router = useRouter();
  return (
    <div>
      <div className="sm:hidden">
        <label htmlFor="tabs" className="sr-only">
          Select a tab
        </label>
        <select
          id="tabs"
          name="tabs"
          className="focus:ring-mirage-500 focus:border-mirage-500 block w-full rounded border-neutral-300 py-2 pl-3 pr-10 text-base focus:outline-none sm:text-sm"
          onChange={e => router.push(e.target.value)}
        >
          {links.map(link => {
            return (
              <option value={link.to} selected={link.active}>
                {link.text}
              </option>
            );
          })}
        </select>
      </div>
      <div className="hidden sm:block">
        <div className="border-b border-neutral-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            {links.map(link => {
              return (
                <Link
                  href={link.to}
                  className={`${
                    link.active
                      ? 'border-mirage-500 text-mirage-600'
                      : 'text-neutral-500 hover:border-neutral-300 hover:text-neutral-700'
                  } whitespace-nowrap border-b-2 border-transparent px-1 py-4 text-sm font-medium transition`}
                >
                  {link.text}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}
