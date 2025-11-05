'use client';

import React, { useEffect, useMemo, useState } from 'react';

type SuggestModalProps = {
  isOpen: boolean;
  onClose: () => void;
  authorId?: string;
};

const MAX_TITLE = 80;
const MAX_DETAILS = 600;
const MIN_TITLE = 5;

export default function SuggestModal({ isOpen, onClose, authorId = 'me' }: SuggestModalProps) {
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setTitle('');
    setDetails('');
    setErrors({});
    setSaving(false);
    setSubmitted(false);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const dirty = useMemo(() => title.trim().length > 0 || details.trim().length > 0, [title, details]);

  function validate() {
    const e: Record<string, string> = {};
    if (title.trim().length < MIN_TITLE) e.title = `Title must be at least ${MIN_TITLE} characters.`;
    if (title.trim().length > MAX_TITLE) e.title = `Max ${MAX_TITLE} characters.`;
    if (details.trim().length > MAX_DETAILS) e.details = `Max ${MAX_DETAILS} characters.`;
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function saveSuggestion() {
    const suggestion = {
      id: `${Date.now()}`,
      title: title.trim(),
      details: details.trim(),
      authorId,
      createdAt: new Date().toISOString(),
      status: 'pending' as const,
    };
    try {
      const raw = localStorage.getItem('postSuggestions');
      const arr = raw ? (JSON.parse(raw) as any[]) : [];
      arr.unshift(suggestion);
      localStorage.setItem('postSuggestions', JSON.stringify(arr));
    } catch {
      // todo
    }
  }

  async function handleSubmit() {
    if (!validate()) return;
    setSaving(true);
    saveSuggestion();
    setSaving(false);
    setSubmitted(true);
    setTimeout(() => {
      onClose();
    }, 900);
  }

  if (!isOpen) return null;

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
      <div className="relative w-full max-w-xl bg-greyBg rounded-2xl border border-zinc-700/50 shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-700/50">
          <h3 className="text-lg font-semibold text-zinc-100">Suggest a post</h3>
          <button
            className="text-zinc-300 hover:text-white"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="px-5 py-5 space-y-4">
          <div>
            <label className="block text-sm text-zinc-300 mb-1">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={MAX_TITLE}
              placeholder="e.g. Understanding React Server Components in Next 14"
              className="w-full rounded-md bg-zinc-800/70 border border-zinc-600/60 px-3 py-2 text-zinc-100 outline-none focus:border-purple-500"
            />
            <div className="flex justify-between">
              {errors.title && <p className="text-xs text-red-400 mt-1">{errors.title}</p>}
              <span className="text-xs text-zinc-400 mt-1 ml-auto">
                {title.length}/{MAX_TITLE}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm text-zinc-300 mb-1">What’s the idea?</label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              maxLength={MAX_DETAILS}
              rows={5}
              placeholder="Add a short outline, bullet points, or links for context (optional)."
              className="w-full rounded-md bg-zinc-800/70 border border-zinc-600/60 px-3 py-2 text-zinc-100 outline-none focus:border-purple-500"
            />
            <div className="flex justify-between">
              {errors.details && <p className="text-xs text-red-400 mt-1">{errors.details}</p>}
              <span className="text-xs text-zinc-400 mt-1 ml-auto">
                {details.length}/{MAX_DETAILS}
              </span>
            </div>
          </div>

          <p className="text-xs text-zinc-400">
            Your suggestion will be reviewed before publishing. Please avoid sensitive data or personal info.
          </p>
        </div>

        <div className="px-5 pb-5 flex items-center justify-end gap-3">
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
            disabled={saving || !dirty}
          >
            {submitted ? 'Submitted!' : saving ? 'Submitting…' : 'Submit suggestion'}
          </button>
        </div>
      </div>
    </div>
  );
}
