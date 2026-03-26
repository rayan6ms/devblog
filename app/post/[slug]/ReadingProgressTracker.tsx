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
const VIEWED_POSTS_STORAGE_PREFIX = "devblog:tracked-post-views:";

function getArticleElement() {
	return document.querySelector<HTMLElement>(ARTICLE_SELECTOR);
}

function getReadingProgress(article: HTMLElement) {
	const rect = article.getBoundingClientRect();
	const articleTop = window.scrollY + rect.top;
	const articleHeight = Math.max(
		article.scrollHeight,
		article.offsetHeight,
		rect.height,
		1,
	);
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

export default function ReadingProgressTracker({
	postId,
	postSlug,
}: {
	postId: string;
	postSlug: string;
}) {
	const { data: session, status } = useSession();
	const maxProgressRef = useRef(0);
	const lastSyncedRef = useRef<number | null>(null);
	const pendingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const frameRef = useRef<number | null>(null);

	useEffect(() => {
		if (status === "loading") {
			return;
		}

		const viewerKey = session?.user?.id || "anon";
		const storageKey = `${VIEWED_POSTS_STORAGE_PREFIX}${viewerKey}`;

		try {
			const storedIds = new Set<string>(
				JSON.parse(localStorage.getItem(storageKey) || "[]") as string[],
			);
			if (storedIds.has(postId)) {
				return;
			}

			void fetch(`/api/post/${encodeURIComponent(postSlug)}/view`, {
				method: "POST",
				cache: "no-store",
				credentials: "same-origin",
			})
				.then((response) => {
					if (!response.ok) {
						return;
					}

					storedIds.add(postId);
					localStorage.setItem(storageKey, JSON.stringify(Array.from(storedIds)));
				})
				.catch(() => {});
		} catch {}
	}, [postId, postSlug, session?.user?.id, status]);

	useEffect(() => {
		if (status !== "authenticated" || !session?.user?.id) {
			return;
		}

		const article = getArticleElement();
		if (!article) {
			return;
		}

		const progressUrl = `/api/progress?postId=${encodeURIComponent(postId)}`;
		const abortController = new AbortController();

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
				const beaconAccepted = navigator.sendBeacon(
					"/api/progress",
					new Blob([body], { type: "application/json" }),
				);
				if (beaconAccepted) {
					lastSyncedRef.current = nextProgress;
				}
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
			const nextProgress = getReadingProgress(article);
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
			if (frameRef.current) {
				cancelAnimationFrame(frameRef.current);
				frameRef.current = null;
			}
			clearPendingTimer();
			syncProgress(maxProgressRef.current, true);
		};

		const scheduleProgressUpdate = () => {
			if (frameRef.current) {
				return;
			}

			frameRef.current = window.requestAnimationFrame(() => {
				frameRef.current = null;
				updateProgress();
			});
		};

		const handleVisibilityChange = () => {
			if (document.visibilityState === "hidden") {
				flushProgress();
			}
		};

		void fetch(progressUrl, {
			cache: "no-store",
			credentials: "same-origin",
			signal: abortController.signal,
		})
			.then(async (response) => {
				if (!response.ok) {
					return null;
				}

				return response.json() as Promise<{ percentageRead?: number }>;
			})
			.then((result) => {
				const savedProgress = clampReadingProgress(result?.percentageRead ?? 0);
				if (savedProgress > 0) {
					maxProgressRef.current = savedProgress;
					lastSyncedRef.current = savedProgress;
				}
			})
			.catch((error) => {
				if (error instanceof DOMException && error.name === "AbortError") {
					return;
				}
			})
			.finally(() => {
				scheduleProgressUpdate();
			});

		const resizeObserver =
			typeof ResizeObserver === "function"
				? new ResizeObserver(() => {
						scheduleProgressUpdate();
					})
				: null;

		resizeObserver?.observe(article);
		article.addEventListener("load", scheduleProgressUpdate, true);
		window.addEventListener("resize", scheduleProgressUpdate, {
			passive: true,
		});
		updateProgress();
		window.addEventListener("scroll", scheduleProgressUpdate, {
			passive: true,
		});
		window.addEventListener("pagehide", flushProgress);
		document.addEventListener("visibilitychange", handleVisibilityChange);

		return () => {
			abortController.abort();
			window.removeEventListener("scroll", scheduleProgressUpdate);
			window.removeEventListener("resize", scheduleProgressUpdate);
			window.removeEventListener("pagehide", flushProgress);
			document.removeEventListener("visibilitychange", handleVisibilityChange);
			article.removeEventListener("load", scheduleProgressUpdate, true);
			resizeObserver?.disconnect();
			flushProgress();
		};
	}, [postId, session?.user?.id, status]);

	return null;
}
