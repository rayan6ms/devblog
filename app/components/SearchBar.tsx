'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch } from '@fortawesome/free-solid-svg-icons';
import { getSearchSuggestions } from '@/data/posts';
import { useRouter } from 'next/navigation';

interface Post {
  image: string;
  mainTag: string;
  tags: string[];
  title: string;
  author: string;
  date: string;
  views: number;
  hasStartedReading: boolean;
  percentRead: number;
  description: string;
}

export default function SearchBar({ tabIndex }: { tabIndex?: number }) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [shouldRound, setShouldRound] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Post[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);

  const searchInput = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  const goToResults = (q: string) => {
    const queryString = encodeURIComponent(q.trim());
    if (!queryString) return;
    setSuggestions([]);
    setActiveIndex(-1);
    setIsSearchOpen(false);
    router.push(`/search?q=${queryString}&page=1`);
  };

  const toggleOpen = useCallback(() => {
    // - closed  > open + focus
    // - open + has query > search
    // - open + empty > close
    setIsSearchOpen(prev => {
      if (!prev) {
        requestAnimationFrame(() => searchInput.current?.focus());
        return true;
      } else {
        if (query.trim()) {
          goToResults(query);
        } else {
          return false;
        }
      }
      return prev;
    });
  }, [query]);

  useEffect(() => {
    isSearchOpen ? setShouldRound(false) : setTimeout(() => setShouldRound(true), 460);
    if (isSearchOpen && searchInput.current) {
      setTimeout(() => searchInput.current!.focus(), 500);
    }
  }, [isSearchOpen]);

  useEffect(() => {
    const handle = setTimeout(async () => {
      const q = query.trim();
      if (q.length >= 2) {
        const result = await getSearchSuggestions(q);
        setSuggestions(result);
        setActiveIndex(-1);
      } else {
        setSuggestions([]);
        setActiveIndex(-1);
      }
    }, 200);
    return () => clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) {
        setSuggestions([]);
        setActiveIndex(-1);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) goToResults(query);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setSuggestions([]);
      setActiveIndex(-1);
      return;
    }
    if (suggestions.length === 0) {
      if (e.key === 'Enter' && query.trim()) {
        e.preventDefault();
        goToResults(query);
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const chosen = activeIndex >= 0 ? suggestions[activeIndex].title : query;
      goToResults(chosen);
    }
  };

  return (
    <form
      ref={containerRef}
      onSubmit={handleSearch}
      className="relative flex justify-end w-64 sm:w-80"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setSuggestions([]);
          setActiveIndex(-1);
        }
      }}
    >
      <input
        ref={searchInput}
        tabIndex={tabIndex}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search…"
        className={`bg-transparent px-2 transition-all ease-in-out duration-500
          ${isSearchOpen ? 'w-full border' : 'w-0 border-0 invisible'}
          ${isHovered ? 'border-purpleContrast' : 'border-wheat'} border-r-0
          rounded-full rounded-r-none focus:outline-none text-lightBg`}
        aria-label="Search posts"
      />
      <button
        type="button"
        onClick={toggleOpen}
        tabIndex={tabIndex}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`flex bg-wheat rounded-full p-2 shadow-none
          hover:bg-purpleContrast hover:duration-75
          transition-all ease-in-out group ${!shouldRound && 'rounded-l-none'}`}
        aria-label={isSearchOpen ? 'Search' : 'Open search'}
      >
        <FontAwesomeIcon icon={faSearch} size="lg" className="text-darkBg group-hover:text-wheat" />
      </button>

      {suggestions.length > 0 && (
        <ul
          className="absolute mt-9 bg-greyBg border border-gray-700 rounded-lg w-full z-10 overflow-hidden"
          role="listbox"
          aria-label="Search suggestions"
        >
          {suggestions.map((suggestion, index) => {
            const isActive = index === activeIndex;
            return (
              <li
                key={suggestion.title + index}
                role="option"
                aria-selected={isActive}
                onMouseDown={(e) => {
                  e.preventDefault();
                  setQuery(suggestion.title);
                  goToResults(suggestion.title);
                }}
                className={`cursor-pointer p-2 leading-7 line-clamp-1 text-lightBg
                ${isActive ? 'bg-purpleContrast/40' : 'hover:bg-lessDarkBg'} `}
              >
                {suggestion.title}
              </li>
            );
          })}
          <li className="p-2 text-right">
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                goToResults(query);
              }}
              className="text-xs text-zinc-300 hover:text-wheat underline underline-offset-4"
            >
              View all results
            </button>
          </li>
        </ul>
      )}
    </form>
  );
}
