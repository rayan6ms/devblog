'use client'


import Link from 'next/link';
import slugify from 'slugify';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBookmark, faEye } from '@fortawesome/free-solid-svg-icons';

export default function PostHeader({tags}: {tags: string[]}) {
  const updated = true;
  const author = "Johann Gottfried";
  const date = "2023-11-20";

  const formattedViews = (num: number) => num >= 1000 ? `${(num / 1000).toFixed(1)}k` : num;

  const formattedDate = format(parseISO(date), 'dd MMM yyyy', { locale: ptBR }).replace(/ (\w)/, (_match, p1) => ` ${p1.toUpperCase()}`);

  const fullFormattedDate = (date: string) => format(parseISO(date), 'EEEE, dd MMMM yyyy', { locale: ptBR });

  let formattedAuthor = author.length > 20 ? `${author.slice(0, 20)}...` : author;
  formattedAuthor = formattedAuthor.toLowerCase().replace(/(^|\s)\S/g, (l) => l.toUpperCase());

  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  return (
    <section className="mb-6">
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-4">
          <Link href={`/profile/${slugify(author, { lower: true, strict: true })}`}>
            <img
              className="w-[52px] h-[52px] object-cover rounded-full"
              src="https://i.etsystatic.com/19286482/r/il/96c0fd/2980731281/il_1080xN.2980731281_j8z4.jpg"
              alt={`Avatar de ${author}`}
              title={`Avatar de ${author}`}
            />
          </Link>
          <div className="flex-col">
            <Link
              href={`/profile/${slugify(author, { lower: true, strict: true })}`}
              rel="author"
              className="text-gray-100 font-bold text-xl hover:text-purpleContrast transition-all ease-in-out"
            >
            { formattedAuthor }
            </Link>
            <p className="flex flex-col sm:flex-row gap-1 font-europa text-zinc-400">
              <span
                title={capitalize(fullFormattedDate(date))}
              >
                Postado <time dateTime={ date } >{ formattedDate }</time>
              </span>
              {updated && (
                <>
                  <span className="mx-0.5 hidden sm:block">•</span>
                  <span 
                    title={capitalize(fullFormattedDate(date))}
                  >
                    Atualizado <time dateTime={ date } >{ formattedDate }</time>
                  </span>
                </>
              )}
            </p>
          </div>
        </div>
        <div className="flex gap-2 mr-3 px-3 py-1 opacity-75 text-zinc-400 bg-zinc-800 rounded-xl">
          <p className="flex items-center gap-1">
            <FontAwesomeIcon icon={ faEye } /> <span>{ formattedViews(1320) }</span>
          </p>
          <span>|</span>
          <p className="flex items-center gap-1.5">
            <FontAwesomeIcon icon={ faBookmark } /> <span>{ formattedViews(430) }</span>
          </p>
        </div>
      </div>
        <h1 className="text-3xl text-wheat font-bold">
          Como melhorar a acessibilidade web
        </h1>
        <p className="text-lg mt-2 text-gray-200">
          A importância e técnicas de acessibilidade web.
        </p>
        <div className="border border-slate-700 my-3" />
          <div className="flex gap-2">
            {tags.slice(0, 5).map((tag: string) => (
              <Link
                key={tag}
                href={`/tag?selected=${slugify(tag, { lower: true, strict: true })}`}
                className="text-[13px] tracking-[.06em] leading-5 w-fit p-1 font-sans bg-gray-800 rounded-lg text-zinc-400 hover:bg-gray-700 hover:text-purpleContrast uppercase transition-all ease-in-out duration-300"
              >
                { tag }
              </Link>
            ))}
          </div>
    </section>
  )
}
