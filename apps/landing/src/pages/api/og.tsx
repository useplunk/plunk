import {ImageResponse} from 'next/og';
import type {NextRequest} from 'next/server';

import {getDisplayFont} from '../../lib/og-font';

export const config = {runtime: 'edge'};

const PLUNK_P_PATH =
  'M955 296.539C955 357.181 939.314 412.83 907.942 463.484C876.57 514.138 830.938 555.517 771.046 587.622C711.155 619.727 639.855 638.633 557.147 644.34L511.158 902.248C493.333 1001.42 444.849 1051 365.707 1051C322.214 1051 281.929 1038.16 244.853 1012.47C208.49 986.791 179.257 947.551 157.154 894.757C135.051 841.963 124 777.04 124 699.988C124 555.161 147.172 432.449 193.517 331.854C240.575 230.546 303.319 154.922 381.749 104.981C460.892 54.327 547.878 29 642.707 29C709.728 29 766.412 40.7717 812.757 64.3152C859.815 87.8586 895.108 119.963 918.637 160.629C942.879 200.582 955 245.885 955 296.539ZM576.398 534.114C722.562 515.565 795.645 439.584 795.645 306.171C795.645 259.084 779.959 220.915 748.587 191.664C717.928 161.699 670.157 146.717 605.274 146.717C531.835 146.717 467.665 169.904 412.764 216.278C358.577 262.651 316.51 327.217 286.564 409.976C257.331 492.021 242.714 585.838 242.714 691.427C242.714 735.66 246.992 774.9 255.548 809.145C264.817 843.39 276.225 870.143 289.772 889.406C304.032 907.956 317.579 917.23 330.413 917.23C348.238 917.23 361.785 892.617 371.054 843.39L406.347 641.13L405.633 646.299L411.708 611.502L416.534 583.854L420.128 561.451L424.529 534.114C433.798 478.466 446.988 403.912 464.1 310.451C468.378 286.194 478.004 269.072 492.977 259.084C508.663 248.382 526.844 243.031 547.521 243.031C571.05 243.031 587.806 247.669 597.788 256.943C608.483 265.505 613.83 279.417 613.83 298.68C613.83 310.095 613.117 319.369 611.691 326.504C597.908 407.581 590.181 453.037 576.398 534.114Z';

export default function handler(req: NextRequest) {
  const {searchParams} = new URL(req.url);
  const title = searchParams.get('title') || 'The Open-Source Email Platform';
  const description = searchParams.get('description') || '';
  const tag = searchParams.get('tag') || '';

  const fontData = getDisplayFont();

  const titleLength = title.length;
  const fontSize = titleLength < 35 ? 144 : titleLength < 55 ? 120 : titleLength < 75 ? 100 : 84;

  return new ImageResponse(
    (
      <div
        style={{
          width: '2400px',
          height: '1260px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '128px 144px',
          backgroundColor: '#ffffff',
          fontFamily: '"Funnel Display"',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Ghost P watermark */}
        <div
          style={{
            position: 'absolute',
            bottom: '-120px',
            right: '-60px',
            opacity: 0.035,
            display: 'flex',
          }}
        >
          <svg width="960" height="960" viewBox="0 0 1080 1080" fill="none">
            <path d={PLUNK_P_PATH} fill="#000000" />
          </svg>
        </div>

        {/* Top row: logo + URL */}
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '20px'}}>
            <svg width="60" height="60" viewBox="0 0 1080 1080" fill="none">
              <path d={PLUNK_P_PATH} fill="#171717" />
            </svg>
            <span
              style={{
                fontSize: '44px',
                fontWeight: 800,
                color: '#171717',
                letterSpacing: '-0.03em',
              }}
            >
              Plunk
            </span>
          </div>
          <span style={{fontSize: '30px', color: '#a3a3a3', letterSpacing: '0.01em'}}>
            useplunk.com
          </span>
        </div>

        {/* Main content */}
        <div style={{display: 'flex', flexDirection: 'column', gap: '36px', maxWidth: '1840px'}}>
          {tag ? (
            /* Row wrapper keeps the chip at its intrinsic width — Satori ignores `fit-content`
               and the column parent would otherwise stretch it to the full frame. */
            <div style={{display: 'flex'}}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px 28px',
                  backgroundColor: '#f4f4f5',
                  borderRadius: '12px',
                  fontSize: '30px',
                  color: '#52525b',
                  fontWeight: 600,
                  letterSpacing: '-0.01em',
                }}
              >
                {tag}
              </div>
            </div>
          ) : null}
          <div
            style={{
              fontSize: `${fontSize}px`,
              fontWeight: 800,
              color: '#0a0a0a',
              lineHeight: 1.08,
              letterSpacing: '-0.04em',
              whiteSpace: 'pre-wrap',
            }}
          >
            {title}
          </div>
          {description ? (
            <div
              style={{
                fontSize: '44px',
                color: '#737373',
                lineHeight: 1.5,
                fontWeight: 400,
                letterSpacing: '-0.01em',
              }}
            >
              {description}
            </div>
          ) : null}
        </div>

        {/* Bottom spacer */}
        <div style={{display: 'flex'}} />
      </div>
    ),
    {
      width: 2400,
      height: 1260,
      fonts: [
        {
          name: 'Funnel Display',
          data: fontData,
          style: 'normal',
          weight: 800,
        },
      ],
    },
  );
}
