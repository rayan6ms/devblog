"use client";

import { useSession } from "next-auth/react";
import { useEffect, useRef } from "react";
import {
	clampReadingProgress,
	shouldClearReadingProgress,
	shouldPersistReadingProgress,
} from "@/lib/reading-progress";

const AUTOSAVE_DELAY_MS = 4000;
const ARTICLE_SELECTOR = '[data-reading-progress-root="true"]';

function getReadingProgress() {
	const article = document.querySelector<HTMLElement>(ARTICLE_SELECTOR);
	if (!article) {
		return 0;
	}

	const rect = article.getBoundingClientRect();
	const articleTop = window.scrollY + rect.top;
	const articleHeight = article.offsetHeight;
	const viewportHeight =
		window.innerHeight || document.documentElement.clientHeight;

	if (articleHeight <= viewportHeight) {
		const articleBottom = articleTop + articleHeight;
		const viewportBottom = window.scrollY + viewportHeight;

		if (viewportBottom >= articleBottom) {
			return 100;
		}

		if (viewportBottom <= articleTop) {
			return 0;
		}

		return clampReadingProgress(
			((viewportBottom - articleTop) / Math.max(articleHeight, 1)) * 100,
		);
	}

	const rawProgress =
		((window.scrollY - articleTop) /
			Math.max(articleHeight - viewportHeight, 1)) *
		100;

	return clampReadingProgress(rawProgress);
}

export default function ReadingProgressTracker({ postId }: { postId: string }) {
	const { data: session, status } = useSession();
	const maxProgressRef = useRef(0);
	const lastSyncedRef = useRef<number | null>(null);
	const pendingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		if (status !== "authenticated" || !session?.user?.id) {
			return;
		}

		const clearPendingTimer = () => {
			if (pendingTimerRef.current) {
				clearTimeout(pendingTimerRef.current);
				pendingTimerRef.current = null;
			}
		};

		const syncProgress = (progress: number, preferBeacon = false) => {
			const nextProgress = clampReadingProgress(progress);
			const shouldSync =
				shouldPersistReadingProgress(nextProgress) ||
				shouldClearReadingProgress(nextProgress);

			if (!shouldSync || lastSyncedRef.current === nextProgress) {
				return;
			}

			const body = JSON.stringify({
				post: postId,
				percentageRead: nextProgress,
			});

			if (preferBeacon && typeof navigator.sendBeacon === "function") {
				navigator.sendBeacon(
					"/api/progress",
					new Blob([body], { type: "application/json" }),
				);
				lastSyncedRef.current = nextProgress;
				return;
			}

			void fetch("/api/progress", {
				method: "POST",
				body,
				cache: "no-store",
				credentials: "same-origin",
				headers: {
					"Content-Type": "application/json",
				},
				keepalive: preferBeacon,
			})
				.then((response) => {
					if (!response.ok) {
						return;
					}

					lastSyncedRef.current = nextProgress;
				})
				.catch(() => {});
		};

		const queueSync = () => {
			clearPendingTimer();
			pendingTimerRef.current = setTimeout(() => {
				syncProgress(maxProgressRef.current);
			}, AUTOSAVE_DELAY_MS);
		};

		const updateProgress = () => {
			const nextProgress = getReadingProgress();
			if (nextProgress <= maxProgressRef.current) {
				return;
			}

			maxProgressRef.current = nextProgress;

			if (
				shouldPersistReadingProgress(nextProgress) ||
				shouldClearReadingProgress(nextProgress)
			) {
				queueSync();
			}
		};

		const flushProgress = () => {
			clearPendingTimer();
			syncProgress(maxProgressRef.current, true);
		};

		const handleVisibilityChange = () => {
			if (document.visibilityState === "hidden") {
				flushProgress();
			}
		};

		updateProgress();
		window.addEventListener("scroll", updateProgress, { passive: true });
		window.addEventListener("pagehide", flushProgress);
		document.addEventListener("visibilitychange", handleVisibilityChange);

		return () => {
			window.removeEventListener("scroll", updateProgress);
			window.removeEventListener("pagehide", flushProgress);
			document.removeEventListener("visibilitychange", handleVisibilityChange);
			flushProgress();
		};
	}, [postId, session?.user?.id, status]);

	return null;
}
