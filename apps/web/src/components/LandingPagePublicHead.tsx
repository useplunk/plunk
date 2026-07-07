import type {LandingPageSettings} from '@plunk/types';
import Head from 'next/head';
import Script from 'next/script';

interface LandingPagePublicHeadProps {
  name: string;
  publicId: string;
  pageUrl: string;
  settings: LandingPageSettings;
}

export function LandingPagePublicHead({name, publicId, pageUrl, settings}: LandingPagePublicHeadProps) {
  const pageTitle = settings.title || name;
  const pageDescription = settings.description;
  const ogTitle = settings.ogTitle || pageTitle;
  const ogDescription = settings.ogDescription || pageDescription;
  const canonicalUrl = settings.canonicalUrl || pageUrl;
  const twitterCard =
    settings.twitterCard || (settings.ogImageUrl ? 'summary_large_image' : 'summary');

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        {pageDescription ? <meta name="description" content={pageDescription} /> : null}
        <link rel="canonical" href={canonicalUrl} />
        {settings.faviconUrl ? <link rel="icon" href={settings.faviconUrl} /> : null}

        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:title" content={ogTitle} />
        {ogDescription ? <meta property="og:description" content={ogDescription} /> : null}
        {settings.ogImageUrl ? <meta property="og:image" content={settings.ogImageUrl} /> : null}

        <meta name="twitter:card" content={twitterCard} />
        <meta name="twitter:title" content={ogTitle} />
        {ogDescription ? <meta name="twitter:description" content={ogDescription} /> : null}
        {settings.ogImageUrl ? <meta name="twitter:image" content={settings.ogImageUrl} /> : null}
      </Head>

      {settings.gtmId ? (
        <>
          <Script id={`gtm-${publicId}`} strategy="afterInteractive">
            {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${settings.gtmId}');`}
          </Script>
          <noscript>
            <iframe
              title="Google Tag Manager"
              src={`https://www.googletagmanager.com/ns.html?id=${settings.gtmId}`}
              height="0"
              width="0"
              style={{display: 'none', visibility: 'hidden'}}
            />
          </noscript>
        </>
      ) : null}

      {settings.ga4Id ? (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${settings.ga4Id}`}
            strategy="afterInteractive"
          />
          <Script id={`ga4-${publicId}`} strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}
gtag('js',new Date());gtag('config','${settings.ga4Id}');`}
          </Script>
        </>
      ) : null}

      {settings.fbPixelId ? (
        <>
          <Script id={`fb-pixel-${publicId}`} strategy="afterInteractive">
            {`!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window,document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${settings.fbPixelId}');fbq('track','PageView');`}
          </Script>
          <noscript>
            <img
              alt=""
              height="1"
              width="1"
              style={{display: 'none'}}
              src={`https://www.facebook.com/tr?id=${settings.fbPixelId}&ev=PageView&noscript=1`}
            />
          </noscript>
        </>
      ) : null}
    </>
  );
}
