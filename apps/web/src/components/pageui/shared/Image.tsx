import type {ImgHTMLAttributes} from 'react';

export interface PageUiImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
}

export function PageUiImage({src, alt, className, ...rest}: PageUiImageProps) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={className} {...rest} />;
}
