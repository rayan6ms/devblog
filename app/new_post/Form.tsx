'use client';

import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import TagsInput from "./TagsInput";
import MainTagInput from "./MainTagInput";
import CircleProgress from './CircleProgress';

const postSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  author: z.string().min(1, "Author ID is required"),
  mainTag: z.string().min(1, "Main tag is required"),
  tags: z.array(z.string()).min(1, "At least one tag is required"),
  description: z.string().optional(),
  views: z.number().optional(),
  viewedBy: z.array(z.string()).optional(),
  bookmarks: z.number().optional(),
  edited: z.boolean().optional(),
  editedBy: z.string().optional(),
  postedAt: z.date().optional(),
  lastEditedAt: z.date().optional(),
  comments: z.array(z.string()).optional(),
  status: z.enum(['draft', 'pending_review', 'published']).optional()
});

type PostFormData = z.infer<typeof postSchema>;

export default function Form({ mainTagsOptions }: { mainTagsOptions: string[] }) {
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<PostFormData>({
    resolver: zodResolver(postSchema)
  });

  const title = watch("title");
  const content = watch("content");
  const maxTitleLength = 100;
  const maxContentLength = 1000;

  const handleTagsChange = (tags: string[]) => {
    setValue('tags', tags, { shouldValidate: true });
  }

  const onSubmit: SubmitHandler<PostFormData> = data => {
    console.log(data);
  };

  const handleMainTagSelect = (tag: string) => {
    setValue('mainTag', tag, { shouldValidate: true });
    // Fechar dropdown ou limpar filtro aqui, se necessário 
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="w-full flex flex-col items-center my-2">
      <div className="flex flex-col gap-4 p-4 w-full max-w-4xl">
        <h2 className="text-xl font-bold uppercase text-wheat">
          Create New Post
        </h2>
        <label className="block">
          <span className="text-zinc-200">Title:</span>
          <input type="text" {...register("title")} className="bg-zinc-500/40 p-2.5 mt-1 block w-full rounded-md border border-gray-300/20 shadow-sm" />
          <div className="flex justify-between">
            <p className="text-red-500">{errors.title?.message}</p>
            <CircleProgress
              size={26}
              progress={(maxTitleLength - Math.max(0, title?.length)) / maxTitleLength}
              remaining={maxTitleLength - title?.length}
            />
          </div>
        </label>
        <MainTagInput tags={mainTagsOptions} onTagSelect={handleMainTagSelect} />
        <label className="block">
          <span className="text-zinc-200">Tags:</span>
          <TagsInput onChange={handleTagsChange} />
          {errors.tags && <p className="text-red-500">At least one tag is required</p>}
        </label>
        <label className="block">
          <span className="text-zinc-200">Content:</span>
          <textarea {...register("content")} rows={4} className="bg-zinc-500/40 p-2.5 mt-1 block w-full rounded-md border border-gray-300/20 shadow-sm"></textarea>
          <div className="flex justify-between">
            <p className="text-red-500">{errors.content?.message}</p>
            <CircleProgress
              size={26}
              progress={(maxContentLength - Math.max(0, content?.length)) / maxContentLength}
              remaining={maxContentLength - content?.length}
            />
          </div>
        </label>
        <div className="flex gap-4">
          <button type="submit" className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600">Delete</button>
          <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">Submit</button>
        </div>
      </div>
    </form>
  );
};