'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getRecentPosts } from '@/data/posts';
import Footer from '@/components/Footer';
import Skeleton from '../components/PostGridSkeleton';
import PostsGrid from '@/components/PostsGrid';
import type { IPost } from '@/data/posts';

export default function Page() {
  const [recentPosts, setRecentPosts] = useState<IPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(0);
  const [startPage, setStartPage] = useState(1);

  const itemsPerPage = 24;
  const maxPageButtons = 5;

  const router = useRouter();
  const searchParams = useSearchParams();
  const currentPage = parseInt(searchParams.get('page') || '1', 10);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const { posts, total } = await getRecentPosts(currentPage, itemsPerPage);
      setRecentPosts(posts);
      setTotalPages(Math.max(1, Math.ceil(total / itemsPerPage)));
      setStartPage(1);
      setLoading(false);
    }
    fetchData();
  }, [currentPage]);

  const handlePageChange = (page: number) => {
    if (page > 0 && page <= totalPages) {
      const params = new URLSearchParams();
      params.set('page', String(page));
      router.push(`?${params.toString()}`);
    }
  };

  const calculatePageRange = (page: number) => {
    let newStartPage = startPage;
    if (page === startPage && page > 1) newStartPage = startPage - 2;
    else if (page === startPage + maxPageButtons - 1 && page < totalPages)
      newStartPage = startPage + 2;

    if (page === 1) newStartPage = 1;
    else if (page === totalPages)
      newStartPage = Math.max(totalPages - maxPageButtons + 1, 1);

    setStartPage(Math.max(newStartPage, 1));
  };

  const handleRealignPageChange = (page: number) => {
    calculatePageRange(page);
    handlePageChange(page);
  };

  const endPage = Math.min(startPage + maxPageButtons - 1, totalPages);

  if (loading) {
    return (
      <>
        <Skeleton />
        <Footer />
      </>
    );
  }

  return (
    <>
      <div className="w-full flex flex-col items-center my-6">
        <div className="xxl:w-[90%] w-full">
          <div className="grid grid-cols-1 gap-5 px-2">
            <PostsGrid posts={recentPosts} heading="Recent posts" />

            {totalPages > 1 && (
              <div className="flex justify-center mt-6 space-x-1">
                <button onClick={() => handleRealignPageChange(1)} disabled={currentPage === 1}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg disabled:opacity-50 hover:bg-purpleContrast transition-transform duration-300 disabled:cursor-not-allowed">
                  First
                </button>
                <button onClick={() => handleRealignPageChange(currentPage - 1)} disabled={currentPage === 1}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg disabled:opacity-50 hover:bg-purpleContrast transition-transform duration-300 disabled:cursor-not-allowed">
                  Previous
                </button>

                {[...Array(endPage - startPage + 1)].map((_, index) => {
                  const page = startPage + index;
                  return (
                    <button key={page} onClick={() => handleRealignPageChange(page)}
                      className={`px-4 py-2 rounded-lg ${
                        page === currentPage
                          ? 'bg-purpleContrast text-white'
                          : 'bg-gray-600 text-white hover:bg-purpleContrast transition-transform duration-300'
                      }`}>
                      {page}
                    </button>
                  );
                })}

                <button onClick={() => handleRealignPageChange(currentPage + 1)} disabled={currentPage === totalPages}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg disabled:opacity-50 hover:bg-purpleContrast transition-transform duration-300 disabled:cursor-not-allowed">
                  Next
                </button>
                <button onClick={() => handleRealignPageChange(totalPages)} disabled={currentPage === totalPages}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg disabled:opacity-50 hover:bg-purpleContrast transition-transform duration-300 disabled:cursor-not-allowed">
                  Last
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
