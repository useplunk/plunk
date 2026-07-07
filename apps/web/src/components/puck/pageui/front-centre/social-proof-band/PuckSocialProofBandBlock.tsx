import {
  LandingSocialProofBand,
  LandingSocialProofBandItem,
} from '../../../../pageui/landing';
import {normalizeSectionId} from '../shared-fields';
import type {PageUiSocialProofBandProps, SocialProofBandGraphic} from './types';

export function PuckSocialProofBandBlock({
  text,
  graphic,
  invert,
  hiddenOnMobile,
  sectionId,
}: PageUiSocialProofBandProps) {
  return (
    <LandingSocialProofBand
      id={normalizeSectionId(sectionId)}
      invert={invert}
      className={hiddenOnMobile ? 'hidden md:flex' : undefined}
    >
      <LandingSocialProofBandItem graphic={graphic as SocialProofBandGraphic}>
        {text}
      </LandingSocialProofBandItem>
    </LandingSocialProofBand>
  );
}
