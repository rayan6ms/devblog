'use client'


import { useRouter } from 'next/navigation';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight } from "@fortawesome/free-solid-svg-icons";
import RecentItem from './RecentItem';
import TrendingItem from './TrendingItem';
import { IPost } from '@/data/posts';

interface SecondSectionProps {
  posts: {
    recent: IPost[];
    recommended: IPost[];
  };
}

export default function SecondSection({posts}: SecondSectionProps) {
  const router = useRouter();

  function handleRouteButtonClick(e: React.MouseEvent<HTMLButtonElement, MouseEvent>, path: string) {
    e.preventDefault();
    e.stopPropagation();
    router.push(path)
  }

  const sections = [
    { title: "Trending Posts", path: "/trending" },
    { title: "Recent Posts", path: "/recent" },
    { title: "Recommended Posts", path: "/recommended" }
  ];

  return (
    <section className="w-full justify-center grid grid-flow-row md:grid-flow-col gap-8 mt-14">
      {sections.map((section, index) => (
        <div key={index} className="flex gap-3 flex-col items-center space-y-4 border border-gray-700 md:border-none lg:border rounded-md p-8">
          <h2 className="text-2xl font-bold text-center text-wheat">
            { section.title }
          </h2>
          <RecentItem post={posts.recent[index]} />
          {posts.recommended.slice(0, 2).map((post: IPost, index: number) => (
            <TrendingItem
              key={ index }
              post={ post }
              section
              addSeparation={ index > 0 }
            />
          ))}
          <button 
            onClick={(e) => handleRouteButtonClick(e, section.path)}
            className="w-full flex items-center gap-2 hover:gap-0 self-start transition-all hover:text-purpleContrast group"
          >
            Mais destes
            <FontAwesomeIcon icon={ faArrowRight } className="transition-transform  delay-200 ease-in-out transform group-hover:translate-x-4 group-hover:opacity-100" />
          </button>
        </div>
      ))}
    </section>
  )
}
