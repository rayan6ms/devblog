'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faPlus, faLightbulb, faRightToBracket } from '@fortawesome/free-solid-svg-icons';
import SearchBar from './SearchBar';
import Icons from './Icons';
import HamburgerMenu from './HamburgerMenu';
import SuggestModal from './SuggestModal';

const WRITER_ROLES = ['owner', 'admin', 'writer'];

export default function NavBar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [progress, setProgress] = useState(0);

  const [isAuthed, setIsAuthed] = useState(false);
  const [activeUser, setActiveUser] = useState<string>('me');
  const [role, setRole] = useState<string>('member');
  const [isSuggestOpen, setIsSuggestOpen] = useState(false);

  const pathname = usePathname();
  const inPost = pathname.includes('/post/');

  useEffect(() => {
    const readAuth = () => {
      try {
        const authRaw = localStorage.getItem('authUser');
        const profileRaw = localStorage.getItem('userProfile');

        let authed = false;
        let id = 'me';
        let r: string | undefined = undefined;

        if (authRaw) {
          const parsed = JSON.parse(authRaw);
          authed = true;
          id = parsed?.id ?? 'me';
          r = parsed?.role;
        }
        if (!r && profileRaw) {
          const p = JSON.parse(profileRaw);
          r = p?.role;
        }

        setIsAuthed(authed);
        setActiveUser(id);
        setRole((r || 'member').toLowerCase());
      } catch {
        setIsAuthed(false);
        setActiveUser('me');
        setRole('member');
      }
    };

    readAuth();
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'authUser' || e.key === 'userProfile') readAuth();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const canWrite = useMemo(() => WRITER_ROLES.includes(role), [role]);

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
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const show = window.scrollY > 191;
      if (isScrolled !== show) setIsScrolled(show);
    };
    document.addEventListener('scroll', handleScroll);
    return () => document.removeEventListener('scroll', handleScroll);
  }, [isScrolled]);

  interface NavLink { [key: string]: string; }

  const navLinks: NavLink[] = [
    { home: '/' },
    { recent: '/recent' },
    { trending: '/trending' },
    { tags: '/tag' },
    { about: '/about' },
    { playground: '/playground' },
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
          tabIndex={isScrolled ? 0 : -1}
          className="text-wheat font-sans font-bold uppercase hover:text-purpleContrast hover:duration-200 transition-all ease-in"
        >
          {link}
        </a>
      </li>
    );
  });

  const showHeader = pathname === '/login' || pathname === '/register' || pathname === '/not-found';

  return showHeader ? null : (
    <>
      <nav className="flex justify-around items-center bg-greyBg py-4">
        {isMenuOpen && (
          <div className="fixed top-0 left-0 w-full h-full bg-darkBg z-50">
            <div className="w-3/4 mx-auto flex items-center justify-between">
              <a href="/"><h1 className="text-5xl font-somerton px-2 py-8">DEVBLoG</h1></a>
              <HamburgerMenu isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} />
            </div>
            <ul className="space-y-2 w-3/4 mx-auto">{mappedLinks}</ul>
            <Icons className="mt-10 flex justify-center" />
          </div>
        )}
        <ul className="md:flex space-x-4 hidden">{mappedLinks}</ul>
        <HamburgerMenu isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} />
        <SearchBar />
      </nav>

      <div className={`${!isScrolled && '-translate-y-full'} transition-transform duration-300 ease-in-out shadow-lg w-full h-20 fixed top-0 z-40`}>
        <nav className="flex justify-center items-center w-full h-20 bg-greyBg">
          <a href="/" tabIndex={isScrolled ? 0 : -1}>
            <h1 className="hidden xxl:block text-5xl font-somerton ml-2 mr-56">DEVBLoG</h1>
          </a>

          <ul className="hidden lg:flex space-x-4">{mappedLinks}</ul>

          <div className="block lg:hidden">
            <HamburgerMenu isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} fromScrollBar />
          </div>

          <div className="flex items-center space-x-4 ml-14">
            <SearchBar tabIndex={isScrolled ? 0 : -1} />

            <div className="hidden md:flex items-center space-x-2">
              <Link
                href={`/profile/${activeUser}`}
                tabIndex={isScrolled ? 0 : -1}
                className="rounded-full p-2 group transition-all ease-in-out"
                aria-label="Profile"
                title="Profile"
              >
                <FontAwesomeIcon className="text-wheat group-hover:text-purpleContrast transition-all ease-in-out" icon={faUser} size="xl" />
              </Link>

              {isAuthed ? (
                WRITER_ROLES.includes(role) ? (
                  <Link
                    href="/new_post"
                    tabIndex={isScrolled ? 0 : -1}
                    aria-label="Create new post"
                    className="inline-flex items-center space-x-2 bg-neutral-800 border-2 border-neutral-500 hover:border-purpleContrast rounded-3xl px-3 py-1.5 hover:bg-indigo-700 transition-all"
                  >
                    <FontAwesomeIcon className="text-wheat" icon={faPlus} />
                    <span className="text-wheat font-bold text-sm">Create</span>
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsSuggestOpen(true)}
                    tabIndex={isScrolled ? 0 : -1}
                    aria-label="Suggest a post"
                    title="Suggest a post (requires review)"
                    className="inline-flex items-center space-x-2 bg-zinc-800 border-2 border-zinc-600 hover:border-purpleContrast rounded-3xl px-3 py-1.5 hover:bg-zinc-700 transition-all"
                  >
                    <FontAwesomeIcon className="text-zinc-200" icon={faLightbulb} />
                    <span className="text-zinc-200 font-semibold text-sm">Suggest</span>
                  </button>
                )
              ) : (
                <Link
                  href="/login"
                  tabIndex={isScrolled ? 0 : -1}
                  aria-label="Login"
                  className="inline-flex items-center space-x-2 bg-zinc-800 border-2 border-zinc-600 rounded-3xl px-3 py-1.5 hover:bg-zinc-700 transition-all"
                >
                  <FontAwesomeIcon className="text-zinc-200" icon={faRightToBracket} />
                  <span className="text-zinc-200 font-semibold text-sm">Login</span>
                </Link>
              )}
            </div>
          </div>
        </nav>

        {isScrolled && inPost && <div style={{ width: `${progress}%` }} className="h-1 bg-purpleContrast" />}
      </div>

      <SuggestModal isOpen={isSuggestOpen} onClose={() => setIsSuggestOpen(false)} authorId={activeUser} />
    </>
  );
}
