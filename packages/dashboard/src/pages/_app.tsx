import "../../styles/index.css";

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { Provider as JotaiProvider } from "jotai";
import type { AppProps } from "next/app";
import Head from "next/head";
import Router, { useRouter } from "next/router";
import NProgress from "nprogress";
import React from "react";
import { Toaster } from "sonner";
import { SWRConfig } from "swr";
import { network } from "../lib/network";
import "nprogress/nprogress.css";
import advancedFormat from "dayjs/plugin/advancedFormat";
import duration from "dayjs/plugin/duration";
import relativeTime from "dayjs/plugin/relativeTime";
import { DefaultSeo } from "next-seo";
import { FullscreenLoader, Redirect } from "../components";
import { NO_AUTH_ROUTES } from "../lib/constants";
import { useUser } from "../lib/hooks/users";

dayjs.extend(relativeTime);
dayjs.extend(utc);
dayjs.extend(advancedFormat);
dayjs.extend(duration);

Router.events.on("routeChangeStart", () => NProgress.start());
Router.events.on("routeChangeComplete", () => NProgress.done());
Router.events.on("routeChangeError", () => NProgress.done());

/**
 * Main app component
 * @param props Props
 * @param props.Component App component
 * @param props.pageProps
 */
function App({ Component, pageProps }: AppProps) {
	const router = useRouter();
	const { data: user, error } = useUser();

	if (error && !NO_AUTH_ROUTES.includes(router.route)) {
		return <Redirect to={"/auth/login"} />;
	}

	if (!user && !NO_AUTH_ROUTES.includes(router.route)) {
		return <FullscreenLoader />;
	}

	return (
		<>
			<Head>
				<title>Plunk Dashboard | The Email Platform for SaaS</title>
				<meta
					name="viewport"
					content="width=device-width, initial-scale=1.0"
					key={"viewport"}
				/>
			</Head>

			<Toaster position={"bottom-right"} />
			<Component {...pageProps} />
		</>
	);
}

/**
 * Main app root component that houses all components
 * @param props Default nextjs props
 */
export default function WithProviders(props: AppProps) {
	return (
		<SWRConfig
			value={{
				fetcher: (url: string) => network.fetch("GET", url),
				revalidateOnFocus: true,
			}}
		>
			<JotaiProvider>
				<DefaultSeo
					defaultTitle={"Plunk Dashboard | The Email Platform for SaaS"}
					title={"Plunk Dashboard | The Email Platform for SaaS"}
					description={
						"Plunk is the affordable, developer-friendly email platform that brings together marketing, transactional and broadcast emails into one single, complete solution"
					}
					twitter={{
						cardType: "summary_large_image",
						handle: "@useplunk",
						site: "@useplunk",
					}}
					openGraph={{
						title: "Plunk Dashboard | The Email Platform for SaaS",
						description:
							"Plunk is the affordable, developer-friendly email platform that brings together marketing, transactional and broadcast emails into one single, complete solution",
						images: [
							{ url: "https://app.useplunk.com/assets/card.png", alt: "Plunk" },
						],
					}}
				/>

				<App {...props} />
			</JotaiProvider>
		</SWRConfig>
	);
}
