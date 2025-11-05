'use client';

import { useState, useEffect } from 'react';
import Header from '../Header';
import Slider from '../Slider';
import Comments from '../Comments';
import Footer from '@/components/Footer';
import { getRecentPosts, getComments, getUser, IPost, IComment, IUser } from '@/data/posts';
import ProfileEditModal from '../ProfileEditModal';

export default function Profile({ params }: { params: { id: string } }) {
  const [postsData, setPostsData] = useState<IPost[]>([]);
  const [comments, setComments] = useState<IComment[]>([]);
  const [user, setUser] = useState<IUser>({} as IUser);
  const [isEditOpen, setIsEditOpen] = useState(false);

  useEffect(() => {
    const fetchPosts = async () => {
      const { posts } = await getRecentPosts(1, 12);
      setPostsData(posts);
    };

    const fetchComments = async () => {
      const data = await getComments();
      setComments(data);
    };

    const fetchUser = async () => {
      const data = await getUser();
      const raw = typeof window !== 'undefined' ? localStorage.getItem('userProfile') : null;
      if (raw) {
        try { setUser(JSON.parse(raw)); return; } catch {}
      }
      setUser(data);
    };

    fetchPosts();
    fetchComments();
    fetchUser();
  }, []);

  const handleSaveProfile = async (updated: IUser) => {
    setUser(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('userProfile', JSON.stringify(updated));
    }
  };

  const loading =
    postsData.length === 0 &&
    comments.length === 0 &&
    Object.keys(user || {}).length === 0;

  if (loading) return <p>Loading...</p>;

  return (
    <>
      <div className="flex justify-center items-center mt-12 xl:mt-20">
        <div className="w-full md:w-5/6 bg-greyBg rounded-xl sm:rounded-2xl shadow-md border border-zinc-700/50">
          <Header user={user} onEdit={() => setIsEditOpen(true)} />
          <Slider title="Bookmarks" items={postsData} />
          <Slider title="Viewed Posts" items={postsData} />
          <Comments comments={comments} />
        </div>
      </div>
      <ProfileEditModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        initialUser={user}
        onSave={handleSaveProfile}
      />

      <Footer />
    </>
  );
}
