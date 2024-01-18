'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { IconDefinition, faMasksTheater, faGhost, faBolt } from "@fortawesome/free-solid-svg-icons";
import slugify from 'slugify';

type Panel = {
  tag: string;
  description: string;
  author: string;
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
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const handlePanelClick = (index: number) => {
    setActivePanel(index);
    setUserSelected(true);

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  useEffect(() => {
    if (!userSelected) {
      intervalRef.current = setInterval(() => {
        setActivePanel(prev => (prev + 1) % panels.length);
      }, 6000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [panels.length, userSelected]);

  return (
    <div
      className="grid grid-flow-col gap-4 md:w-full max-w-5xl mx-auto py-4 md:h-[450px] md:mt-20 transition-all duration-700"
      style={{gridTemplateColumns: panels.map((_p, i) => i === activePanel ? '3fr' : '1fr').join(' ')}}
    >
      {panels.slice(0, 6).map(({ tag, description, author, image }, index) => {
        const authorId = slugify(author, { lower: true, strict: true });
        let formattedAuthor = author.length > 20 ? `${author.slice(0, 20)}...` : author;
        formattedAuthor = formattedAuthor.toLowerCase().replace(/(^|\s)\S/g, (l) => l.toUpperCase());
        return (
        <div
          key={index}
          className={`relative overflow-hidden h-28 md:h-full transition-all ease-in-out ${activePanel === index ? 'rounded-3xl duration-200' : 'rounded-full duration-700 delay-500'} ${focusedPanel === index && 'outline outline-offset-2 transition-none'}`}
          onClick={() => handlePanelClick(index)}
        >
          <h2
            className={`flex flex-col transition-all duration-700 delay-100 ${!(activePanel === index) && 'px-[35px]'} md:relative md:inset-auto md:bg-transparent bg-black bg-opacity-60 h-fit w-fit rounded-full px-3 pt-3`}
          >
            <button
              className={`flex gap-2 items-center focus:outline-none focus:transition-none transition-all duration-300 delay-200 ${activePanel === index && 'bg-black/50 rounded-full'}`}
              onFocus={() => setFocusedPanel(index)}
              onBlur={() => setFocusedPanel(null)}
            >
              <FontAwesomeIcon
                icon={iconMap[slugify(tag, { lower: true, strict: true })]}
                className={`w-8 h-8 bg-black bg-opacity-60 drop-shadow-md rounded-full p-2`}
              />
              <span
                className={`pr-4 text-2xl font-extrabold capitalize opacity-0 transition-all duration-200 delay-300 ${activePanel === index && 'opacity-100'}`}
              >
                { tag }
              </span>
            </button>
          </h2>
          <div className={`px-8 mt-4 text-lg font-bold brightness-110 transition-all duration-700 ease-in-out ${activePanel === index ? 'opacity-100' : 'opacity-0 invisible'}`}>
            <p
              className={`[text-shadow:_0_2px_4px_var(--tw-shadow-color)] shadow-zinc-600 transition-all duration-700 ease-in-out line-clamp-10 ${activePanel === index ? 'opacity-100' : 'opacity-0'}`}
              title={description}
            >
              {description}
            </p>
            <a
              href={`/profile/${authorId}`}
              className="block transition-all duration-100 font-bold mt-2 text-sm w-fit ml-auto text-gray-300 hover:text-purpleContrast"
            >
              {formattedAuthor}
            </a>
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