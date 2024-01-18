import { useEffect, useRef, useState } from 'react';

interface InfiniteScrollerProps {
  tags: string[];
  direction: 'left' | 'right';
  onSelectTag?: (tag: string) => void;
}

export default function InfiniteScroller({ tags, direction, onSelectTag }: InfiniteScrollerProps) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    let animationFrameId: number;

    const scrollInfinite = () => {
      if (scrollerRef.current && !isHovering) {
        const scroller = scrollerRef.current;
        if (direction === 'right') {
          scroller.scrollLeft -= 1;
          if (scroller.scrollLeft <= 0) {
            scroller.scrollLeft = scroller.scrollWidth / 2;
          }
        } else {
          scroller.scrollLeft += 1;
          if (scroller.scrollLeft + scroller.clientWidth >= scroller.scrollWidth) {
            scroller.scrollLeft = scroller.scrollWidth / 2 - scroller.clientWidth;
          }
        }
      }

      animationFrameId = requestAnimationFrame(scrollInfinite);
    };

    animationFrameId = requestAnimationFrame(scrollInfinite);

    return () => cancelAnimationFrame(animationFrameId);
  }, [direction, isHovering]);

  return (
    <div
      ref={scrollerRef}
      className="overflow-x-hidden whitespace-nowrap shadow-inner shadow-darkBg rounded-2xl"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {tags.map((tag, index) => (
        <span
          key={index}
          className="cursor-pointer inline-block px-4 uppercase hover:text-purpleContrast text-[13px] tracking-[.06em] leading-5 w-fit p-1 m-2 font-sans bg-gray-800 rounded-lg text-zinc-400 hover:bg-gray-700"
          onClick={() => onSelectTag && onSelectTag(tag)}
        >
          {tag}
        </span>
      ))}
      {tags.map((tag, index) => (
        <span
          key={`duplicate-${index}`}
          className="cursor-pointer inline-block px-4 uppercase hover:text-purpleContrast text-[13px] tracking-[.06em] leading-5 w-fit p-1 m-2 font-sans bg-gray-800 rounded-lg text-zinc-400 hover:bg-gray-700"
          onClick={() => onSelectTag && onSelectTag(tag)}
        >
          {tag}
        </span>
      ))}
    </div>
  );
};