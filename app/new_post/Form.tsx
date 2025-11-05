'use client';

import { useForm, SubmitHandler, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import TagsInput from "./TagsInput";
import MainTagInput from "./MainTagInput";
import CircleProgress from './CircleProgress';
import MarkdownEditor from './MarkdownEditor';
import slugify from 'slugify';
import { useRouter } from 'next/navigation';
import React from "react";

const MAX_TITLE = 100;
const MAX_CONTENT = 5000;
const MAX_TAGS = 5;

const postSchema = z.object({
  title: z.string().min(3, "Title is required").max(MAX_TITLE, `Max ${MAX_TITLE} characters`),
  content: z.string().min(30, "Write at least a few lines").max(MAX_CONTENT, `Max ${MAX_CONTENT} characters`),
  author: z.string().min(1, "Author ID is required"),
  mainTag: z.string().min(1, "Main tag is required"),
  tags: z.array(z.string()).min(1, "At least one tag is required").max(MAX_TAGS, `Max ${MAX_TAGS} tags`),
  description: z.string().max(220, "Max 220 characters").optional(),
  status: z.enum(['draft', 'pending_review', 'published']).default('draft'),
  images: z.array(z.string()).optional()
});
type PostFormData = z.infer<typeof postSchema>;
type Mode = 'create' | 'edit';

export default function Form({
  mainTagsOptions,
  mode = 'create',
  initialValues,
  existingSlug,
}: {
  mainTagsOptions: string[];
  mode?: Mode;
  initialValues?: Partial<PostFormData>;
  existingSlug?: string;
}) {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors, isSubmitting },
    reset
  } = useForm<PostFormData>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      title: initialValues?.title ?? '',
      content: initialValues?.content ?? '',
      description: initialValues?.description ?? '',
      tags: initialValues?.tags ?? [],
      mainTag: initialValues?.mainTag ?? '',
      author: initialValues?.author ?? 'mock-user-id-1',
      status: initialValues?.status ?? 'draft'
    }
  });

  const title = watch("title");
  const content = watch("content") || '';

  const handleTagsChange = (tags: string[]) => {
    setValue('tags', tags.slice(0, MAX_TAGS), { shouldValidate: true });
  };

  const handleMainTagSelect = (tag: string) => {
    setValue('mainTag', tag, { shouldValidate: true });
  };

  const onSubmit: SubmitHandler<PostFormData> = async (data) => {
    const plain = data.content.replace(/[#*_>`~\-!\[\]\(\)]/g, ' ').replace(/\s+/g, ' ').trim();
    const description = (data.description && data.description.trim().length)
      ? data.description.trim()
      : plain.slice(0, 180);

    const now = new Date().toISOString();
    const newSlug = slugify(data.title, { lower: true, strict: true });

    const post = {
      image: '',
      mainTag: data.mainTag,
      tags: data.tags,
      title: data.title,
      author: data.author,
      date: now,
      views: 0,
      hasStartedReading: false,
      percentRead: 0,
      description,
      content: data.content,
      status: data.status,
      slug: newSlug,
    };

    const existingRaw = localStorage.getItem('posts');
    const existing = existingRaw ? JSON.parse(existingRaw) : [];

    if (mode === 'edit') {
      const idx = existing.findIndex((p: any) => p.slug === existingSlug);
      if (idx >= 0) {
        existing[idx] = { ...existing[idx], ...post };
      } else {
        existing.unshift(post);
      }
      localStorage.setItem('posts', JSON.stringify(existing));
      alert('Post updated (mock)!');
      router.push(`/post/${newSlug}`);
      return;
    }

    localStorage.setItem('posts', JSON.stringify([post, ...existing]));
    alert('Post saved (mock)!');
    router.push(`/post/${newSlug}`);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="w-full flex flex-col items-center my-2">
      <div className="flex flex-col gap-4 p-4 w-full max-w-4xl">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold uppercase text-wheat">
            {mode === 'edit' ? 'Edit Post' : 'Create New Post'}
          </h2>
          <div className="flex items-center gap-3">
            <label className="text-zinc-300 text-sm">
              Status:
              <select
                className="ml-2 bg-zinc-700/60 border border-zinc-600/60 rounded px-2 py-1 text-zinc-100"
                {...register('status')}
              >
                <option value="draft">Draft</option>
                <option value="pending_review">Pending review</option>
                <option value="published">Published</option>
              </select>
            </label>
          </div>
        </div>

        <label className="block">
          <span className="text-zinc-200">Title:</span>
          <input
            type="text"
            {...register("title")}
            maxLength={MAX_TITLE}
            className="bg-zinc-500/40 p-2.5 mt-1 block w-full rounded-md border border-gray-300/20 shadow-sm outline-none focus:border-purple-500"
            placeholder="e.g. Understanding Promises in JavaScript"
          />
          <div className="flex justify-between">
            <p className="text-red-500">{errors.title?.message}</p>
            <CircleProgress
              size={26}
              progress={(MAX_TITLE - Math.max(0, title?.length || 0)) / MAX_TITLE}
              remaining={MAX_TITLE - (title?.length || 0)}
            />
          </div>
        </label>

        <MainTagInput tags={mainTagsOptions} onTagSelect={handleMainTagSelect} />
        {errors.mainTag && <p className="text-red-500">{errors.mainTag.message}</p>}

        <label className="block">
          <span className="text-zinc-200">Tags:</span>
          <TagsInput onChange={handleTagsChange} maxTags={MAX_TAGS} />
          {errors.tags && <p className="text-red-500">{errors.tags.message}</p>}
        </label>

        <label className="block">
          <span className="text-zinc-200">Short description (optional):</span>
          <input
            type="text"
            {...register("description")}
            maxLength={220}
            className="bg-zinc-500/40 p-2.5 mt-1 block w-full rounded-md border border-gray-300/20 shadow-sm outline-none focus:border-purple-500"
            placeholder="One-liner used in cards and meta…"
          />
          <p className="text-red-500">{errors.description?.message}</p>
        </label>

        <div className="block">
          <span className="text-zinc-200 block mb-1">Content:</span>
          <Controller
            control={control}
            name="content"
            render={({ field }) => (
              <MarkdownEditor
                value={field.value || ''}
                onChange={(v) => field.onChange(v)}
                maxLength={MAX_CONTENT}
              />
            )}
          />
          <div className="flex justify-between">
            <p className="text-red-500">{errors.content?.message}</p>
            <CircleProgress
              size={26}
              progress={(MAX_CONTENT - Math.max(0, content.length)) / MAX_CONTENT}
              remaining={MAX_CONTENT - content.length}
            />
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          {mode === 'create' && (
            <button
              type="button"
              className="px-4 py-2 bg-zinc-700/60 text-white rounded-md hover:bg-zinc-700/80 border border-zinc-600/50"
              onClick={() => reset()}
              disabled={isSubmitting}
            >
              Clear
            </button>
          )}
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
            disabled={isSubmitting}
          >
            {isSubmitting ? (mode === 'edit' ? 'Updating…' : 'Submitting…') : (mode === 'edit' ? 'Update' : 'Submit')}
          </button>
        </div>
      </div>
    </form>
  );
}
