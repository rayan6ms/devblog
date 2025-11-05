'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPenToSquare } from '@fortawesome/free-solid-svg-icons';
import { getUser, IUser } from '@/data/posts';

const canEditByRole = (role?: string) => {
  if (!role) return false;
  const r = role.toLowerCase();
  return r === 'admin' || r === 'owner';
};

export default function PostEditButton({
  slug,
  authorName,
}: {
  slug: string;
  authorName: string;
}) {
  const router = useRouter();
  const [user, setUser] = useState<IUser | null>(null);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    (async () => {
      const local = typeof window !== 'undefined' ? localStorage.getItem('userProfile') : null;
      if (local) {
        try {
          const u = JSON.parse(local) as IUser;
          setUser(u);
          setAllowed(
            canEditByRole(u.role) ||
            (u.name || '').trim().toLowerCase() === (authorName || '').trim().toLowerCase()
          );
          return;
        } catch {}
      }
      const u = await getUser();
      setUser(u);
      setAllowed(
        canEditByRole(u.role) ||
        (u.name || '').trim().toLowerCase() === (authorName || '').trim().toLowerCase()
      );
    })();
  }, [authorName]);

  if (!allowed) return null;

  return (
    <button
      aria-label="Edit post"
      title="Edit post"
      onClick={() => router.push(`/post/${slug}/edit`)}
      className="absolute text-sm top-4 right-4 space-x-0.5 px-1 rounded-md border border-zinc-600/40 bg-zinc-800/70 hover:bg-zinc-800 transition"
    >
      <FontAwesomeIcon icon={faPenToSquare} className="text-zinc-100" />
      <span>Edit</span>
    </button>
  );
}
