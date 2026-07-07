'use client';

import {AnimatePresence, motion} from 'framer-motion';
import {Play, XIcon} from 'lucide-react';
import {useState} from 'react';

import {cn} from '@plunk/ui';

import type {HeroVideoAnimationStyle} from './types';

const animationVariants = {
  'from-bottom': {
    initial: {y: '100%', opacity: 0},
    animate: {y: 0, opacity: 1},
    exit: {y: '100%', opacity: 0},
  },
  'from-center': {
    initial: {scale: 0.5, opacity: 0},
    animate: {scale: 1, opacity: 1},
    exit: {scale: 0.5, opacity: 0},
  },
  'from-top': {
    initial: {y: '-100%', opacity: 0},
    animate: {y: 0, opacity: 1},
    exit: {y: '-100%', opacity: 0},
  },
  'from-left': {
    initial: {x: '-100%', opacity: 0},
    animate: {x: 0, opacity: 1},
    exit: {x: '-100%', opacity: 0},
  },
  'from-right': {
    initial: {x: '100%', opacity: 0},
    animate: {x: 0, opacity: 1},
    exit: {x: '100%', opacity: 0},
  },
  fade: {
    initial: {opacity: 0},
    animate: {opacity: 1},
    exit: {opacity: 0},
  },
  'top-in-bottom-out': {
    initial: {y: '-100%', opacity: 0},
    animate: {y: 0, opacity: 1},
    exit: {y: '100%', opacity: 0},
  },
  'left-in-right-out': {
    initial: {x: '-100%', opacity: 0},
    animate: {x: 0, opacity: 1},
    exit: {x: '100%', opacity: 0},
  },
} as const;

interface HeroVideoDialogProps {
  animationStyle?: HeroVideoAnimationStyle;
  videoSrc: string;
  thumbnailSrc: string;
  thumbnailAlt?: string;
  className?: string;
  rounded?: boolean;
}

export function HeroVideoDialog({
  animationStyle = 'from-center',
  videoSrc,
  thumbnailSrc,
  thumbnailAlt = 'Video thumbnail',
  className,
  rounded = true,
}: HeroVideoDialogProps) {
  const [isVideoOpen, setIsVideoOpen] = useState(false);
  const selectedAnimation = animationVariants[animationStyle];

  return (
    <div className={cn('relative', className)}>
      <button
        type="button"
        aria-label="Play video"
        className="group relative cursor-pointer border-0 bg-transparent p-0"
        onClick={() => setIsVideoOpen(true)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={thumbnailSrc}
          alt={thumbnailAlt}
          width={1920}
          height={1080}
          className={cn(
            'w-full border shadow-lg transition-all duration-200 ease-out group-hover:brightness-[0.8]',
            rounded ? 'rounded-md' : 'rounded-none',
          )}
        />
        <div
          className={cn(
            'absolute inset-0 flex scale-[0.9] items-center justify-center transition-all duration-200 ease-out group-hover:scale-100',
            rounded ? 'rounded-2xl' : 'rounded-none',
          )}
        >
          <div className="flex size-28 items-center justify-center rounded-full bg-primary/10 backdrop-blur-md">
            <div className="relative flex size-20 scale-100 items-center justify-center rounded-full bg-gradient-to-b from-primary/30 to-primary shadow-md transition-all duration-200 ease-out group-hover:scale-[1.2]">
              <Play
                className="size-8 scale-100 fill-white text-white transition-transform duration-200 ease-out group-hover:scale-105"
                style={{
                  filter:
                    'drop-shadow(0 4px 3px rgb(0 0 0 / 0.07)) drop-shadow(0 2px 2px rgb(0 0 0 / 0.06))',
                }}
              />
            </div>
          </div>
        </div>
      </button>
      <AnimatePresence>
        {isVideoOpen ? (
          <motion.div
            initial={{opacity: 0}}
            animate={{opacity: 1}}
            role="button"
            tabIndex={0}
            onKeyDown={event => {
              if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') {
                setIsVideoOpen(false);
              }
            }}
            onClick={() => setIsVideoOpen(false)}
            exit={{opacity: 0}}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md"
          >
            <motion.div
              {...selectedAnimation}
              transition={{type: 'spring', damping: 30, stiffness: 300}}
              className="relative mx-4 aspect-video w-full max-w-4xl md:mx-0"
              onClick={event => event.stopPropagation()}
            >
              <motion.button
                type="button"
                aria-label="Close video"
                className="absolute -top-16 right-0 rounded-full bg-neutral-900/50 p-2 text-xl text-white ring-1 backdrop-blur-md dark:bg-neutral-100/50 dark:text-black"
                onClick={() => setIsVideoOpen(false)}
              >
                <XIcon className="size-5" />
              </motion.button>
              <div className="relative isolate z-[1] size-full overflow-hidden rounded-2xl border-2 border-white">
                <iframe
                  src={videoSrc}
                  title="Hero Video player"
                  className="mt-0 size-full rounded-2xl"
                  allowFullScreen
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                />
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
