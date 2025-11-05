'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye } from '@fortawesome/free-solid-svg-icons';
import slugify from 'slugify';
import { useRouter } from 'next/navigation';
import type { IPost } from '@/data/posts';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type Props = {
  posts: IPost[];
  heading: string;
  highlightTerm?: string;
};

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function highlight(text: string, term?: string) {
  const q = term?.trim();
  if (!q) return text;

  // split by words, e.g., "jo ann" -> /(?:jo|ann)/i
  const tokens = q.split(/\s+/).filter(Boolean).map(escapeRegExp);
  if (tokens.length === 0) return text;
  const re = new RegExp(`(${tokens.join('|')})`, 'ig');

  const parts = text.split(re);
  return parts.map((part, i) =>
    re.test(part) ? (
      <mark
        key={i}
        className="bg-purple-600/40 text-inherit rounded-sm px-0.5"
      >
        {part}
      </mark>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    )
  );
}

export default function PostsGrid({ posts, heading, highlightTerm }: Props) {
  const router = useRouter();

  const formattedDate = (date: string) =>
    format(parseISO(date), 'dd MMM yyyy', { locale: ptBR });

  const fullFormattedDate = (date: string) => {
    const s = format(parseISO(date), 'EEEE, dd MMMM yyyy', { locale: ptBR });
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

  const pushTo = (type: 'author' | 'tag', value: string, e: React.MouseEvent) => {
    e.preventDefault();
    const url =
      type === 'author'
        ? `/profile/${slugify(value, { lower: true, strict: true })}`
        : `/tag?selected=${slugify(value, { lower: true, strict: true })}`;
    router.push(url);
  };

  return (
    <>
      <h2 className="ml-2 my-1.5 col-start-1 row-start-1 text-2xl font-somerton uppercase text-wheat">
        {heading}
      </h2>

      <div className="col-start-1 row-start-2 w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 mb-1">
        {posts.map((post, index) => (
          <Link
            key={index}
            className="bg-greyBg border border-t-0 border-zinc-700/30 rounded-lg overflow-hidden shadow-lg group"
            href={`/post/${slugify(post.title, { lower: true, strict: true })}`}
          >
            <div className="w-full h-[200px] relative">
              <Image
                src={post.image}
                alt={post.title}
                fill
                className="object-cover group-hover:scale-110 transition-transform duration-500 rounded-t-lg"
                sizes="(max-width: 1024px) 100vw, 25vw"
              />
            </div>

            <div className="flex flex-col p-4 h-52">
              <h3 className="text-wheat text-xl font-somerton line-clamp-2 uppercase">
                {highlight(post.title, highlightTerm)}
              </h3>

              <p className="text-zinc-400 text-sm font-europa mt-2 line-clamp-3">
                {highlight(post.description, highlightTerm)}
              </p>

              <div className="flex items-center justify-between my-2">
                <button
                  onClick={(e) => pushTo('tag', post.mainTag, e)}
                  className="hover:text-purpleContrast transition-colors uppercase font-bold text-sm text-zinc-300"
                >
                  {highlight(post.mainTag, highlightTerm)}
                </button>
                <span className="flex items-center gap-1 text-sm text-zinc-400">
                  <FontAwesomeIcon icon={faEye} />{' '}
                  <span>{post.views.toLocaleString()}</span>
                </span>
              </div>

              <div className="flex items-center justify-between text-zinc-400 text-sm">
                <button
                  onClick={(e) => pushTo('author', post.author, e)}
                  className="hover:text-purpleContrast transition-colors"
                >
                  {highlight(post.author, highlightTerm)}
                </button>
                <time
                  className="capitalize"
                  title={fullFormattedDate(post.date)}
                  dateTime={post.date}
                >
                  {formattedDate(post.date)}
                </time>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
