'use client';

import { useEffect, useMemo, useState } from 'react';

type ReportPayload = {
  commentId: number;
  reason: string;
  details?: string;
  dateISO: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  comment?: { id: number; author: string; text: string };
  onSubmit: (payload: ReportPayload) => void;
};

const REASONS = [
  'Spam',
  'Harassment or hate',
  'Sexual / explicit',
  'Violence / threat',
  'Misinformation',
  'Other',
] as const;

const MAX_DETAILS = 300;
const MIN_DETAILS_IF_OTHER = 10;

export default function ReportCommentModal({ isOpen, onClose, comment, onSubmit }: Props) {
  const [reason, setReason] = useState<string>('');
  const [details, setDetails] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setReason('');
    setDetails('');
    setSaving(false);
    setError(null);
  }, [isOpen, comment?.id]);

  const valid = useMemo(() => {
    if (!reason) return false;
    if (reason === 'Other') {
      const len = details.trim().length;
      if (len < MIN_DETAILS_IF_OTHER || len > MAX_DETAILS) return false;
    } else if (details.trim().length > MAX_DETAILS) {
      return false;
    }
    return true;
  }, [reason, details]);

  function handleSubmit() {
    if (!comment) return;
    if (!valid) {
      setError('Please complete all required fields.');
      return;
    }
    setSaving(true);
    onSubmit({
      commentId: comment.id,
      reason,
      details: details.trim() || undefined,
      dateISO: new Date().toISOString(),
    });
    setSaving(false);
    onClose();
  }

  if (!isOpen || !comment) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.currentTarget === e.target) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-lg bg-greyBg rounded-2xl border border-zinc-700/50 shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-700/50">
          <h3 className="text-lg font-semibold text-zinc-100">Report comment</h3>
          <button className="text-zinc-300 hover:text-white" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div className="bg-zinc-800/60 border border-zinc-600/40 rounded-md p-3">
            <p className="text-sm text-zinc-300">
              Reporting comment by <span className="font-medium text-zinc-100">{comment.author}</span>:
            </p>
            <p className="mt-2 text-sm text-zinc-400 line-clamp-3">{comment.text}</p>
          </div>

          <div>
            <label className="block text-sm text-zinc-300 mb-1">Reason</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-md bg-zinc-800/70 border border-zinc-600/60 px-3 py-2 text-zinc-100 outline-none focus:border-purple-500"
            >
              <option value="" disabled>Choose a reason…</option>
              {REASONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-zinc-300 mb-1">
              Details {reason === 'Other' ? `(min ${MIN_DETAILS_IF_OTHER} chars)` : '(optional)'}
            </label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              maxLength={MAX_DETAILS}
              rows={4}
              className="w-full rounded-md bg-zinc-800/70 border border-zinc-600/60 px-3 py-2 text-zinc-100 outline-none focus:border-purple-500"
              placeholder={reason === 'Other' ? 'Describe the issue…' : 'Add context (optional)…'}
            />
            <div className="flex justify-end">
              <span className="text-xs text-zinc-400">{details.length}/{MAX_DETAILS}</span>
            </div>
            {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
          </div>
        </div>

        <div className="px-5 pb-5 flex justify-end gap-3">
          <button
            className="px-4 py-2 rounded-md bg-zinc-700/60 text-zinc-100 hover:bg-zinc-700/80 border border-zinc-600/50"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 rounded-md bg-purpleContrast hover:bg-purple-500 text-white shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleSubmit}
            disabled={saving || !valid}
          >
            {saving ? 'Submitting…' : 'Submit report'}
          </button>
        </div>
      </div>
    </div>
  );
}
