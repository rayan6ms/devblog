'use client'


import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faBookmark } from '@fortawesome/free-solid-svg-icons';
import SearchBar from './SearchBar';
import Icons from './Icons';
import HamburgerMenu from './HamburgerMenu';

export default function NavBar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [progress, setProgress] = useState(0);

  const activeUser = 'me';
  const pathname = usePathname();
  const inPost = pathname.includes('/post/');

  useEffect(() => {
    const handleScroll = () => {
      const headerHeight = 236;
      let scrollTop = document.documentElement.scrollTop || document.body.scrollTop;

      scrollTop = Math.max(scrollTop - headerHeight, 0);

      const scrollHeight = document.documentElement.scrollHeight - headerHeight;
      const clientHeight = document.documentElement.clientHeight;

      const scrolledPercentage = (scrollTop / (scrollHeight - clientHeight)) * 100;

      setProgress(scrolledPercentage);
    };

    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const show = window.scrollY > 191;
      if (isScrolled !== show) {
        setIsScrolled(show);
      }
    };

    document.addEventListener('scroll', handleScroll);
    return () => {
      document.removeEventListener('scroll', handleScroll);
    };
  }, [isScrolled]);

  interface NavLink {
    [key: string]: string;
  };

  const navLinks: NavLink[] = [
    {'home': '/'},
    {'recent': '/recent'},
    {'trending': '/trending'},
    {'tags': '/tag'},
    {'videos': '/videos'},
    {'playground': '/playground'},
  ];

  const mappedLinks: JSX.Element[] = navLinks.map((linkObj: NavLink, index) => {
    const link: string = Object.keys(linkObj)[0];
    const route: string = linkObj[link];
  
    return (
      <li
        key={index}
        className={`w-fit py-2 px-2 mx-2 border-b-2 ${pathname === route ? 'border-purpleContrast' : 'border-transparent'} hover:border-purpleContrast transition-all duration-500 ease-in-out`}
      >
        <a
          href={`${route}`}
          tabIndex={ isScrolled ? 0 : -1 }
          className="text-wheat font-sans font-bold hover:delay-300 uppercase
          hover:text-purpleContrast hover:duration-200 transition-all ease-in"
        >
          {link}
        </a>
      </li>
    );
  });

  const showHeader = pathname === '/login' || pathname === '/register';
  
  return showHeader ? <></> : (
    <>
      <nav className="flex justify-around items-center bg-greyBg py-4">
        {isMenuOpen && (
          <div className="fixed top-0 left-0 w-full h-full bg-darkBg z-50">
            <div className="w-3/4 mx-auto flex items-center justify-between">
              <a href="/">
                <h1 className="text-5xl font-somerton px-2 py-8">DEVBLoG</h1>
              </a>
              <HamburgerMenu isMenuOpen={ isMenuOpen } setIsMenuOpen={ setIsMenuOpen } />
            </div>
            <ul className="space-y-2 w-3/4 mx-auto">
              {mappedLinks}
            </ul>
            <Icons className="mt-10 flex justify-center" />
          </div>
        )}
        <ul className="md:flex space-x-4 hidden">
          {mappedLinks}
        </ul>
        <HamburgerMenu isMenuOpen={ isMenuOpen } setIsMenuOpen={ setIsMenuOpen } />
        <SearchBar />
      </nav>
      <div className={`${!isScrolled && '-translate-y-full'} transition-transform duration-300 ease-in-out shadow-lg w-full h-20 fixed top-0 z-40`}>
        <nav  
          className={`flex justify-center items-center w-full h-20 bg-greyBg `}
        >
          <a href="/" tabIndex={ isScrolled ? 0 : -1 }>
            <h1 className="hidden xxl:block text-5xl font-somerton ml-2 mr-56">
              DEVBLoG
            </h1>
          </a>
          <ul className="hidden lg:flex space-x-4">
              {mappedLinks}
          </ul>
          <div className="block lg:hidden">
            <HamburgerMenu isMenuOpen={ isMenuOpen } setIsMenuOpen={ setIsMenuOpen } fromScrollBar />
          </div>
          <div className="flex items-center space-x-4 ml-14">
            <SearchBar tabIndex={ isScrolled ? 0 : -1 } />
            <div className="hidden md:block">
              <a
                href={`/profile/${activeUser}`}
                tabIndex={ isScrolled ? 0 : -1 }
                className="rounded-full p-2 group transition-all ease-in-out"
              >
                <FontAwesomeIcon
                  className="text-wheat
                    group-hover:text-purpleContrast
                    transition-all ease-in-out"
                  icon={ faUser}
                  size="xl"
                />
              </a>
              <a
                href="/bookmarks"
                tabIndex={ isScrolled ? 0 : -1 }
                className="rounded-full p-2 group transition-all ease-in-out"
              >
                <FontAwesomeIcon
                  className="text-wheat
                    group-hover:text-purpleContrast
                    transition-all ease-in-out"
                  icon={ faBookmark }
                  size="xl"
                />
              </a>
            </div>
          </div>
        </nav>
        {isScrolled && inPost && (
          <div
            style={{ width: `${progress}%` }}
            className="h-1 bg-purpleContrast" 
          />
        )}
      </div>
    </>
  )
}