'use client';

import React, { useEffect, useMemo, useState } from 'react';
import type { IUser } from '@/data/posts';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  initialUser: IUser;
  onSave: (u: IUser) => Promise<void> | void;
};

const MAX_NAME = 60;
const MAX_DESC = 300;
const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function isValidHttpUrl(s: string) {
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function hostOkFor(provider: string, url: string) {
  if (!isValidHttpUrl(url)) return false;
  const { hostname } = new URL(url);
  const map: Record<string, string[]> = {
    linkedin: ['linkedin.com'],
    github: ['github.com'],
    youtube: ['youtube.com', 'youtu.be'],
    twitter: ['twitter.com', 'x.com'],
  };
  const allowed = map[provider.toLowerCase()] ?? [];
  return allowed.some((h) => hostname === h || hostname.endsWith('.' + h));
}

export default function ProfileEditModal({ isOpen, onClose, initialUser, onSave }: Props) {
  const [name, setName] = useState(initialUser?.name ?? '');
  const [description, setDescription] = useState(initialUser?.description ?? '');
  const [links, setLinks] = useState(initialUser?.socialLinks ?? {
    linkedin: '', github: '', youtube: '', twitter: ''
  });
  const [avatar, setAvatar] = useState(initialUser?.profilePicture ?? '');
  const [avatarFileError, setAvatarFileError] = useState<string | null>(null);
  const [urlMode, setUrlMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen) return;
    setName(initialUser?.name ?? '');
    setDescription(initialUser?.description ?? '');
    setLinks(initialUser?.socialLinks ?? { linkedin: '', github: '', youtube: '', twitter: '' });
    setAvatar(initialUser?.profilePicture ?? '');
    setAvatarFileError(null);
    setErrors({});
    setSaving(false);
  }, [isOpen, initialUser]);

  // Close on ESC
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const dirty = useMemo(() => {
    return (
      name !== initialUser?.name ||
      description !== initialUser?.description ||
      avatar !== initialUser?.profilePicture ||
      links.linkedin !== initialUser?.socialLinks?.linkedin ||
      links.github !== initialUser?.socialLinks?.github ||
      links.youtube !== initialUser?.socialLinks?.youtube ||
      links.twitter !== initialUser?.socialLinks?.twitter
    );
  }, [name, description, avatar, links, initialUser]);

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Name is required.';
    if (name.trim().length > MAX_NAME) e.name = `Max ${MAX_NAME} characters.`;
    if (description.trim().length > MAX_DESC) e.description = `Max ${MAX_DESC} characters.`;

    (['linkedin', 'github', 'youtube', 'twitter'] as const).forEach((p) => {
      const v = (links as any)[p];
      if (!v) return;
      if (!hostOkFor(p, v)) e[p] = `Invalid ${p} URL.`;
    });

    setErrors(e);
    return Object.keys(e).length === 0 && !avatarFileError;
  }

  function onAvatarFileChange(ev: React.ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0];
    if (!file) return;
    setAvatarFileError(null);
    if (!ALLOWED_TYPES.includes(file.type)) {
      setAvatarFileError('Use JPG, PNG or WEBP.');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setAvatarFileError('Max image size is 2MB.');
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setAvatar(objectUrl);
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    await onSave({
      ...initialUser,
      name: name.trim(),
      description: description.trim(),
      profilePicture: avatar,
      socialLinks: {
        linkedin: links.linkedin?.trim() || '',
        github: links.github?.trim() || '',
        youtube: links.youtube?.trim() || '',
        twitter: links.twitter?.trim() || '',
      },
    });
    setSaving(false);
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
      onMouseDown={(e) => {
        if (e.currentTarget === e.target) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-2xl bg-greyBg rounded-2xl border border-zinc-700/50 shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-700/50">
          <h3 className="text-lg font-semibold text-zinc-100">Edit profile</h3>
          <button
            className="text-zinc-300 hover:text-white"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="px-5 pt-5 flex flex-col items-center">
          <div className="relative w-32 h-32 rounded-xl overflow-hidden border border-zinc-600/50 shadow">
            <img
              src={avatar || '/avatar-placeholder.png'}
              alt="Profile preview"
              className="w-full h-full object-cover"
            />
            <label
              htmlFor="avatarInput"
              className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 hover:opacity-100 cursor-pointer transition"
              title="Change photo"
            >
              <span className="text-xs text-white bg-purple-600/80 rounded-md px-3 py-1">
                Change photo
              </span>
            </label>
            <input
              id="avatarInput"
              type="file"
              accept={ALLOWED_TYPES.join(',')}
              className="hidden"
              onChange={onAvatarFileChange}
            />
          </div>

          <button
            className="mt-3 text-xs text-zinc-300 underline underline-offset-4 hover:text-zinc-100"
            onClick={() => setUrlMode((v) => !v)}
          >
            {urlMode ? 'Hide URL input' : 'Paste image URL instead'}
          </button>
          {urlMode && (
            <input
              type="url"
              placeholder="https://…"
              className="mt-2 w-72 rounded-md bg-zinc-800/70 border border-zinc-600/60 px-3 py-2 text-zinc-100 outline-none focus:border-purple-500"
              value={avatar}
              onChange={(e) => setAvatar(e.target.value)}
            />
          )}
          {avatarFileError && <p className="mt-2 text-xs text-red-400">{avatarFileError}</p>}
        </div>

        <div className="px-5 py-5 grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm text-zinc-300 mb-1">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={MAX_NAME}
              className="w-full rounded-md bg-zinc-800/70 border border-zinc-600/60 px-3 py-2 text-zinc-100 outline-none focus:border-purple-500"
            />
            <div className="flex justify-between">
              {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name}</p>}
              <span className="text-xs text-zinc-400 mt-1 ml-auto">{name.length}/{MAX_NAME}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm text-zinc-300 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={MAX_DESC}
              rows={4}
              className="w-full rounded-md bg-zinc-800/70 border border-zinc-600/60 px-3 py-2 text-zinc-100 outline-none focus:border-purple-500"
            />
            <div className="flex justify-between">
              {errors.description && <p className="text-xs text-red-400 mt-1">{errors.description}</p>}
              <span className="text-xs text-zinc-400 mt-1 ml-auto">{description.length}/{MAX_DESC}</span>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            {(['linkedin','github','youtube','twitter'] as const).map((p) => (
              <div key={p}>
                <label className="block text-sm text-zinc-300 mb-1 capitalize">{p}</label>
                <input
                  type="url"
                  placeholder={`https://${p}.com/username`}
                  value={(links as any)[p] ?? ''}
                  onChange={(e) => setLinks((old) => ({ ...old, [p]: e.target.value }))}
                  className="w-full rounded-md bg-zinc-800/70 border border-zinc-600/60 px-3 py-2 text-zinc-100 outline-none focus:border-purple-500"
                />
                {errors[p] && <p className="text-xs text-red-400 mt-1">{errors[p]}</p>}
              </div>
            ))}
          </div>
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
            onClick={handleSave}
            disabled={saving || !dirty}
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
