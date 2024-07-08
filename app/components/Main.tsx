import RecentItem from './RecentItem';
import RecommendedItem from './RecommendedItem';
import { IPost } from '@/data/posts';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAnglesDown } from '@fortawesome/free-solid-svg-icons';

interface MainProps {
  posts: {
    recent: IPost[];
    recommended: IPost[];
  };
}

export default function Main({posts}: MainProps) {
  return (
    <>
      <main
        className="mt-10 mx-auto flex-col flex-wrap items-center md:items-start md:flex-row flex md:justify-center gap-6"
      >
        <div className="flex flex-col md:flex-row xxl:flex-col gap-6">
          {posts.recent.slice(0, 2).map((post: IPost, index: number) => (
              <RecentItem
                key={index}
                post={post}
              />
            ))}
        </div>
        <div
          className="flex flex-col gap-8 md:flex-row"
        >
          {posts.recent.slice(2, 3).map((post: IPost, index: number) => (
            <RecentItem
              key={index + 1}
              post={post}
              isBig={ true }
            />
          ))}
          <div className="flex flex-col divide-y divide-gray-500">
            {posts.recommended.slice(0, 5).map((post: IPost, index: number) => (
              <RecommendedItem
                key={index}
                post={post}
                addSeparation={ index > 0 }
              />
            ))}
          </div>
        </div>
      </main>
      <div
        className="hidden xxl:flex w-full p-2/4 mt-7 justify-center items-center"
        id="first-section"
      >
        <div className='bg-zinc-500/60 w-44 h-0.5 mr-2 rounded-lg' />
        <a href="#first-section">
          <FontAwesomeIcon
            icon={faAnglesDown}
            className="animate-bounce w-6 h-6 mx-4 text-zinc-300/80"
          />
        </a>
        <div className='bg-zinc-500/60 w-44 h-0.5 ml-2 rounded-lg' />
      </div>
    </>
  );
}
