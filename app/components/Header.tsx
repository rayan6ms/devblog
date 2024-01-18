'use client'


import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faBookmark, faPaperPlane } from '@fortawesome/free-solid-svg-icons';
import Icons from './Icons';
import { usePathname } from 'next/navigation';

export default function Header() {
  const activeUser = 'me';
  const pathname = usePathname()
  const showHeader = pathname === '/login' || pathname === '/register';
  
  return showHeader ? <></> : (
    <header className="bg-darkBg py-6 md:p-7">
      <div className="flex justify-around items-center">
        <Icons className="hidden md:flex" />
        <a href="/">
          <h1 className="text-white text-6xl font-somerton">DEVBLoG</h1>
        </a>
        <nav className="flex space-x-4">
          <a
            href={`/profile/${activeUser}`}
            className="rounded-full p-2 group transition-all ease-in-out"
          >
            <FontAwesomeIcon
              className="text-wheat
                group-hover:text-purpleContrast
                transition-all ease-in-out"
              icon={ faUser}
              size="lg"
            />
          </a>
          <a
            href="bookmarks"
            className="rounded-full p-2 group transition-all ease-in-out"
          >
            <FontAwesomeIcon
              className="text-wheat
                group-hover:text-purpleContrast
                transition-all ease-in-out"
              icon={ faBookmark }
              size="lg"
            />
          </a>
          <a
            href="https://t.me/+d-L4_z7gQjg5ZWQx"
            target='_blank'
            className="hidden sm:flex border-2
              border-purpleContrast
              items-center space-x-1
              bg-purpleContrast
              rounded-md px-2
              hover:bg-indigo-700 transition-all ease-in-out"
          >
            <FontAwesomeIcon className="text-wheat pb-[2px] mr-[2px]" icon={ faPaperPlane } />
            <span className="text-wheat font-bold text-sm">TELEGRAM</span>
          </a>
        </nav>
      </div>
    </header>
  );
}
