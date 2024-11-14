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
  const [suggestions, setSuggestions] = useState<Post[]>([]); // Definindo o tipo correto
  const searchInput = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const toggleOpen = useCallback(() => setIsSearchOpen(prevOpen => !prevOpen), []);

  useEffect(() => {
    isSearchOpen
      ? setShouldRound(false)
      : setTimeout(() => setShouldRound(true), 460);

    if (isSearchOpen && searchInput.current) {
      setTimeout(() => searchInput.current!.focus(), 500);
    }
  }, [isSearchOpen]);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (query.trim()) {
        const result = await getSearchSuggestions(query);
        setSuggestions(result);
      } else {
        setSuggestions([]);
      }
    };
    fetchSuggestions();
  }, [query]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${query}`);
    }
  };

  return (
    <form onSubmit={handleSearch} className="relative flex justify-end w-64 sm:w-80">
      <input
        ref={searchInput}
        tabIndex={tabIndex}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)} // Atualiza o valor do input
        className={`bg-transparent px-2 transition-all ease-in-out duration-500
          ${isSearchOpen ? 'w-full border' : 'w-0 border-0 invisible'}
          ${isHovered ? 'border-purpleContrast' : 'border-wheat'} border-r-0
          rounded-full rounded-r-none focus:outline-none text-lightBg`}
      />
      <button
        onClick={toggleOpen}
        tabIndex={tabIndex}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`flex bg-wheat rounded-full p-2 shadow-none
          hover:bg-purpleContrast hover:duration-75
          transition-all ease-in-out group ${!shouldRound && 'rounded-l-none'}`}
      >
        <FontAwesomeIcon icon={faSearch} size="lg" className="text-darkBg group-hover:text-wheat" />
      </button>

      {suggestions.length > 0 && (
        <ul className="absolute mt-9 bg-greyBg border border-gray-700 rounded-lg w-full z-10">
          {suggestions.map((suggestion, index) => (
            <li
              key={index}
              onClick={() => {
                setQuery(suggestion.title);
                router.push(`/search?q=${suggestion.title}`);
              }}
              className="cursor-pointer p-2 leading-7 line-clamp-1 hover:rounded-lg hover:bg-lessDarkBg text-lightBg"
            >
              {suggestion.title}
            </li>
          ))}
        </ul>
      )}
    </form>
  );
};
