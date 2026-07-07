import {
  LandingProductFeaturesGrid,
  LandingProductVideoFeature,
} from '../../../../pageui/landing';
import {normalizeSectionId} from '../../front-centre/shared-fields';
import type {GnomieFeaturesGridProps} from './types';

export function PuckGnomieFeaturesGridBlock(props: GnomieFeaturesGridProps) {
  return (
    <LandingProductFeaturesGrid
      id={normalizeSectionId(props.sectionId)}
      title={props.title}
      description={props.description}
      withBackground={props.withBackground}
      variant="secondary"
    >
      {props.features.map(feature => (
        <LandingProductVideoFeature
          key={feature.title}
          title={feature.title}
          description={feature.description}
          autoPlay={feature.autoPlay}
          variant="secondary"
          videoSrc={feature.videoSrc}
        />
      ))}
    </LandingProductFeaturesGrid>
  );
}
