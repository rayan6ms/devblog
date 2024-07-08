'use client';

import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus } from '@fortawesome/free-solid-svg-icons';
import Link from 'next/link';
import Header from '../Header';
import Slider from '../Slider';
import Comments from '../Comments';
import Footer from '@/components/Footer';
import { getRecentPosts, getComments, getUser, IPost, IComment, IUser } from '@/data/posts';

export default function Profile({ params }: any ) {
  const [postsData, setPostsData] = useState<IPost[]>([]);
  const [comments, setComments] = useState<IComment[]>([]);
  const [user, setUser] = useState<IUser>({} as IUser);

  useEffect(() => {
    const fetchPosts = async () => {
      const data = await getRecentPosts();
      setPostsData(data);
    };

    const fetchComments = async () => {
      const data = await getComments();
      setComments(data);
    };

    const fetchUser = async () => {
      const data = await getUser();
      setUser(data);
    };

    fetchPosts();
    fetchComments();
    fetchUser();
  }, []);

  if (!(postsData.length > 0 || comments.length > 0 || Object.keys(user).length > 0)) return (<p>Loading...</p>);

  return (
    <>
      <div className="flex justify-center items-center mt-12 xl:mt-20">
        <div className="w-full md:w-5/6 bg-greyBg rounded-xl sm:rounded-2xl shadow-md border border-zinc-700/50">
          <Header user={user} />
          <Slider title="Bookmarks" items={postsData} />
          <Slider title="Viewed Posts" items={postsData} />
          <Comments comments={comments} />
          <Link
            href="/new_post"
            className="fixed bottom-10 right-20 bg-purpleContrast p-4 py-3 rounded-full shadow-lg hover:bg-purple-500 transition duration-300 ease-in-out"
          >
            <FontAwesomeIcon icon={faPlus} />
          </Link>
        </div>
      </div>
      <Footer />
    </>
  );
};