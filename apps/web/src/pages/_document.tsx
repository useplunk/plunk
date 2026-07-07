import {Head, Html, Main, NextScript} from 'next/document';

function Document({locale}: {locale: string}) {
  return (
    <Html lang={locale}>
      <Head>
        {/* Viewport */}
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />

        {/* Primary Meta Tags */}
        <meta name="title" content="Plunk | Email Platform Dashboard" />
        <meta
          name="description"
          content="Manage your email campaigns, contacts, and analytics with Plunk - the open-source email platform."
        />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Plunk | Email Platform Dashboard" />
        <meta
          property="og:description"
          content="Manage your email campaigns, contacts, and analytics with Plunk - the open-source email platform."
        />
        <meta property="og:image" content="https://next-app.useplunk.com/api/og?title=Email%20Platform%20Dashboard" />

        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:title" content="Plunk | Email Platform Dashboard" />
        <meta
          property="twitter:description"
          content="Manage your email campaigns, contacts, and analytics with Plunk - the open-source email platform."
        />
        <meta property="twitter:image" content="https://next-app.useplunk.com/api/og?title=Email%20Platform%20Dashboard" />

        {/* Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@100;200;300;400;500;600;700;800;900&family=Montserrat:wght@400;500;600;700&family=Hind:wght@400;600&display=swap"
          rel="stylesheet"
        />

        {/* Favicon */}
        <link rel="icon" type="image/svg+xml" href="/favicon/favicon.svg" />
        <link rel="icon" type="image/png" href="/favicon/favicon-32x32.png" sizes="32x32" />
        <link rel="icon" type="image/png" href="/favicon/favicon-16x16.png" sizes="16x16" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/favicon/apple-touch-icon.png" />
        <link rel="mask-icon" href="/favicon/safari-pinned-tab.svg" color="#5bbad5" />
        <meta name="apple-mobile-web-app-title" content="Plunk" />
        <meta name="application-name" content="Plunk" />
        <meta name="msapplication-TileColor" content="#da532c" />
        <meta name="theme-color" content="#ffffff" />
        <link rel="manifest" href="/favicon/site.webmanifest" />
      </Head>
      <body className="antialiased cursor-default scroll-smooth text-neutral-800">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}

export default Document;
