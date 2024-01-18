'use client'


import { useRouter } from 'next/navigation';
import Popover from './Popover';
import slugify from 'slugify';
import Image from 'next/image';
import Link from 'next/link';
import { IPost } from '@/data/posts';

type TrendingItemProps = {
  post: IPost;
  section?: boolean;
  addSeparation?: boolean;
}

export default function TrendingItem({post, section, addSeparation}: TrendingItemProps) {
  const { image, mainTag, title } = post;
  
  const postId = slugify(title, { lower: true, strict: true });
  const tagId = slugify(mainTag, { lower: true, strict: true });
  const router = useRouter();

  function handleRouteButtonClick(e: React.MouseEvent<HTMLButtonElement, MouseEvent>, path: string) {
    e.preventDefault();
    e.stopPropagation();
    router.push(path)
  }

  return (
    <Link
      href={`/post/${postId}`}
      className={`group flex gap-6
        w-full h-[130px] sm:h-[180px]
        md:w-[320px] md:h-[120px]
        lg:w-[380px] lg:h-[150px]
        xxl:w-[300px] xxl:h-[100px]
        box-content ${addSeparation && 'mt-5 pt-4'}`
      }
    >
      <div className="flex relative
        min-w-[130px] max-w-[130px] h-[130px]
        sm:min-w-[180px] sm:max-w-[180px] sm:h-[180px]
        md:min-w-[150px] md:max-w-[150px] md:h-[150px]
        xxl:min-w-[105px] xxl:max-w-[105px] xxl:h-[105px]
        overflow-hidden rounded-lg">
        <Image
          src={image}
          alt={title}
          width={105}
          height={105}
          className="w-full h-full rounded-lg object-cover transform group-hover:scale-110 transition-transform group-hover:duration-1000 duration-1000 ease-out"
        />
      </div>
      <div className="flex flex-col justify-center w-fit h-full">
        <div className="flex justify-between">
          <button
            onClick={(e) => handleRouteButtonClick(e, `/tag?selected=${tagId}`)}
            className="text-sm tracking-[.06em] leading-5 w-fit font-sans text-zinc-400 hover:text-purpleContrast uppercase transition-all ease-in-out duration-300"
          >
            {mainTag}
          </button>
          <Popover iconSize="lg" hoverBg="[#34373d]" />
        </div>
        <h3
          className="w-full max-h-[70px] text-lg font-sans font-semibold leading-6 line-clamp-3 text-ellipsis break-words hyphens-auto"
          title={ title }
        >
          {title}
        </h3>
      </div>
    </Link>
  )
}
