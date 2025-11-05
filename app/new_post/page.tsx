'use client';

import { useEffect, useState } from 'react';
import Form from './Form';
import Footer from '@/components/Footer';
import { getAllMainTags } from '@/data/posts';

const allowedRoles = ['volunteer', 'writer', 'admin', 'owner'];
const role = 'admin';

export default function Page() {
  if (!role || !allowedRoles.includes(role)) return <p className="p-6">You don’t have permission to create posts.</p>;

  const [mainTags, setMainTags] = useState<string[]>([]);
  useEffect(() => {
    const fetchMainTags = async () => {
      const tags = await getAllMainTags();
      setMainTags(tags);
    };
    fetchMainTags();
  }, []);

  if (!mainTags.length) return (<p className="p-6">Loading…</p>);

  return (
    <>
      <div className="flex items-center justify-center">
        <div className="w-full mx-5 md:mx-auto md:w-2/3 h-full relative border mt-8 border-gray-500/40 shadow-sm bg-greyBg p-6 rounded-xl">
          <Form mainTagsOptions={mainTags} />
        </div>
      </div>
      <Footer />
    </>
  )
}
