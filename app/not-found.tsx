'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';

const P5Background = dynamic(() => import('@/P5Background'), { ssr: false });

export default function NotFound() {
  const router = useRouter();
  const pathname = usePathname();

  const [backgroundMounted, setBackgroundMounted] = useState(false);

  useEffect(() => {
    if (pathname !== '/not-found') router.push('/not-found');
    if (!backgroundMounted) setBackgroundMounted(true);
  }, [router, pathname, backgroundMounted]);

  return (
    <>
      {backgroundMounted && <P5Background />}
      <div className="absolute flex flex-col items-center justify-center p-5 rounded-lg  top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
        <div className="relative mb-6">
          <h1 className="text-9xl font-bold text-purpleContrast [text-shadow:_0_2px_4px_var(--tw-shadow-color)] shadow-zinc-400/60">OOPS!</h1>
          <h2 className="absolute text-7xl font-somerton font-bold text-white z-10 p-2 px-4 left-1/2 transform -translate-x-1/2 -translate-y-1/2 [text-shadow:_0_2px_4px_var(--tw-shadow-color)] shadow-zinc-400/50">BlogDev?</h2>
        </div>
        <p className="text-xl mt-5 z-10">A página que você está procurando não foi encontrada.</p>
        <Link href="/" className="mt-5 px-4 py-2 bg-blue-500 text-zinc-200 rounded hover:bg-blue-700 transition duration-200 z-10">
          Voltar para a Página Inicial
        </Link>
      </div>
    </>
  );
}