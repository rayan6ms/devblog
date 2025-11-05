'use client'


import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import CircleProgress from './CircleProgress';
import Popover from './Popover';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye } from '@fortawesome/free-solid-svg-icons';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import slugify from 'slugify';
import { IPost } from '@/data/posts';

interface RecentItemProps {
  post: IPost;
  isBig?: boolean;
}

export default function RecentItem({post, isBig}: RecentItemProps) {
  const { image, mainTag, title, author, date, views, hasStartedReading, percentRead } = post;
  
  const formattedDate = format(parseISO(date), 'dd MMM yyyy');
  let formattedAuthor = author.length > 20 ? `${author.slice(0, 20)}...` : author;
  formattedAuthor = formattedAuthor.toLowerCase().replace(/(^|\s)\S/g, (l) => l.toUpperCase());

  const fullFormattedDate = (date: string) => {
    const s = format(parseISO(date), 'EEEE, dd MMMM yyyy', { locale: ptBR })
    return s.charAt(0).toUpperCase() + s.slice(1)
  };

  const formattedViews = (num: number) => num >= 1000 ? `${(num / 1000).toFixed(1)}k` : num;
  const router = useRouter();

  function handleRouteButtonClick(e: React.MouseEvent<HTMLButtonElement, MouseEvent>, path: string) {
    e.preventDefault();
    e.stopPropagation();
    router.push(path)
  }

  const [averageColor, setAverageColor] = useState<string | null>(null);

  function rgbToHex(r: number, g: number, b: number) {
    return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
  }

  useEffect(() => {
    const proxiedImageUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(image)}`;
  
    fetch(proxiedImageUrl)
      .then(response => response.blob())
      .then(blob => {
        const imgURL = URL.createObjectURL(blob);
        const img = new window.Image();
        img.src = imgURL;
  
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
  
          if (!ctx) return;
  
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  
          let r = 0, g = 0, b = 0, count = 0;
  
          for (let i = 0; i < imageData.length; i += 4) {
            r += imageData[i];
            g += imageData[i + 1];
            b += imageData[i + 2];
            count++;
          }
  
          r = Math.floor(r / count);
          g = Math.floor(g / count);
          b = Math.floor(b / count);
  
          setAverageColor(rgbToHex(r, g, b));
        };
      })
      .catch(error => console.error("Erro ao carregar a imagem:", error));
  }, [image]);  

  return (
    <Link href={`/post/${slugify(title, { lower: true, strict: true })}`} 
      className={`group flex flex-col w-[360px] sm:w-[460px] md:w-[360px] lg:w-[420px] rounded-lg h-fit  bg-[${averageColor}]/70
        ${isBig ? 'xxl:w-[600px] xxl:max-h-[720px] md:max-h-[600px] lg:max-h-[550px]' : 'lg:max-h-[425px] xxl:w-[320px] xxl:max-h-[360px]'}`
      }
      // use averageColor as background only when hover
      // style={{
      //   backgroundColor: averageColor,
      // }}
      onMouseEnter={() => setAverageColor(null)}
      onMouseLeave={() => setAverageColor(averageColor)}
    >
      <div
        className={`w-full rounded-lg relative ${isBig ? 'md:h-[340px] lg:h-[380px] xxl:h-[550px]' : 'lg:h-[270px] xxl:h-[210px]'}`}
      >
        <div className={`w-full h-full overflow-hidden rounded-lg`}>
          <Image
            src={ image }
            alt={ title }
            width={ 300 }
            height={ 210 }
            className={`rounded-lg shadow-inner object-cover transform group-hover:scale-110 transition-transform group-hover:duration-1000 duration-1000
            w-full h-full`}
          />
          {hasStartedReading && (
            <div className="absolute top-0 left-0 w-full h-full flex justify-center items-center">
              <CircleProgress
                radius={ isBig ? 55 : 45 }
                stroke={ isBig ? 7 : 5 }
                progress={ percentRead }
              />
            </div>
          )}
          {isBig && (
            <button
              onClick={(e) => handleRouteButtonClick(e, `/tag?selected=${slugify(mainTag, { lower: true, strict: true })}`)}
              className={`text-[13px] tracking-[.06em] leading-5 w-fit font-sans
                text-zinc-400 mt-4 hover:text-purpleContrast capitalize transition-all ease-in-out duration-300
                ${isBig && 'bg-gray-800 px-2 rounded-full hover:text-wheat hover:bg-purpleContrast absolute overflow-visible -bottom-3 right-1/2 translate-x-1/2'}`
              }
            >
              { mainTag }
            </button>
          )}
        </div>
      </div>
      {!isBig && (
        <div className="flex items-center justify-between mt-2">
          <button
            onClick={(e) => handleRouteButtonClick(e, `/tag?selected=${slugify(mainTag, { lower: true, strict: true })}`)}
            className="text-[13px] tracking-[.06em] leading-5 w-fit font-sans text-zinc-400 hover:text-purpleContrast uppercase transition-all ease-in-out duration-300"
          >
            { mainTag }
          </button>
          <Popover iconSize="lg" />
        </div>
      )}
      <span className={`flex ${isBig && 'mt-8'}`}>
        <p
          className={`w-fit max-h-28 ${isBig ? 'xxl:text-3xl text-2xl text-center' : 'text-xl'} line-clamp-3 ${isBig ? 'mx-auto pl-10 pr-2' : 'mt-2'}`}
          title={ title }
        >
          { title }
        </p>
        {isBig && <Popover iconSize="xl" />}
      </span>
      <div className={`pt-2 flex gap-4 text-zinc-400 text-sm font-europa ${isBig && 'mx-auto mb-4'}`}>
        <button
          onClick={(e) => handleRouteButtonClick(e, `/profile/${slugify(author, { lower: true, strict: true })}`)}
          className="text-wheat text-sm hover:text-purpleContrast transition-all ease-in-out"
        >
          { formattedAuthor }
        </button>
        <time title={fullFormattedDate(date)} dateTime={ date } >{ formattedDate }</time>
        <p className="flex items-center gap-1">
          <FontAwesomeIcon icon={ faEye } /> <span>{ formattedViews(views) }</span>
        </p>
      </div>
    </Link>
  );
}
