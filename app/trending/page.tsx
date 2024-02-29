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

  const handleNavigationClick = (type: 'author' | 'tag', value: string, e: React.MouseEvent) => {
    e.preventDefault();
    
    const url = type === 'author' 
      ? `/profile/${slugify(value, { lower: true, strict: true })}` 
      : `/tag?selected=${slugify(value, { lower: true, strict: true })}`;
  
    router.push(url);
  };

  return (
    <>  
      <div className="w-full flex flex-wrap justify-center gap-4 mb-6">
          <Accordion panels={panels} />
        <div className="xxl:w-[90%] flex flex-wrap justify-center gap-5 px-2">
          {trendingPosts.map((post, index) => (
            <div key={index} className="w-[320px] xs:w-[430px] sm:w-[500px] md:w-[350px] lg:w-[360px] bg-greyBg border border-t-0 border-zinc-700/30 rounded-lg overflow-hidden shadow-lg">
              <Link href={`/post/${slugify(post.title, { lower: true, strict: true })}`}>
                <div className="w-full h-[200px] relative">
                  <Image
                    src={post.image}
                    alt={post.title}
                    layout="fill"
                    objectFit="cover"
                    className="hover:scale-110 transition-transform duration-500 rounded-t-lg"
                  />
                </div>
              </Link>
              <div className="flex flex-col p-4 h-52">
                <h3 className="text-wheat text-xl font-somerton line-clamp-2 uppercase">{post.title}</h3>
                <p className="text-zinc-400 text-sm font-europa mt-2 line-clamp-3">{post.description}</p>
                <div className="flex items-center justify-between my-2">
                  <button
                    onClick={(e) => handleNavigationClick('author', post.mainTag, e)} className="hover:text-purpleContrast transition-colors uppercase font-bold text-sm text-zinc-300"
                  >
                    {post.mainTag}
                  </button>
                  <span className="flex items-center gap-1 text-sm text-zinc-400">
                    <FontAwesomeIcon icon={faEye} /> <span>{post.views.toLocaleString()}</span>
                  </span>
                </div>
                <div className="flex items-center justify-between text-zinc-400 text-sm">
                  <button
                    onClick={(e) => handleNavigationClick('author', post.author, e)} className="hover:text-purpleContrast transition-colors"
                  >
                    {post.author}
                  </button>
                  <span className="capitalize">{formattedDate(post.date)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <Footer />
    </>
  );
}