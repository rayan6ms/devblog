export const MIN_READING_PROGRESS_TO_SAVE = 10;
export const MAX_READING_PROGRESS_TO_SAVE = 80;

export function clampReadingProgress(value: number) {
	if (!Number.isFinite(value)) {
		return 0;
	}

	return Math.max(0, Math.min(Math.round(value), 100));
}

export function shouldPersistReadingProgress(value: number) {
	const progress = clampReadingProgress(value);

	return (
		progress > MIN_READING_PROGRESS_TO_SAVE &&
		progress < MAX_READING_PROGRESS_TO_SAVE
	);
}

export function shouldClearReadingProgress(value: number) {
	return clampReadingProgress(value) >= MAX_READING_PROGRESS_TO_SAVE;
}
