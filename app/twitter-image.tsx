import { ImageResponse } from "next/og";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/seo";

export const alt = `${SITE_NAME} social image`;
export const size = {
	width: 1200,
	height: 630,
};
export const contentType = "image/png";

export default function TwitterImage() {
	return new ImageResponse(
		(
			<div
				style={{
					display: "flex",
					height: "100%",
					width: "100%",
					background:
						"linear-gradient(160deg, #111827 0%, #0f172a 38%, #1e293b 100%)",
					color: "#f8fafc",
					padding: "72px",
					flexDirection: "column",
					justifyContent: "space-between",
					border: "12px solid rgba(148, 163, 184, 0.16)",
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
							background: "#f59e0b",
						}}
					/>
					Interactive dev writing
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
					<span>Tutorials</span>
					<span>Frontend notes</span>
					<span>Side projects</span>
				</div>
			</div>
		),
		size,
	);
}
