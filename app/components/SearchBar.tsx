'use client'


import { useState, useEffect, useCallback, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch } from '@fortawesome/free-solid-svg-icons';

export default function SearchBar({tabIndex}: {tabIndex?: number}) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [shouldRound, setShouldRound] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  const searchInput = useRef<HTMLInputElement>(null);
  const toggleOpen = useCallback(() => setIsSearchOpen(prevOpen => !prevOpen), []);

  useEffect(() => {
    isSearchOpen ? setShouldRound(!isSearchOpen) : setTimeout(() => setShouldRound(!isSearchOpen), 460);
  
    if (isSearchOpen && searchInput.current) {
      setTimeout(() => searchInput.current!.focus(), 500);
    }
  }, [isSearchOpen]);

  return (
    <div className="flex justify-end w-64 sm:w-80">
      <input
        ref={searchInput}
        tabIndex={tabIndex}
        type="text"
        className={`bg-transparent px-2 transition-all ease-in-out duration-500
          ${isSearchOpen ? 'w-full border' : 'w-0 border-0 invisible'}
          ${isHovered ? 'border-purpleContrast' : 'border-wheat'} border-r-0
          rounded-full rounded-r-none focus:outline-none`}
      />
      <button
        onClick={toggleOpen}
        tabIndex={tabIndex}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`flex bg-wheat rounded-full p-2 shadow-none
          hover:bg-purpleContrast hover:duration-200
          transition-all ease-in-out group ${!shouldRound && 'rounded-l-none'}`}
      >
        <FontAwesomeIcon icon={faSearch} size="lg" className="text-darkBg group-hover:text-wheat" />
      </button>
    </div>
  );
};
