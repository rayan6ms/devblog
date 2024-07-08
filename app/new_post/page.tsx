'use client';

import { useEffect, useState } from 'react';
import Form from './Form';
import Footer from '@/components/Footer';
import { getAllMainTags } from '@/data/posts';

const allowedRoles = ['volunteer', 'writer', 'admin', 'owner'];
const role = 'admin';

export default function page() {
  if (!role || !allowedRoles.includes(role)) return null;

  const [mainTags, setMainTags] = useState<string[]>([]);
  useEffect(() => {
    const fetchMainTags = async () => {
      const tags = getAllMainTags();
      setMainTags(tags);
    };

    fetchMainTags();
  }, []);

  if (!mainTags.length) return (<p>Loading...</p>);

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
