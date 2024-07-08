'use client'


import { useRouter } from 'next/navigation';
import Popover from './Popover';
import Image from 'next/image';
import Link from 'next/link';
import slugify from 'slugify';
import { IPost } from '@/data/posts';

interface RecommendedItemProps {
  post: IPost;
  addSeparation?: boolean;
  section?: boolean;
}

export default function RecommendedItem({post, addSeparation}: RecommendedItemProps) {
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
      className={`group flex
        w-[360px] h-[100px]
        sm:w-[460px]
        md:w-[360px]
        lg:w-[420px]
        xxl:w-[320px]
        box-content ${addSeparation && 'mt-5 pt-4'}
        xxl:last-of-type:flex md:last-of-type:hidden`
      }
    >
      <div className="flex flex-col justify-center w-4/5 h-full pr-4">
        <div className="flex justify-between items-center">
          <button
            onClick={(e) => handleRouteButtonClick(e, `/tag?selected=${tagId}`)}
            className="text-xs tracking-[.06em] leading-5 w-fit font-sans text-zinc-400 hover:text-purpleContrast uppercase transition-all ease-in-out duration-300"
          >
            {mainTag}
          </button>
          <Popover iconSize="lg" />
        </div>
        <h3
          className="w-full max-h-[70px] text-lg font-sans font-semibold leading-6 line-clamp-3"
        title={ title }
        >
          {title}
        </h3>
      </div>
      <div className="flex relative min-w-[100px] max-w-[100px] h-[100px] overflow-hidden rounded-lg">
        <Image
          src={image}
          alt={title}
          width={100}
          height={100}
          className="w-full h-full rounded-lg object-cover transform group-hover:scale-110 transition-transform group-hover:duration-1000 duration-1000 ease-out"
        />
      </div>
    </Link>
  )
}
