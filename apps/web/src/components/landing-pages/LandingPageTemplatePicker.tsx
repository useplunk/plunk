import {cn} from '@plunk/ui';

import {
  LANDING_PAGE_TEMPLATES,
  type LandingPageTemplateId,
} from '../../lib/puck/templates/front-centre';

import {LandingPageTemplatePreview} from './LandingPageTemplatePreview';

interface LandingPageTemplatePickerProps {
  value: LandingPageTemplateId;
  onChange: (id: LandingPageTemplateId) => void;
}

export function LandingPageTemplatePicker({value, onChange}: LandingPageTemplatePickerProps) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-neutral-900" id="landing-page-template-label">
        Template
      </p>
      <div
        className="grid grid-cols-1 gap-3 sm:grid-cols-2"
        role="radiogroup"
        aria-labelledby="landing-page-template-label"
      >
        {LANDING_PAGE_TEMPLATES.map(template => {
          const selected = value === template.id;

          return (
            <button
              key={template.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(template.id)}
              onKeyDown={event => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onChange(template.id);
                }
              }}
              className={cn(
                'flex flex-col gap-3 rounded-lg border p-3 text-left transition-colors hover:border-neutral-400',
                selected ? 'border-neutral-900 ring-2 ring-neutral-900' : 'border-neutral-200',
              )}
            >
              <LandingPageTemplatePreview data={template.data} />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-neutral-900">{template.label}</p>
                <p className="text-xs text-neutral-500">{template.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
