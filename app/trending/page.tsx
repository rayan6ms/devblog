'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye } from '@fortawesome/free-solid-svg-icons';
import { getTrendingPosts, IPost } from '@/data/posts';
import { useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import slugify from 'slugify';
import Footer from '@/components/Footer';

const Accordion = dynamic(() => import('@/trending/Accordion'), { ssr: false });

type TrendingPost = {
  image: string;
  mainTag: string;
  title: string;
  author: string;
  date: string;
  views: number;
  description: string;
};

type Panel = {
  tag: string;
  description: string;
  author: string;
  title: string;
  image: string;
};

export default function Page() {
  const [trendingPosts, setTrendingPosts] = useState<TrendingPost[]>([]);
  const [panels, setPanels] = useState<Panel[]>([]);
  const router = useRouter();

  useEffect(() => {
    async function fetchTrendingPosts() {
      const posts = await getTrendingPosts();
      const newPanels = posts.map((post: IPost) => ({
        tag: post.mainTag,
        description: post.description,
        author: post.author,
        title: post.title,
        image: post.image
      }));

      setTrendingPosts(posts);
      setPanels(newPanels);
    }

    fetchTrendingPosts();
  }, []);

  const formattedDate = (date: string) => format(parseISO(date), 'dd MMM yyyy', { locale: ptBR });
  const fullFormattedDate = (date: string) => {
    const s = format(parseISO(date), 'EEEE, dd MMMM yyyy', { locale: ptBR })
    return s.charAt(0).toUpperCase() + s.slice(1)
  };

  const handleNavigationClick = (type: 'author' | 'tag', value: string, e: React.MouseEvent) => {
    e.preventDefault();
    
    const url = type === 'author' 
      ? `/profile/${slugify(value, { lower: true, strict: true })}` 
      : `/tag?selected=${slugify(value, { lower: true, strict: true })}`;
  
    router.push(url);
  };

  return (
    <>
      <Accordion panels={panels} />
      <div className="w-full flex flex-col items-center my-6">
        <h2 className="text-xl font-somerton uppercase text-wheat self-start ml-2">Top 30 Posts</h2>
        <div className="flex flex-wrap justify-center gap-2 mt-4">
          {trendingPosts.slice(0, 30).map((post, index) => (
            <div key={index} className="w-1/5 flex bg-greyBg border border-zinc-700/30 rounded-l-2xl rounded-r-md overflow-hidden shadow-lg">
              <span className="absolute top-0 left-0 bg-purpleContrast text-wheat text-lg font-bold px-3 py-1 rounded-br-lg">{index + 1}</span>
              <div className="w-24 h-full relative">
                <Image src={post.image} alt={post.title} layout="fill" objectFit="cover" />
              </div>
              <div className="px-4 py-2 flex flex-col justify-between">
                <h3 className="text-wheat text-md font-somerton line-clamp-1 uppercase">{post.title}</h3>
                <p className="text-xs text-zinc-400">{post.author}</p>
              </div>
            </div>
          ))}
        </div>

        <h2 className="text-xl font-somerton uppercase text-wheat self-start ml-2 mt-10">Trending Posts</h2>
        <div className="flex flex-col items-center mt-4 w-full px-2">
          {trendingPosts.map((post, index) => (
            <div key={index} className="w-[50%] bg-greyBg border border-zinc-700/30 rounded-md overflow-hidden shadow-lg my-2">
              <Link className="flex" href={`/post/${slugify(post.title, { lower: true, strict: true })}`}>
                  <div className="w-32 h-32 relative">
                    <Image src={post.image} alt={post.title} layout="fill" objectFit="cover" className="rounded-l-lg" />
                  </div>
                  <div className="flex-grow p-4">
                    <h3 className="text-wheat text-lg font-somerton uppercase">{post.title}</h3>
                    <p className="text-zinc-400 text-sm">{post.description}</p>
                    <div className="mt-2 flex justify-between text-zinc-300 text-xs">
                      <span>{post.author}</span>
                      <span>
                        <FontAwesomeIcon icon={faEye} /> {post.views.toLocaleString()} views
                      </span>
                      <time dateTime={post.date}>{formattedDate(post.date)}</time>
                    </div>
                  </div>
              </Link>
            </div>
          ))}
        </div>
      </div>
      <Footer />
    </>
  );
}