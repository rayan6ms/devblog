"use client";

import { useLayoutEffect, useRef, useState } from "react";

type Size = {
	width: number;
	height: number;
};

export function useElementSize<T extends HTMLElement>() {
	const ref = useRef<T | null>(null);
	const [size, setSize] = useState<Size>({ width: 0, height: 0 });

	useLayoutEffect(() => {
		const el = ref.current;
		if (!el) return;

		const update = () => {
			const rect = el.getBoundingClientRect();
			setSize({
				width: Math.max(1, rect.width),
				height: Math.max(1, rect.height),
			});
		};

		update();
		const ro = new ResizeObserver(update);
		ro.observe(el);
		return () => ro.disconnect();
	}, []);

	return { ref, size };
}
