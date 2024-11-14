'use client'


import { useEffect, useState } from 'react';
import Main from '@/components/Main';
import SkeletonMain from './components/SkeletonMain';
import FirstSection from '@/components/FirstSection';
import SkeletonFirstSection from './components/SkeletonFirstSection';
import SecondSection from '@/components/SecondSection';
import SkeletonSecondSection from './components/SkeletonSecondSection';
import Footer from '@/components/Footer';
import { IPost, getRandomPosts, getTrendingPosts, getRecommendedPosts } from './data/posts';

export default function Home() {
  const [recentPosts, setRecentPosts] = useState<IPost[]>([]);
  const [trendingPosts, setTrendingPosts] = useState<IPost[]>([]);
  const [recommendedPosts, setRecommendedPosts] = useState<IPost[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Pega os posts do local storage se existirem
    const storedRecentPosts = localStorage.getItem('recentPosts');
    const storedTrendingPosts = localStorage.getItem('trendingPosts');
    const storedRecommendedPosts = localStorage.getItem('recommendedPosts');

    if (storedRecentPosts && storedTrendingPosts && storedRecommendedPosts) {
      setRecentPosts(JSON.parse(storedRecentPosts));
      setTrendingPosts(JSON.parse(storedTrendingPosts));
      setRecommendedPosts(JSON.parse(storedRecommendedPosts));
    }

    Promise.all([getRandomPosts(), getRandomPosts(), getRandomPosts()]).then(([recent, trending, recommended]) => {
      setRecentPosts(recent);
      setTrendingPosts(trending);
      setRecommendedPosts(recommended);

      // Atualiza os posts no local storage
      localStorage.setItem('recentPosts', JSON.stringify(recent));
      localStorage.setItem('trendingPosts', JSON.stringify(trending));
      localStorage.setItem('recommendedPosts', JSON.stringify(recommended));

      setLoading(false);
    });
  }, []);

  return loading ? 
  (
    <>
      <SkeletonMain />
      <SkeletonFirstSection />
      <SkeletonSecondSection />
      <Footer />
    </>
  ) : (
    <>
      <Main posts={ {recent: recentPosts, recommended: recommendedPosts} } />
      <FirstSection posts={ trendingPosts } />
      <SecondSection posts={ {recent: recentPosts, recommended: recommendedPosts} } />
      <Footer />
    </>
  );
}
