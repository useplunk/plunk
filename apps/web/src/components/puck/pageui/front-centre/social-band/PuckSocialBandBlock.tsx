import {LandingBandSection, LandingSocialProof} from '../../../../pageui/landing';
import {normalizeSectionId} from '../shared-fields';
import type {PageUiSocialBandProps} from './types';

export function PuckSocialBandBlock(props: PageUiSocialBandProps) {
  return (
    <LandingBandSection
      id={normalizeSectionId(props.sectionId)}
      title={props.title}
      description={props.description}
      supportingComponent={
        <LandingSocialProof
          showRating={props.showRating ?? true}
          showAvatars={props.showAvatars ?? true}
          numberOfUsers={props.numberOfUsers}
          avatarItems={props.avatars}
        />
      }
    />
  );
}
