import type {ReactNode} from 'react';

import {
  LandingProductTourContent,
  LandingProductTourList,
  LandingProductTourSection,
  LandingProductTourTrigger,
} from '../../../../pageui/landing';
import {VideoPlayer} from '../../../../pageui/shared';
import {normalizeSectionId} from '../../front-centre/shared-fields';
import type {GnomieProductTourProps} from './types';

const titleClassName = 'text-5xl font-semibold leading-tight';

function renderTitle(title: string | ReactNode) {
  if (typeof title !== 'string') {
    return <h2 className={titleClassName}>{title}</h2>;
  }

  const titleLines = title.split('\n');

  return (
    <h2 className={titleClassName}>
      {titleLines.map((line, index) => (
        <span key={`${line}-${index}`}>
          {line}
          {index < titleLines.length - 1 ? <br /> : null}
        </span>
      ))}
    </h2>
  );
}

export function PuckGnomieProductTourBlock(props: GnomieProductTourProps) {
  return (
    <LandingProductTourSection
      id={normalizeSectionId(props.sectionId)}
      titleComponent={renderTitle(props.title)}
      descriptionComponent={
        <div className="flex flex-col max-w-xl">
          <p className="mt-4 md:text-xl">{props.description}</p>
          {props.descriptionSecondary ? (
            <p className="mt-4 md:text-xl opacity-50">{props.descriptionSecondary}</p>
          ) : null}
        </div>
      }
      defaultValue={props.defaultTab}
    >
      <LandingProductTourList>
        {props.items.map(item => (
          <LandingProductTourTrigger key={item.id} value={item.id}>
            <p className="text-xl font-bold">{item.title}</p>
            <p>{item.description}</p>
          </LandingProductTourTrigger>
        ))}
      </LandingProductTourList>

      {props.items.map(item => (
        <LandingProductTourContent key={item.id} value={item.id}>
          <VideoPlayer
            className="w-full rounded-md"
            src={item.videoSrc}
            autoPlay
            controls={false}
            loop
          />
        </LandingProductTourContent>
      ))}
    </LandingProductTourSection>
  );
}
