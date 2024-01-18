'use client'


import { useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const router = useRouter();

  if (!isOpen) return null;

  return (
    <div
      className="fixed top-0 left-0 w-full h-full flex items-center justify-center bg-gray-900 bg-opacity-50 z-50"
      onClick={onClose}
    >
      <div
        className="bg-darkBg border border-zinc-700/50 shadow-md shadow-zinc-900 rounded-lg p-10 w-11/12 md:w-[50%] lg:w-[40%]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold mb-3 text-purpleContrast">
            Você precisa estar logado para fazer isto!
          </h2>
          <button onClick={onClose}>
            <FontAwesomeIcon icon={faTimes} className="w-8 h-8 p-1 text-wheat hover:text-purpleContrast hover:bg-gray-700/50 rounded-xl transition-colors ease-in-out duration-200" />
          </button>
        </div>
        <div className="border-b border-zinc-400 my-3" />
        <h1 className="text-6xl font-somerton ml-2 mb-3">
          DEVBLoG
        </h1>
        <p className="text-gray mb-8">Descubra uma experiência melhor ao se conectar. Participe da conversa!</p>
        <div className="flex flex-col justify-center items-center gap-4">
          <button 
            onClick={() => router.push('/login')}
            className="bg-purpleContrast/80 hover:bg-purpleContrast hover:brightness-110 text-gray-100 p-2 rounded-md w-5/6 transition duration-300 hover:bg-slate"
          >
            Login
          </button>
          <button 
            onClick={() => router.push('/register')} 
            className="bg-lessDarkBg hover:brightness-125 text-gray-100 p-2 rounded-md w-5/6 transition duration-300 hover:bg-slate"
          >
            Registro
          </button>
        </div>
        <button 
          onClick={onClose} 
          className="absolute top-2 right-2 text-gray-100"
          aria-label="Close Modal"
        >
          &times;
        </button>
      </div>
    </div>
  );
}

export default LoginModal;