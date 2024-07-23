/**
 *
 */
import { LineWobble } from "@uiball/loaders";

/**
 *
 */
export default function FullscreenLoader() {
	return (
		<div className="flex min-h-screen flex-col items-center justify-center p-4 py-12 sm:px-6 lg:px-8">
			<div className="mt-8 flex flex-col items-center justify-center sm:mx-auto sm:w-full sm:max-w-lg">
				<h1 className="mt-3 text-center font-medium" suppressHydrationWarning>
					Loading...
				</h1>
				<p className={"text-center text-sm text-neutral-600"}>
					Does this take longer than expected? Try clearing your browser's cache
					or check if you have an ad blocker enabled!
				</p>
				<div className={"mt-6"}>
					<LineWobble size={200} color={"#262626"} />
				</div>
			</div>
		</div>
	);
}
