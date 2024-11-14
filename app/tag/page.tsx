'use client'


import React, { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import slugify from 'slugify';
import InfiniteScroller from './InfiniteScroller';
import Sidebar from './Sidebar';
import SelectedTags from './SelectedTags';
import Footer from '@/components/Footer';
import { IPost, getFilteredPosts, getAllMainTags, getAllOtherTags } from '../data/posts';

const mainTags = getAllMainTags();
const otherTags = getAllOtherTags();
const allTags = [...mainTags, ...otherTags];
const sortedAllTags = allTags.sort((a, b) => a.localeCompare(b));

export default function TagsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [posts, setPosts] = useState<IPost[]>([]);
  const selected = searchParams.get('selected');
  const previousTagsArrayRef = useRef<string[]>([]);

  const [selectedTags, setSelectedTags] = useState<string[]>(() => {
    const queryTags = searchParams.get('selected');
    return queryTags ? queryTags.split(',').map(tag => slugify(tag, { lower: true, strict: true })) : [];
  });

  const isValidTag = (tag: string) => {
    return sortedAllTags.some(validTag => validTag.localeCompare(tag, undefined, { sensitivity: 'base' }) === 0);
  };

  function arraysAreEqual(a: string[], b: string[]): boolean {
    return a.length === b.length && a.every((val, index) => val === b[index]);
  }

  useEffect(() => {
    const url = `${pathname}?${searchParams}`;
    const queryTags = new URLSearchParams(url.split('?')[1]).get('selected')?.split(',') || [];
    const newTags = queryTags
      .filter(tag => isValidTag(tag))
  
    if (!arraysAreEqual(newTags, selectedTags)) {
      setSelectedTags(newTags);
    }
  }, [searchParams, selectedTags]);

  const handleSelectTag = (tag: string) => {
    if (!selectedTags.includes(tag)) {
      const newSelectedTags = [...selectedTags, tag];
      if (newSelectedTags.length > 5) newSelectedTags.shift();
      setSelectedTags(newSelectedTags);
      router.push(`/tag?selected=${newSelectedTags.map(t => slugify(t, { lower: true, strict: true })).join(',')}`);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const newSelectedTags = selectedTags.filter(tag => tag !== tagToRemove);
    setSelectedTags(newSelectedTags);
    router.push(newSelectedTags.length > 0 ? `/tag?selected=${newSelectedTags.map(t => slugify(t, { lower: true, strict: true })).join(',')}` : '/tag');
  };

  const tagsArray = selected ? selected.split(',') : [];

  useEffect(() => {
    if (arraysAreEqual(tagsArray, previousTagsArrayRef.current)) return;
    previousTagsArrayRef.current = tagsArray;
    const fetchPosts = async () => {
      const filteredPosts = await getFilteredPosts(tagsArray);
      setPosts(filteredPosts);
    };

    if (tagsArray.length > 0) fetchPosts();
    else setPosts([]);
  }, [tagsArray]);

  return (
    <>
      <div className="bg-darkBg min-h-screen text-gray">
        <div className="mt-8 px-12">
          <InfiniteScroller tags={mainTags} direction="left" onSelectTag={handleSelectTag} />
          <InfiniteScroller tags={otherTags} direction="right" onSelectTag={handleSelectTag} />
          <InfiniteScroller tags={otherTags.slice().reverse()} direction="left" onSelectTag={handleSelectTag} />
        </div>
        <div className="container mx-auto p-1.5">
          <div className="flex flex-col md:flex-row mt-4">
            <Sidebar
              tags={sortedAllTags}
              selectedTags={selectedTags}
              onSelectTag={handleSelectTag} 
            />
            <div className="flex-1 ml-4 pr-1.5 overflow-auto max-h-screen">
              <SelectedTags 
                tags={selectedTags} 
                onRemoveTag={handleRemoveTag} 
                onReset={() => {
                  setSelectedTags([]);
                  router.push(`/tag`);
                }}
              />
              <div className="p-2 bg-lessDarkBg flex flex-wrap gap-4 overflow-y-auto">
                {posts.map(post => (
                  <Link
                    key={post.title}
                    href={`/post/${slugify(post.title, { lower: true, strict: true })}`} className="mt-5 mx-2 group h-72 w-64"
                  >
                    <div className="w-full h-40 mb-2.5 overflow-hidden rounded-xl">
                      <Image
                        width={280}
                        height={160}
                        src={post.image}
                        alt={post.title}
                        className="object-cover rounded-xl transform group-hover:scale-110 transition-transform group-hover:duration-1000 duration-1000
                        w-full h-full"
                      />
                    </div>
                    <h2 className="text-lg text-zinc-200 mb-1">{post.title}</h2>
                    <button
                        className="inline-block px-2 py-1 mr-1.5 mt-1 uppercase text-[11px] tracking-[.06em] leading-5 w-fit font-sans bg-gray-800  hover:bg-gray-700 hover:text-purpleContrast rounded-lg text-zinc-400"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleSelectTag(post.mainTag)
                        }}
                      >
                        {post.mainTag}
                      </button>
                    {post.tags.map(tag => (
                      <button
                        key={tag}
                        className="inline-block px-2 py-1 mr-1.5 mt-2 uppercase text-[11px] tracking-[.06em] leading-5 w-fit font-sans bg-gray-800  hover:bg-gray-700 hover:text-purpleContrast rounded-lg text-zinc-400"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleSelectTag(post.mainTag)
                        }}
                      >
                        {tag}
                      </button>
                    ))}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}