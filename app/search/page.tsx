'use client'

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getPostsByQuery } from '@/data/posts'; // Crie uma função que busca posts por query

import Footer from '@/components/Footer';
import Skeleton from './Skeleton'; // Componente de esqueleto para carregamento

type Post = {
  image: string;
  title: string;
  author: string;
  date: string;
  views: number;
  description: string;
};

export default function SearchResultsPage() {
  const searchParams = useSearchParams();
  const query = searchParams.get('query') || ''; // Captura o parâmetro da URL
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // if (query) {
    //   async function fetchPosts() {
    //     setLoading(true);
    //     const relatedPosts = await getPostsByQuery(query); // Função para buscar posts relacionados
    //     setPosts(relatedPosts);
    //     setLoading(false);
    //   }
    //   fetchPosts();
    // }
  }, [query]);

  return loading ? (
    <div>
      <Skeleton />
      <Footer />
    </div>
  ) : (
    <div>
      <h1 className="text-2xl font-bold text-center my-4">
        Resultados para: "{query}"
      </h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
        {/* {posts.map((post, index) => (
        ))} */}
      </div>
      <Footer />
    </div>
  );
}
