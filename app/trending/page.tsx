'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye } from '@fortawesome/free-solid-svg-icons';
import { getRandomPosts, IPost } from '@/data/posts';
import { useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import slugify from 'slugify';
import Footer from '@/components/Footer';
import Skeleton from './Skeleton';

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
  const [loading, setLoading] = useState(true);
  const [trendingPosts, setTrendingPosts] = useState<TrendingPost[]>([]);
  const [panels, setPanels] = useState<Panel[]>([]);
  const router = useRouter();

  useEffect(() => {
    async function fetchTrendingPosts() {
      const posts = await getRandomPosts();
      const newPanels = posts.map((post: IPost) => ({
        tag: post.mainTag,
        description: post.description,
        author: post.author,
        title: post.title,
        image: post.image
      }));

      setTrendingPosts(posts);
      setPanels(newPanels);
      setLoading(false);
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

  return loading ? <Skeleton /> : (
    <>
      <Accordion panels={panels} />
      <div className="w-full flex flex-col items-center my-6">
        <div className="w-full max-w-[1200px] px-2">
        <h2 className="text-2xl font-somerton uppercase text-wheat self-start ml-2">
          Top 24 Posts
        </h2>
        <div className="flex flex-wrap justify-center gap-2 mt-4">
          {trendingPosts.slice(0, 24).map((post, index) => (
            <Link
              key={index}
              className="md:w-[380px] w-[97%] flex relative bg-greyBg border border-zinc-700/30 rounded-l-2xl rounded-r-md overflow-hidden shadow-lg cursor-pointer group"
              href={`/post/${slugify(post.title, { lower: true, strict: true })}`}
            >
              <span
                className="absolute bottom-0 right-0 flex justify-center bg-purpleContrast text-wheat text-lg font-bold px-3 w-10 py-1 rounded-tl-sm rounded-br-lg"
              >
                <span className="absolute -top-2 -left-2.5 w-6 h-6 bg-greyBg rounded-br-full" />
                {index + 1}
              </span>
              <div className="w-36 min-w-24 h-20 relative">
                <Image
                  src={post.image}
                  alt={post.title}
                  layout="fill"
                  objectFit="cover"
                  className="w-24 min-w-24 group-hover:scale-110 transition-transform duration-500"
                />
              </div>
              <div className="px-4 py-2.5 w-full flex flex-col justify-between">
                <h3 className="text-wheat text-[17px] font-somerton line-clamp-1 uppercase">
                  {post.title}
                </h3>
                <p className="text-sm text-zinc-300/90">{post.author}</p>
              </div>
            </Link>
          ))}
        </div>

        <h2 className="text-2xl font-somerton uppercase text-wheat self-start ml-2 mt-10">Trending Posts</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-1 gap-x-4 justify-center mt-4 w-full px-2">
          {trendingPosts.map((post, index) => (
            <div key={index} className="w-full h-[140px] bg-greyBg border border-zinc-700/30 rounded-md overflow-hidden shadow-lg cursor-pointer my-2">
              <Link className="flex group" href={`/post/${slugify(post.title, { lower: true, strict: true })}`}>
                  <div className="w-40 h-[140px] relative">
                    <Image
                      src={post.image}
                      alt={post.title}
                      layout="fill"
                      objectFit="cover"
                      className="group-hover:scale-110 transition-transform duration-500 rounded-l-lg"
                    />
                  </div>
                  <div className="flex-grow p-4 pt-3 w-full">
                    <h3 className="text-wheat text-lg font-somerton uppercase line-clamp-1">{post.title}</h3>
                    <p className="text-zinc-400 text-sm line-clamp-3">{post.description}</p>
                    <div className="mt-2 flex justify-between text-zinc-300 text-xs">
                      <button
                        onClick={(e) => handleNavigationClick('author', post.author, e)}
                        className='transition-all duration-100 hover:text-purpleContrast'
                      >
                        {post.author}
                      </button>
                      <span>
                        <FontAwesomeIcon icon={faEye} /> {post.views.toLocaleString()} views
                      </span>
                      <time
                        dateTime={post.date}
                        title={fullFormattedDate(post.date)}
                      >
                        {formattedDate(post.date)}
                      </time>
                    </div>
                  </div>
              </Link>
            </div>
          ))}
        </div>
        </div>
      </div>
      <Footer />
    </>
  );
}