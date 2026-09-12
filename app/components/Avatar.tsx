"use client";

/* eslint-disable @next/next/no-img-element */

import { useState } from "react";

export default function Avatar({ src, name, className = "" }: { src?: string | null; name: string; className?: string }) {
	const [failedSrc, setFailedSrc] = useState<string | null>(null);
	return (
		<span className={`avatar ${className}`}>
			{src && failedSrc !== src ? (
				<img src={src} alt={name} onError={() => setFailedSrc(src)} />
			) : (
				<span role="img" aria-label={name}>
					{name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase()}
				</span>
			)}
		</span>
	);
}
