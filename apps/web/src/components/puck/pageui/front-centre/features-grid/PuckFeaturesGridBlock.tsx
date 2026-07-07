import {
  LandingProductFeature,
  LandingProductFeaturesGrid,
  LandingProductVideoFeature,
} from '../../../../pageui/landing';
import {normalizeSectionId} from '../shared-fields';
import type {PageUiFeaturesGridProps} from './types';

export function PuckFeaturesGridBlock({title, description, items, sectionId}: PageUiFeaturesGridProps) {
  return (
    <LandingProductFeaturesGrid
      id={normalizeSectionId(sectionId)}
      title={title}
      description={description}
      withBackground={false}
    >
      {items.map((item, index) =>
        item.type === 'image' ? (
          <LandingProductFeature
            key={`feature-${index}`}
            title={item.title}
            description={item.description}
            imageSrc={item.imageSrc}
            imageAlt={item.title}
          />
        ) : (
          <LandingProductVideoFeature
            key={`feature-${index}`}
            title={item.title}
            description={item.description}
            autoPlay={item.autoPlay}
            videoSrc={item.videoSrc}
          />
        ),
      )}
    </LandingProductFeaturesGrid>
  );
}
