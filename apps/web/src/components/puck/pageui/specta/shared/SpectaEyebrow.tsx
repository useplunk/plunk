import {cn} from '../../../../pageui/shared/cn';

export function SpectaEyebrow({text, className}: {text: string; className?: string}) {
  return (
    <p
      className={cn(
        'text-xl font-semibold tracking-wider bg-clip-text bg-gradient-to-r text-transparent from-pink-500 via-pink-400 to-pink-500',
        className,
      )}
    >
      {text}
    </p>
  );
}

export function SpectaTitle({text, className}: {text: string; className?: string}) {
  return (
    <h2 className={cn('text-4xl font-semibold leading-tight', className)}>{text}</h2>
  );
}

export function SpectaHeroTitle({text, className}: {text: string; className?: string}) {
  return (
    <h1 className={cn('text-2xl md:text-3xl lg:text-4xl leading-tight font-semibold md:max-w-2xl', className)}>
      {text}
    </h1>
  );
}
