'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye } from '@fortawesome/free-solid-svg-icons';
import { getRecentPosts } from '@/data/posts';
import { useSearchParams, useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import slugify from 'slugify';
import Footer from '@/components/Footer';
import Skeleton from './Skeleton'

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
  const [loading, setLoading] = useState<boolean>(true);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [startPage, setStartPage] = useState<number>(1);
  const itemsPerPage = 24;
  const maxPageButtons = 5;

  const router = useRouter();
  const searchParams = useSearchParams();
  const currentPage = parseInt(searchParams.get('page') || '1', 10);

  useEffect(() => {
    async function fetchRecentPosts() {
      setLoading(true);

      const { posts, total } = await getRecentPosts(currentPage, itemsPerPage);
      setRecentPosts(posts);
      setTotalPages(Math.ceil(total / itemsPerPage));
      setLoading(false);
    }

    fetchRecentPosts();
  }, [currentPage]);

  const handlePageChange = (page: number) => {
    if (page > 0 && page <= totalPages) {
      router.push(`?page=${page}`);
    }
  };

  const calculatePageRange = (page: number) => {
    let newStartPage = startPage;

    if (page === startPage && page > 1) {
      newStartPage = startPage - 2;
    } else if (page === startPage + maxPageButtons - 1 && page < totalPages) {
      newStartPage = startPage + 2;
    }

    if (page === 1) {
      newStartPage = 1;
    } else if (page === totalPages) {
      newStartPage = Math.max(totalPages - maxPageButtons + 1, 1);
    }

    setStartPage(Math.max(newStartPage, 1));
  };

  const handleRealignPageChange = (page: number) => {
    calculatePageRange(page);
    handlePageChange(page);
  };

  const endPage = Math.min(startPage + maxPageButtons - 1, totalPages);

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

  return loading ?
  (
    <>
      <Skeleton />
      <Footer />
    </>
  ) : (
    <>
      <div className="w-full flex flex-col items-center my-6">
        <div className="xxl:w-[90%] w-full">
          <div className="grid grid-cols-1 gap-5 px-2">
            <h2 className="ml-2 my-1.5 col-start-1 row-start-1 text-2xl font-somerton uppercase text-wheat">
              Recent posts
            </h2>
            <div className="col-start-1 row-start-2 w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 mb-1">
              {recentPosts.map((post, index) => (
                <Link key={index} className="bg-greyBg border border-t-0 border-zinc-700/30 rounded-lg overflow-hidden shadow-lg group" href={`/post/${slugify(post.title, { lower: true, strict: true })}`}>
                  <div className="w-full h-[200px] relative">
                    <Image
                      src={post.image}
                      alt={post.title}
                      layout="fill"
                      objectFit="cover"
                      className="group-hover:scale-110 transition-transform duration-500 rounded-t-lg"
                    />
                  </div>
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
                </Link>
              ))}
            </div>

            <div className="flex justify-center mt-6 space-x-1">
              <button
                onClick={() => handleRealignPageChange(1)}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg disabled:opacity-50 hover:bg-purpleContrast transition-transform duration-300 disabled:cursor-not-allowed"
              >
                First
              </button>
              <button
                onClick={() => handleRealignPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg disabled:opacity-50 hover:bg-purpleContrast transition-transform duration-300 disabled:cursor-not-allowed"
              >
                Previous
              </button>

              {[...Array(endPage - startPage + 1)].map((_, index) => {
                const page = startPage + index;
                return (
                  <button
                    key={page}
                    onClick={() => handleRealignPageChange(page)}
                    className={`px-4 py-2 rounded-lg ${
                      page === currentPage ? 'bg-purpleContrast text-white' : 'bg-gray-600 text-white hover:bg-purpleContrast transition-transform duration-300'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}

              <button
                onClick={() => handleRealignPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg disabled:opacity-50 hover:bg-purpleContrast transition-transform duration-300 disabled:cursor-not-allowed"
              >
                Next
              </button>
              <button
                onClick={() => handleRealignPageChange(totalPages)}
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg disabled:opacity-50 hover:bg-purpleContrast transition-transform duration-300 disabled:cursor-not-allowed"
              >
                Last
              </button>
            </div>

          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}