import { useState } from 'react';

interface HamburgerMenuProps {
  isMenuOpen: boolean,
  setIsMenuOpen: (isMenuOpen: boolean) => void;
  fromScrollBar?: boolean;
}

export default function HamburgerMenu({ isMenuOpen, setIsMenuOpen, handleButtonClick, fromScrollBar }: HamburgerMenuProps) {
  return (
    <button
      onClick={() => setIsMenuOpen(!isMenuOpen)}
      className={`w-fit h-fit block ${!isMenuOpen && !fromScrollBar ? 'md:hidden' : 'lg:hidden'} bg-transparent`}
    >
      <svg className="w-10 h-10 fill-wheat hover:fill-purpleContrast transition-color ease-in-out duration-200" viewBox="0 0 100 100">
        <rect
          className={`transition-transform duration-300 ${isMenuOpen && 'translate-y-0 translate-x-[39px] rotate-45'}`}
          width="80"
          height="10"
          x="10"
          y="25"
          rx="5"
        />
        <rect
          className={`transition-transform duration-400 ${isMenuOpen && 'opacity-0'}`}
          width="80"
          height="10"
          x="10"
          y="45"
          rx="5"
        />
        <rect
          className={`transition-transform duration-300 ${isMenuOpen && 'translate-y-[41px] -translate-x-[34px] -rotate-45'}`}
          width="80"
          height="10"
          x="10"
          y="65"
          rx="5"
        />
      </svg>
    </button>
  )
}