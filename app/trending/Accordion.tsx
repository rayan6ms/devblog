'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { IconDefinition, faMasksTheater, faGhost, faBolt, faCircleXmark } from "@fortawesome/free-solid-svg-icons";
import Image from 'next/image'
import Link from 'next/link'
import slugify from 'slugify';

type Panel = {
  tag: string;
  description: string;
  author: string;
  title: string;
  image: string;
};

type AccordionProps = {
  panels: Panel[];
};

type IconMap = {
  [key: string]: IconDefinition;
};

const iconMap: IconMap = {
  'viloes': faGhost,
  'herois': faBolt,
  'anti-herois': faMasksTheater,
};

export default function Accordion({ panels }: AccordionProps) {
  const [activePanel, setActivePanel] = useState(0);
  const [userSelected, setUserSelected] = useState(false);
  const [focusedPanel, setFocusedPanel] = useState<number | null>(null);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();
  const resizedPanels = panels.slice(0, windowWidth < 1200 ? 5 : 8);

  const handlePanelClick = (e: React.MouseEvent<HTMLElement>, index: number) => {
    if (e.target instanceof HTMLElement && e.target.tagName === 'A') return;
    setActivePanel(index);
    setUserSelected(true);

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (activePanel === index) {
      router.push(`/post/${slugify(resizedPanels[index].title, { lower: true, strict: true })}`);
    }
  }

  useEffect(() => {
    const startAutoMove = () => {
      if (!intervalRef.current) {
        intervalRef.current = setInterval(() => {
          setActivePanel(prev => (prev + 1) % resizedPanels.length);
        }, 7000);
      }
    };
  
    startAutoMove();
  
    let autoMoveTimeout: NodeJS.Timeout | null = null;
  
    if (userSelected) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
  
      autoMoveTimeout = setTimeout(() => {
        setUserSelected(false);
        startAutoMove();
      }, 10000);
    }

    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (autoMoveTimeout) {
        clearTimeout(autoMoveTimeout);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, [resizedPanels.length, userSelected]);


  const isMobile = windowWidth < 918;

  const gridStyle = resizedPanels.map((_p, i) => i === activePanel ? '3fr' : '1fr').join(' ');

  return (
    <div
      className={`grid gap-4 lg:w-3/4 sm:w-2/3 px-2 xs:px-8 sm:px-0 max-w-5xl mx-auto py-4 ${isMobile ? "h-[700px]" : "h-[450px]"} transition-all duration-700`}
      style={{
        gridTemplateColumns: isMobile ? 'none' : gridStyle,
        gridTemplateRows: isMobile ? gridStyle : 'none'
      }}
    >
      {resizedPanels.map(({ tag, description, author, image }, index) => {
        const authorId = slugify(author, { lower: true, strict: true });
        let formattedAuthor = author.length > 20 ? `${author.slice(0, 20)}...` : author;
        formattedAuthor = formattedAuthor.toLowerCase().replace(/(^|\s)\S/g, (l) => l.toUpperCase());
        return (
          <div
            key={index}
            className={`relative overflow-hidden h-full transition-all ease-in-out ${activePanel === index ? 'cursor-pointer rounded-3xl duration-200' : 'rounded-full duration-700 delay-500'} ${focusedPanel === index && 'outline outline-offset-2 transition-none'}`}
            onClick={(e) => handlePanelClick(e, index)}
          >
          <h2
            className={`flex flex-col transition-all duration-700 delay-100 ${!(activePanel === index) && 'justify-center items-center ml-2.5'} relative inset-auto bg-transparent bg-black bg-opacity-60 h-10 w-fit rounded-full px-3 mt-5`}
          >
            <button
              className={`flex h-12 gap-2 shadow-zinc-400/20 focus:outline-none focus:transition-none transition-all duration-300 delay-200 ${activePanel === index && 'bg-black/50 shadow-lg rounded-full'}`}
              onFocus={() => setFocusedPanel(index)}
              onBlur={() => setFocusedPanel(null)}
            >
              <div className="w-8">
                <FontAwesomeIcon
                  icon={iconMap[slugify(tag, { lower: true, strict: true })] || faCircleXmark}
                  className={`w-8 h-8 bg-black bg-opacity-60 rounded-full p-2`}
                />
              </div>
              <Link
                href={`/tag?selected=${slugify(tag, { lower: true, strict: true })}`}
                className={`flex items-center h-full px-3 text-2xl font-extrabold capitalize opacity-0 transition-all duration-200 delay-300 ${activePanel === index && 'opacity-100'} ${activePanel === index ? '' : 'pointer-events-none'}`}
              >
                {tag}
              </Link>
            </button>
          </h2>
          <div className={`px-8 mt-4 text-lg font-bold brightness-110 transition-all duration-700 ease-in-out ${activePanel === index ? 'opacity-100' : 'opacity-0 invisible'}`}>
            <p
              className={`[text-shadow:_0_2px_4px_var(--tw-shadow-color)] shadow-zinc-600 transition-all duration-700 ease-in-out line-clamp-10 ${activePanel === index ? 'opacity-100' : 'opacity-0'}`}
              title={description}
            >
              {description}
            </p>
            <Link
              href={`/profile/${authorId}`}
              className={`block transition-all duration-100 font-bold mt-2 text-sm w-fit ml-auto text-gray-300 hover:text-purpleContrast ${activePanel === index ? '' : 'pointer-events-none'}`}
            >
              {formattedAuthor}
            </Link>
          </div>
          <Image
            className={`absolute w-full h-full object-cover -z-10 transition-all ease-in-out duration-500 delay-100 ${activePanel === index && 'brightness-[0.7]'}`}
            fill
            src={image}
            alt={`${tag} image`}
          />
        </div>
      )})}
    </div>
  );
};