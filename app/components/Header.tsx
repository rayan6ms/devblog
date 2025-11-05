'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faPaperPlane, faPlus, faLightbulb, faRightToBracket } from '@fortawesome/free-solid-svg-icons';
import Icons from './Icons';
import SuggestModal from './SuggestModal';

const WRITER_ROLES = ['owner', 'admin', 'writer'];

// localStorage.removeItem('authUser');
// localStorage.setItem('authUser', JSON.stringify({ id: 'me', role: 'writer' }));
// localStorage.setItem('authUser', JSON.stringify({ id: 'me', role: 'member' }));
// localStorage.setItem('userProfile', JSON.stringify({ ...JSON.parse(localStorage.getItem('userProfile')||'{}'), role: 'member' }));

export default function Header() {
  const pathname = usePathname();
  const hideHeader = pathname === '/login' || pathname === '/register' || pathname === '/not-found';

  const [isAuthed, setIsAuthed] = useState(false);
  const [activeUser, setActiveUser] = useState<string>('me');
  const [role, setRole] = useState<string>('member');
  const [isSuggestOpen, setIsSuggestOpen] = useState(false);

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

  if (hideHeader) return null;

  return (
    <>
      <header className="bg-darkBg py-6 md:p-7">
        <div className="flex justify-around items-center">
          <Icons className="hidden md:flex" />

          <Link href="/" aria-label="Home">
            <h1 className="text-white text-6xl font-somerton">DEVBLoG</h1>
          </Link>

          <nav className="flex space-x-4">
            <Link
              href={`/profile/${activeUser}`}
              className="rounded-full p-2 group transition-all ease-in-out"
              aria-label="Profile"
            >
              <FontAwesomeIcon className="text-wheat group-hover:text-purpleContrast transition-all ease-in-out" icon={faUser} size="lg" />
            </Link>

            {isAuthed ? (
              canWrite ? (
                <Link
                  href="/new_post"
                  className="flex items-center space-x-2 bg-neutral-800 border-2 border-neutral-500 hover:border-purpleContrast rounded-3xl px-2 py-1 hover:bg-indigo-700 transition-all"
                  aria-label="Create new post"
                >
                  <FontAwesomeIcon className="text-wheat" icon={faPlus} />
                  <span className="text-wheat font-bold text-sm">Create</span>
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsSuggestOpen(true)}
                  className="flex items-center space-x-2 bg-zinc-800 border-2 border-zinc-600 rounded-3xl px-2 py-1 hover:bg-zinc-700 transition-all"
                  aria-label="Suggest a post"
                  title="Suggest a post (requires review)"
                >
                  <FontAwesomeIcon className="text-zinc-200" icon={faLightbulb} />
                  <span className="text-zinc-200 font-semibold text-sm">Suggest</span>
                </button>
              )
            ) : (
              <Link
                href="/login"
                className="flex items-center space-x-2 bg-zinc-800 border-2 border-zinc-600 rounded-3xl px-2 py-1 hover:bg-zinc-700 transition-all"
                aria-label="Login"
              >
                <FontAwesomeIcon className="text-zinc-200" icon={faRightToBracket} />
                <span className="text-zinc-200 font-semibold text-sm">Login</span>
              </Link>
            )}

            <a
              href="https://t.me/+d-L4_z7gQjg5ZWQx"
              target="_blank"
              className="hidden sm:flex border-2 border-purpleContrast items-center space-x-1 bg-purpleContrast rounded-md px-2 hover:bg-indigo-700 transition-all ease-in-out"
            >
              <FontAwesomeIcon className="text-wheat pb-[2px] mr-[2px]" icon={faPaperPlane} />
              <span className="text-wheat font-bold text-sm">TELEGRAM</span>
            </a>
          </nav>
        </div>
      </header>

      <SuggestModal isOpen={isSuggestOpen} onClose={() => setIsSuggestOpen(false)} authorId={activeUser} />
    </>
  );
}
