// @ts-nocheck

import React, {
	forwardRef,
	useEffect,
	useImperativeHandle,
	useState,
} from "react";

export default forwardRef((props, ref) => {
	const [selectedIndex, setSelectedIndex] = useState(0);

	const selectItem = (index) => {
		const item = props.items[index];

		if (item) {
			props.command({ id: item });
		}
	};

	const upHandler = () => {
		setSelectedIndex(
			(selectedIndex + props.items.length - 1) % props.items.length,
		);
	};

	const downHandler = () => {
		setSelectedIndex((selectedIndex + 1) % props.items.length);
	};

	const enterHandler = () => {
		selectItem(selectedIndex);
	};

	useEffect(() => setSelectedIndex(0), [props.items]);

	useImperativeHandle(ref, () => ({
		onKeyDown: ({ event }) => {
			if (event.key === "ArrowUp") {
				upHandler();
				return true;
			}

			if (event.key === "ArrowDown") {
				downHandler();
				return true;
			}

			if (event.key === "Enter") {
				enterHandler();
				return true;
			}

			return false;
		},
	}));

	return (
		<div className="z-50 mt-2 w-56 origin-top-right rounded-md bg-white p-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
			{props.items.length ? (
				props.items.map((item, index) => (
					<button
						className={`flex w-full items-center gap-2 px-4 py-2 text-sm text-neutral-700 transition hover:bg-neutral-100 ${
							index === selectedIndex ? "bg-neutral-50" : ""
						}`}
						key={index}
						onClick={() => selectItem(index)}
					>
						{item}
					</button>
				))
			) : (
				<div className="flex w-full items-center gap-2 px-4 py-2 text-sm text-neutral-700 transition hover:bg-neutral-100">
					No result
				</div>
			)}
		</div>
	);
});
