'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import slugify from 'slugify';
import { useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faBookmark } from '@fortawesome/free-solid-svg-icons';
import type { IPost } from '@/data/posts';

type SliderProps = {
  title: string;
  items?: IPost[] | null;
};

const icons: Record<string, any> = {
  'viewed posts': faEye,
  'bookmarks': faBookmark,
};

const SliderItem = ({ item }: { item: IPost }) => {
  const router = useRouter();

  const onTagClick = (
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(
      `/tag?selected=${slugify(item.mainTag, { lower: true, strict: true })}`
    );
  };

  return (
    <Link
      href={`/post/${slugify(item.title, { lower: true, strict: true })}`}
      className="group w-56 mb-2 mx-2 bg-lessDarkBg rounded-xl shadow-md"
    >
      <div className="w-56 h-32 mb-2.5 relative">
        <div className="w-full h-full overflow-hidden rounded-md">
          <Image
            width={224}
            height={128}
            src={item.image}
            alt={item.title}
            className="w-full h-full object-cover rounded-xl group-hover:scale-110 transition-transform duration-1000"
          />
          <button
            onClick={onTagClick}
            className="absolute -bottom-2.5 right-1/2 translate-x-1/2 w-fit text-xs capitalize text-zinc-300 bg-zinc-600 rounded-full px-2 py-0.5 hover:bg-purpleContrast transition-all ease-in-out duration-300"
          >
            {item.mainTag}
          </button>
        </div>
      </div>

      <div className="p-2 capitalize">
        <h2
          className="font-europa text-md text-zinc-200 truncate"
          title={item.title}
        >
          {item.title}
        </h2>
        <div className="flex flex-wrap gap-2 mt-1">
          {item.tags.map((tag) => (
            <span
              key={tag}
              className="text-xs text-zinc-300 bg-zinc-700/50 rounded-md px-2 py-1 hover:bg-purpleContrast transition-all ease-in-out duration-300"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
};

export default function Slider({ title, items = [] }: SliderProps) {
  const list: IPost[] = Array.isArray(items) ? items : [];
  const icon = icons[title.toLowerCase()];

  return (
    <div className="bg-darkBg p-5 rounded-lg shadow-md m-2 md:m-5">
      <div className="flex items-center gap-2 mb-3 text-wheat">
        <h3 className="font-europa text-xl">{title}</h3>
        {icon ? <FontAwesomeIcon icon={icon} /> : null}
      </div>

      <div className="flex h-64 overflow-x-auto px-2 md:px-0">
        {list.map((item) => (
          <SliderItem key={item.title} item={item} />
        ))}
        {list.length === 0 && (
          <div className="text-sm text-zinc-400 px-2 py-1">
            No items to show.
          </div>
        )}
      </div>
    </div>
  );
}