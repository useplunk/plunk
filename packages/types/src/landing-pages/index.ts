/** Puck page data shape (compatible with @puckeditor/core Data) */
export interface PuckData {
  root: {props: Record<string, unknown>};
  content: Array<Record<string, unknown>>;
}

export interface LandingPageSettings {
  title?: string;
  description?: string;
  faviconUrl?: string;
  canonicalUrl?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImageUrl?: string;
  twitterCard?: 'summary' | 'summary_large_image';
  gtmId?: string;
  ga4Id?: string;
  fbPixelId?: string;
}

export interface PublicLandingPageConfig {
  publicId: string;
  name: string;
  data: PuckData;
  settings: LandingPageSettings;
}

export const EMPTY_PUCK_DATA: PuckData = {
  root: {props: {}},
  content: [],
};
