import TrendingItem from './TrendingItem';
import { IPost } from '@/data/posts';

interface FirstSectionProps {
  posts: IPost[];
}

export default function FirstSection({posts}: FirstSectionProps) {
  return (
    <section className="bg-greyBg">
      <div className="flex md:justify-center items-center flex-wrap gap-6 md:gap-8 lg:gap-x-28 xxl:gap-x-8 mt-24 w-[360px] sm:w-[460px] md:w-full mx-auto h-fit md:h-[500px] xxl:h-[260px] py-14 md:px-8">
        {posts.slice(0, 4).map((post: IPost, index: number) => (
          <TrendingItem key={index} post={ post } />
        ))}
      </div>
    </section>
  )
}
