"use client";
import { FaArrowLeft, FaArrowRight } from "react-icons/fa6";
import { useI18n } from "./LocaleProvider";
export default function Pagination({
	currentPage,
	totalPages,
	onPageChange,
}: {
	currentPage: number;
	totalPages: number;
	onPageChange: (page: number) => void;
}) {
	const { messages } = useI18n();
	if (totalPages <= 1) return null;
	const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
	const pages = Array.from(
		{ length: Math.min(5, totalPages) },
		(_, index) => start + index,
	);
	return (
		<nav className="pagination" aria-label={messages.recent.pageControls}>
			<button
				type="button"
				className="ui-button"
				disabled={currentPage === 1}
				onClick={() => onPageChange(currentPage - 1)}
				aria-label={messages.common.previous}
			>
				<FaArrowLeft aria-hidden="true" />
			</button>
			{pages.map((page) => (
				<button
					type="button"
					className="ui-button"
					key={page}
					aria-current={currentPage === page ? "page" : undefined}
					onClick={() => onPageChange(page)}
				>
					{page}
				</button>
			))}
			<button
				type="button"
				className="ui-button"
				disabled={currentPage === totalPages}
				onClick={() => onPageChange(currentPage + 1)}
				aria-label={messages.common.next}
			>
				<FaArrowRight aria-hidden="true" />
			</button>
		</nav>
	);
}
