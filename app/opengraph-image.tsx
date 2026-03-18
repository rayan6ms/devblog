import { ImageResponse } from "next/og";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/seo";

export const alt = `${SITE_NAME} open graph image`;
export const size = {
	width: 1200,
	height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
	return new ImageResponse(
		(
			<div
				style={{
					display: "flex",
					height: "100%",
					width: "100%",
					background:
						"radial-gradient(circle at top left, #0ea5e9 0%, rgba(14,165,233,0.08) 28%), radial-gradient(circle at bottom right, #f59e0b 0%, rgba(245,158,11,0.08) 24%), linear-gradient(135deg, #0f172a 0%, #111827 42%, #1f2937 100%)",
					color: "#f8fafc",
					padding: "72px",
					flexDirection: "column",
					justifyContent: "space-between",
				}}
			>
				<div
					style={{
						display: "flex",
						alignItems: "center",
						gap: "18px",
						fontSize: 32,
						letterSpacing: "0.18em",
						textTransform: "uppercase",
						color: "#94a3b8",
					}}
				>
					<div
						style={{
							width: 18,
							height: 18,
							borderRadius: 999,
							background: "#38bdf8",
						}}
					/>
					DevBlog
				</div>

				<div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
					<div
						style={{
							fontSize: 90,
							fontWeight: 800,
							letterSpacing: "-0.06em",
							lineHeight: 1,
						}}
					>
						{SITE_NAME}
					</div>
					<div
						style={{
							maxWidth: 920,
							fontSize: 36,
							lineHeight: 1.35,
							color: "#cbd5e1",
						}}
					>
						{SITE_DESCRIPTION}
					</div>
				</div>

				<div
					style={{
						display: "flex",
						gap: "16px",
						fontSize: 28,
						color: "#94a3b8",
					}}
				>
					<span>Articles</span>
					<span>Experiments</span>
					<span>Playground</span>
				</div>
			</div>
		),
		size,
	);
}
