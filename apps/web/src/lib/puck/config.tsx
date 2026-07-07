import type {Config} from '@puckeditor/core';
import {DropZone} from '@puckeditor/core';
import React from 'react';

import {Button} from '@plunk/ui';

import {network} from '../network';
import {PuckFormBlock} from '../../components/puck/PuckFormBlock';
import {marqueePuckComponent, type MarqueePuckProps} from '../../components/puck/magicui/marquee';

type LandingPageComponents = {
  Heading: {
    text: string;
    level: '1' | '2' | '3';
    align: 'left' | 'center' | 'right';
  };
  Text: {
    content: string;
    align: 'left' | 'center' | 'right';
  };
  Image: {
    src: string;
    alt: string;
    rounded: boolean;
  };
  Button: {
    label: string;
    href: string;
    variant: 'primary' | 'secondary';
    align: 'left' | 'center' | 'right';
  };
  Spacer: {
    size: 'sm' | 'md' | 'lg' | 'xl';
  };
  Divider: Record<string, never>;
  Section: {
    padding: 'none' | 'sm' | 'md' | 'lg';
    background: 'white' | 'neutral' | 'dark';
  };
  FormBlock: {
    formPublicId: string;
  };
  Marquee: MarqueePuckProps;
};

const headingClass: Record<LandingPageComponents['Heading']['level'], string> = {
  '1': 'text-4xl font-bold tracking-tight',
  '2': 'text-3xl font-bold tracking-tight',
  '3': 'text-2xl font-semibold',
};

const textAlignClass: Record<'left' | 'center' | 'right', string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

const flexAlignClass: Record<'left' | 'center' | 'right', string> = {
  left: 'justify-start',
  center: 'justify-center',
  right: 'justify-end',
};

const spacerClass = {
  sm: 'h-4',
  md: 'h-8',
  lg: 'h-16',
  xl: 'h-24',
};

const sectionPaddingClass = {
  none: 'py-0',
  sm: 'py-6',
  md: 'py-12',
  lg: 'py-20',
};

const sectionBackgroundClass = {
  white: 'bg-white',
  neutral: 'bg-neutral-50',
  dark: 'bg-neutral-900 text-white',
};

export const puckConfig: Config<LandingPageComponents> = {
  categories: {
    content: {
      title: 'Content',
      components: ['Heading', 'Text', 'Image', 'Button', 'Spacer', 'Divider'],
    },
    layout: {
      title: 'Layout',
      components: ['Section'],
    },
    forms: {
      title: 'Forms',
      components: ['FormBlock'],
    },
    magicui: {
      title: 'Magic UI',
      components: ['Marquee'],
    },
  },
  root: {
    render: ({children}) => (
      <div className="min-h-screen bg-white text-neutral-900 antialiased">
        {children}
      </div>
    ),
  },
  components: {
    Heading: {
      label: 'Heading',
      defaultProps: {
        text: 'Heading',
        level: '1',
        align: 'left',
      },
      fields: {
        text: {type: 'text', contentEditable: true},
        level: {
          type: 'select',
          options: [
            {label: 'H1', value: '1'},
            {label: 'H2', value: '2'},
            {label: 'H3', value: '3'},
          ],
        },
        align: {
          type: 'select',
          options: [
            {label: 'Left', value: 'left'},
            {label: 'Center', value: 'center'},
            {label: 'Right', value: 'right'},
          ],
        },
      },
      render: ({text, level, align}) => {
        const className = `${headingClass[level]} ${textAlignClass[align]}`;
        return (
          <div className="px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full">
            {level === '1' ? <h1 className={className}>{text}</h1> : null}
            {level === '2' ? <h2 className={className}>{text}</h2> : null}
            {level === '3' ? <h3 className={className}>{text}</h3> : null}
          </div>
        );
      },
    },
    Text: {
      label: 'Text',
      defaultProps: {
        content: 'Add your text here.',
        align: 'left',
      },
      fields: {
        content: {type: 'textarea', contentEditable: true},
        align: {
          type: 'select',
          options: [
            {label: 'Left', value: 'left'},
            {label: 'Center', value: 'center'},
            {label: 'Right', value: 'right'},
          ],
        },
      },
      render: ({content, align}) => (
        <div className="px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto w-full">
          <p className={`text-neutral-600 text-lg leading-relaxed whitespace-pre-wrap ${textAlignClass[align]}`}>
            {content}
          </p>
        </div>
      ),
    },
    Image: {
      label: 'Image',
      defaultProps: {
        src: 'https://placehold.co/1200x600/e5e5e5/737373?text=Image',
        alt: 'Image',
        rounded: true,
      },
      fields: {
        src: {type: 'text', label: 'Image URL'},
        alt: {type: 'text', label: 'Alt text'},
        rounded: {
          type: 'radio',
          options: [
            {label: 'Rounded', value: true},
            {label: 'Square', value: false},
          ],
        },
      },
      render: ({src, alt, rounded}) => (
        <div className="px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            className={`w-full h-auto ${rounded ? 'rounded-xl' : ''}`}
          />
        </div>
      ),
    },
    Button: {
      label: 'Button',
      defaultProps: {
        label: 'Get started',
        href: '#',
        variant: 'primary',
        align: 'center',
      },
      fields: {
        label: {type: 'text', contentEditable: true},
        href: {type: 'text', label: 'Link URL'},
        variant: {
          type: 'select',
          options: [
            {label: 'Primary', value: 'primary'},
            {label: 'Secondary', value: 'secondary'},
          ],
        },
        align: {
          type: 'select',
          options: [
            {label: 'Left', value: 'left'},
            {label: 'Center', value: 'center'},
            {label: 'Right', value: 'right'},
          ],
        },
      },
      render: ({label, href, variant, align}) => (
        <div className={`px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full flex ${flexAlignClass[align]}`}>
          <Button asChild variant={variant === 'primary' ? 'default' : 'outline'} size="lg">
            <a href={href}>{label}</a>
          </Button>
        </div>
      ),
    },
    Spacer: {
      label: 'Spacer',
      defaultProps: {
        size: 'md',
      },
      fields: {
        size: {
          type: 'select',
          options: [
            {label: 'Small', value: 'sm'},
            {label: 'Medium', value: 'md'},
            {label: 'Large', value: 'lg'},
            {label: 'Extra large', value: 'xl'},
          ],
        },
      },
      render: ({size}) => <div className={spacerClass[size]} aria-hidden />,
    },
    Divider: {
      label: 'Divider',
      fields: {},
      render: () => (
        <div className="px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full">
          <hr className="border-neutral-200" />
        </div>
      ),
    },
    Section: {
      label: 'Section',
      defaultProps: {
        padding: 'md',
        background: 'white',
      },
      fields: {
        padding: {
          type: 'select',
          options: [
            {label: 'None', value: 'none'},
            {label: 'Small', value: 'sm'},
            {label: 'Medium', value: 'md'},
            {label: 'Large', value: 'lg'},
          ],
        },
        background: {
          type: 'select',
          options: [
            {label: 'White', value: 'white'},
            {label: 'Neutral', value: 'neutral'},
            {label: 'Dark', value: 'dark'},
          ],
        },
      },
      render: ({padding, background, puck}) => (
        <section className={`${sectionPaddingClass[padding]} ${sectionBackgroundClass[background]}`}>
          <DropZone zone="section-content" />
          {puck.isEditing && (
            <div className="px-4 text-xs text-neutral-400 text-center pb-2">Drop blocks into this section</div>
          )}
        </section>
      ),
    },
    Marquee: marqueePuckComponent,
    FormBlock: {
      label: 'Form',
      defaultProps: {
        formPublicId: '',
      },
      fields: {
        formPublicId: {
          type: 'external',
          label: 'Form',
          placeholder: 'Select a form',
          showSearch: true,
          fetchList: async () => {
            const forms = await network.fetch<Array<{name: string; slug: string; publicId: string}>>('GET', '/forms');
            return forms.map(form => ({
              title: form.name,
              description: form.slug,
              publicId: form.publicId,
            }));
          },
          mapProp: (item: {publicId: string}) => item.publicId,
          getItemSummary: (formPublicId: string) => formPublicId || 'Select a form',
        },
      },
      render: ({formPublicId, puck}) => (
        <div className="px-4 sm:px-6 lg:px-8 py-8">
          <PuckFormBlock formPublicId={formPublicId} disabled={puck.isEditing} />
        </div>
      ),
    },
  },
};

export type {LandingPageComponents};
