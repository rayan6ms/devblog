'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye } from '@fortawesome/free-solid-svg-icons';
import { getRecentPosts } from '@/data/posts';
import { useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import slugify from 'slugify';
import Footer from '@/components/Footer';

type RecentPost = {
  image: string;
  mainTag: string;
  title: string;
  author: string;
  date: string;
  views: number;
  description: string;
};

export default function Page() {
  const [recentPosts, setRecentPosts] = useState<RecentPost[]>([]);
  const router = useRouter();

  useEffect(() => {
    async function fetchRecentPosts() {
      const posts = await getRecentPosts();

      setRecentPosts(posts);
    }

    fetchRecentPosts();
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
      <div className="w-full flex flex-col items-center my-6">
        <div className="xxl:w-[90%] w-full">
          <div className="grid grid-cols-1 gap-5 px-2">
            <h2 className="ml-2 col-start-1 row-start-1 text-xl font-somerton uppercase text-wheat">
              Recent posts
            </h2>
            <div className="col-start-1 row-start-2 w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {recentPosts.map((post, index) => (
                <div key={index} className="bg-greyBg border border-t-0 border-zinc-700/30 rounded-lg overflow-hidden shadow-lg group">
                  <Link href={`/post/${slugify(post.title, { lower: true, strict: true })}`}>
                    <div className="w-full h-[200px] relative">
                      <Image
                        src={post.image}
                        alt={post.title}
                        layout="fill"
                        objectFit="cover"
                        className="group-hover:scale-110 transition-transform duration-500 rounded-t-lg"
                      />
                    </div>
                  </Link>
                  <div className="flex flex-col p-4 h-52">
                    <h3 className="text-wheat text-xl font-somerton line-clamp-2 uppercase">{post.title}</h3>
                    <p className="text-zinc-400 text-sm font-europa mt-2 line-clamp-3">{post.description}</p>
                    <div className="flex items-center justify-between my-2">
                      <button onClick={(e) => handleNavigationClick('author', post.mainTag, e)} className="hover:text-purpleContrast transition-colors uppercase font-bold text-sm text-zinc-300">
                        {post.mainTag}
                      </button>
                      <span className="flex items-center gap-1 text-sm text-zinc-400">
                        <FontAwesomeIcon icon={faEye} /> <span>{post.views.toLocaleString()}</span>
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-zinc-400 text-sm">
                      <button onClick={(e) => handleNavigationClick('author', post.author, e)} className="hover:text-purpleContrast transition-colors">
                        {post.author}
                      </button>
                      <time className="capitalize" title={fullFormattedDate(post.date)} dateTime={post.date}>
                        {formattedDate(post.date)}
                      </time>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}