import type { ReactNode } from "react";
export default function PageIntro({
	title,
	description,
	children,
}: {
	title: string;
	description?: string;
	children?: ReactNode;
}) {
	return (
		<header className="page-intro">
			<div>
				<h1>{title}</h1>
				{description && <p>{description}</p>}
			</div>
			{children}
		</header>
	);
}
