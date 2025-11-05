'use client';

import React, { useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const MAX_IMAGES = 5;
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

type MarkdownEditorProps = {
  value: string;
  onChange: (v: string) => void;
  maxLength: number;
};

export default function MarkdownEditor({ value, onChange, maxLength }: MarkdownEditorProps) {
  const [tab, setTab] = useState<'edit' | 'preview'>('edit');
  const [images, setImages] = useState<{ url: string; name: string; size: number }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function insertAtSelection(snippet: string, moveCursorBy = 0) {
    const ta = textareaRef.current;
    if (!ta) return onChange((value || '') + snippet);
    const start = ta.selectionStart ?? value.length;
    const end = ta.selectionEnd ?? value.length;
    const next = value.slice(0, start) + snippet + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start + snippet.length + moveCursorBy, start + snippet.length + moveCursorBy);
    });
  }

  function wrapSelection(prefix: string, suffix: string = '') {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart ?? 0;
    const end = ta.selectionEnd ?? 0;
    const sel = value.slice(start, end);
    const next = value.slice(0, start) + prefix + sel + suffix + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + prefix.length + sel.length + suffix.length;
      ta.setSelectionRange(pos, pos);
    });
  }

  function onImageChooseClick() {
    fileInputRef.current?.click();
  }

  function onFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setError(null);

    const remainingSlots = MAX_IMAGES - images.length;
    if (files.length > remainingSlots) {
      setError(`You can add up to ${MAX_IMAGES} images (you have ${images.length}).`);
      return;
    }

    const accepted: {url:string;name:string;size:number}[] = [];
    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setError('Only JPG, PNG or WEBP images are allowed.');
        return;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        setError('Max image size is 2MB.');
        return;
      }
      const url = URL.createObjectURL(file);
      accepted.push({ url, name: file.name, size: file.size });
    }

    if (!accepted.length) return;

    const mdSnippets = accepted.map(a => `\n\n![${a.name}](${a.url})\n`);
    insertAtSelection(mdSnippets.join(''));
    setImages(prev => [...prev, ...accepted]);
    (e.target as HTMLInputElement).value = '';
  }

  function removeImage(url: string) {
    setImages(prev => prev.filter(i => i.url !== url));
    const regex = new RegExp(`!\\[[^\\]]*\\]\\(${url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)`, 'g');
    onChange(value.replace(regex, ''));
  }

  const chars = value?.length || 0;
  const remaining = maxLength - chars;

  const toolbar = (
    <div className="flex flex-wrap gap-2 bg-zinc-800/50 border border-zinc-700/50 rounded-md px-2 py-1">
      <button className="px-2 py-1 hover:bg-zinc-700/60 rounded" type="button" onClick={() => wrapSelection('**','**')}>Bold</button>
      <button className="px-2 py-1 hover:bg-zinc-700/60 rounded" type="button" onClick={() => wrapSelection('_','_')}>Italic</button>
      <button className="px-2 py-1 hover:bg-zinc-700/60 rounded" type="button" onClick={() => wrapSelection('`','`')}>Code</button>
      <button className="px-2 py-1 hover:bg-zinc-700/60 rounded" type="button" onClick={() => insertAtSelection('\n\n> Quote\n')}>Quote</button>
      <button className="px-2 py-1 hover:bg-zinc-700/60 rounded" type="button" onClick={() => insertAtSelection('\n\n# Heading 1\n')}>H1</button>
      <button className="px-2 py-1 hover:bg-zinc-700/60 rounded" type="button" onClick={() => insertAtSelection('\n\n## Heading 2\n')}>H2</button>
      <button className="px-2 py-1 hover:bg-zinc-700/60 rounded" type="button" onClick={() => insertAtSelection('\n\n- Item 1\n- Item 2\n')}>List</button>
      <button className="px-2 py-1 hover:bg-zinc-700/60 rounded" type="button" onClick={() => insertAtSelection('\n\n1. First\n2. Second\n')}>Ordered</button>
      <button className="px-2 py-1 hover:bg-zinc-700/60 rounded" type="button" onClick={() => wrapSelection('[','](https://)')}>Link</button>
      <button className="px-2 py-1 hover:bg-zinc-700/60 rounded" type="button" onClick={() => insertAtSelection('\n\n---\n')}>HR</button>
      <div className="ml-auto flex items-center gap-2">
        <span className={`text-xs ${remaining < 0 ? 'text-red-400' : 'text-zinc-400'}`}>{chars}/{maxLength}</span>
        <button className={`px-2 py-1 rounded ${tab === 'edit' ? 'bg-purple-600/70' : 'hover:bg-zinc-700/60'}`} type="button" onClick={() => setTab('edit')}>Edit</button>
        <button className={`px-2 py-1 rounded ${tab === 'preview' ? 'bg-purple-600/70' : 'hover:bg-zinc-700/60'}`} type="button" onClick={() => setTab('preview')}>Preview</button>
      </div>
    </div>
  );

  return (
    <div className="space-y-2">
      {toolbar}

      <div className="rounded-md border border-zinc-700/50 bg-zinc-800/40">
        {tab === 'edit' ? (
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={14}
            maxLength={maxLength + 100}
            className="w-full bg-transparent outline-none p-3 text-zinc-100"
            placeholder="Write your post in Markdown…"
          />
        ) : (
          <div className="prose prose-invert max-w-none p-4">
            <ReactMarkdown remarkPlugins={[remarkGfm]}
              components={{
                img({node, ...props}) {
                  return (
                    <img {...props} alt={props.alt ?? ''} className="rounded-md border border-zinc-700/50 max-w-full" />
                  );
                }
              }}
            >
              {value || '_Nothing to preview yet…_'}
            </ReactMarkdown>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onImageChooseClick}
          className="px-3 py-1.5 rounded-md bg-zinc-700/60 hover:bg-zinc-700/80 border border-zinc-600/50"
        >
          Insert image
        </button>
        <span className="text-xs text-zinc-400">{images.length}/{MAX_IMAGES} images</span>
        {error && <span className="text-xs text-red-400">{error}</span>}
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_TYPES.join(',')}
          multiple
          className="hidden"
          onChange={onFilesSelected}
        />
      </div>

      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map(img => (
            <div key={img.url} className="relative">
              <img src={img.url} alt={img.name} className="w-24 h-24 object-cover rounded-md border border-zinc-700/50" />
              <button
                type="button"
                className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-600 text-white text-xs"
                onClick={() => removeImage(img.url)}
                aria-label="Remove image"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
