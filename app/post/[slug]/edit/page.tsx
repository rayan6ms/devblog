'use client';

import { useEffect, useState } from 'react';
import Footer from '@/components/Footer';
import Form from '@/new_post/Form';
import { useParams, useRouter } from 'next/navigation';
import { getAllMainTags } from '@/data/posts';

type StoredPost = {
  image?: string;
  mainTag: string;
  tags: string[];
  title: string;
  author: string;
  date: string;
  views: number;
  hasStartedReading: boolean;
  percentRead: number;
  description: string;
  content: string;
  status: 'draft' | 'pending_review' | 'published';
  slug: string;
};

export default function EditPostPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const slug = params.id;

  const [mainTags, setMainTags] = useState<string[]>([]);
  const [initial, setInitial] = useState<StoredPost | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const tags = await getAllMainTags();
      setMainTags(tags);

      const raw = typeof window !== 'undefined' ? localStorage.getItem('posts') : null;
      const list: StoredPost[] = raw ? JSON.parse(raw) : [];
      const found = list.find((p) => p.slug === slug) || null;

      setInitial(
        found ?? {
          image: '',
          mainTag: '',
          tags: [],
          title: '',
          author: 'mock-user-id-1',
          date: new Date().toISOString(),
          views: 0,
          hasStartedReading: false,
          percentRead: 0,
          description: '',
          content: '',
          status: 'draft',
          slug,
        }
      );
      setLoading(false);
    })();
  }, [slug]);

  if (loading) return <p className="p-6">Loading…</p>;
  if (!initial) return <p className="p-6">Post not found (mock).</p>;
  if (!mainTags.length) return <p className="p-6">Loading tags…</p>;

  return (
    <>
      <div className="flex items-center justify-center">
        <div className="w-full mx-5 md:mx-auto md:w-2/3 h-full relative border mt-8 border-gray-500/40 shadow-sm bg-greyBg p-6 rounded-xl">
          <Form
            mainTagsOptions={mainTags}
            mode="edit"
            existingSlug={slug}
            initialValues={{
              title: initial.title,
              content: initial.content,
              description: initial.description,
              tags: initial.tags,
              mainTag: initial.mainTag,
              author: initial.author,
              status: initial.status,
            }}
          />
        </div>
      </div>
      <Footer />
    </>
  );
}
