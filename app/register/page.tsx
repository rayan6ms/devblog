'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGoogle, faGithub, faFacebook, faDiscord } from '@fortawesome/free-brands-svg-icons';
import { faArrowRight, faEye, faEyeSlash, faSpinner } from '@fortawesome/free-solid-svg-icons';
import SocialAuthButton from '../login/SocialAuthButton';

const P5Background = dynamic(() => import('@/P5Background'), { ssr: false });

export default function RegisterForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const router = useRouter();

  const socialAuthOptions = [
    { provider: 'google', icon: faGoogle, bgColor: 'bg-slate-700', hoverBgColor: 'hover:bg-slate-800/60 border border-gray-600/60' },
    { provider: 'github', icon: faGithub, bgColor: 'bg-gray-800', hoverBgColor: 'hover:bg-gray-900 border border-gray-700' },
    { provider: 'facebook', icon: faFacebook, bgColor: 'bg-blue-600', hoverBgColor: 'hover:bg-blue-700 border border-blue-500/50' },
    { provider: 'discord', icon: faDiscord, bgColor: 'bg-indigo-500', hoverBgColor: 'hover:bg-indigo-600 border border-gray-500' },
  ];

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    try {
      // Implementar lógica de registro com email e senha
      router.push('/login');
    } catch (error) {
      console.error(error);
    }
  };

  const handleSocialAuth = async (provider: string) => {
    // Implementar lógica de autenticação social
  };

  return (
    <>
      <P5Background />
      <form 
        onSubmit={handleSubmit}
        className="absolute w-1/4 h-3/5 bg-darkBg/90 mb-32 rounded-3xl border border-zinc-600/60 shadow-md shadow-zinc-900 text-zinc-300 p-8 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
      >
        <h1 className="text-2xl mb-6 text-center">Register</h1>
        
        <div className="mb-4">
          <label htmlFor="email" className="block mb-2">Email:</label>
          <input 
            type="email" 
            id="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-2 rounded-md bg-lessDarkBg border border-zinc-500/60 text-zinc-300" 
            required
          />
        </div>

        <div className="mb-4">
          <label htmlFor="password" className="block mb-2">Password:</label>
          <div className="relative flex items-center border border-zinc-500/60 rounded-md bg-lessDarkBg">
            <input 
              type={showPassword ? "text" : "password"} 
              id="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 pr-12 rounded-md bg-transparent text-zinc-400"
              required
            />
            <FontAwesomeIcon
              icon={showPassword ? faEye : faEyeSlash} 
              className="absolute right-3.5 cursor-pointer text-zinc-400 hover:text-zinc-300 transition-colors duration-200"
              onClick={() => setShowPassword(!showPassword)}
            />
          </div>
        </div>

        <div className="mb-6">
          <label htmlFor="password" className="block mb-2">Password:</label>
          <div className="relative flex items-center border border-zinc-500/60 rounded-md bg-lessDarkBg">
            <input 
              type={showPassword ? "text" : "password"} 
              id="password" 
              value={confirmPassword} 
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full p-2 pr-12 rounded-md bg-transparent text-zinc-400"
              required
            />
            <FontAwesomeIcon
              icon={showPassword ? faEye : faEyeSlash} 
              className="absolute right-3.5 cursor-pointer text-zinc-300 hover:text-zinc-300 transition-colors duration-200"
              onClick={() => setShowPassword(!showPassword)}
            />
          </div>
        </div>

        <div className="flex space-x-2 my-4">
          {socialAuthOptions.map((option) => (
            <SocialAuthButton 
              key={option.provider}
              provider={option.provider}
              icon={option.icon}
              bgColor={option.bgColor}
              hoverBgColor={option.hoverBgColor}
              // handleAuth={handleSocialAuth}
            />
          ))}
        </div>

        <div className="w-full flex flex-col items-center justify-center mt-12">
          <button
            className={`flex justify-center items-center self-center p-4 px-5 border-2 border-zinc-600/70 text-zinc-400 rounded-xl transition-all ease-in-out duration-200 ${(email && password && confirmPassword) ? 'cursor-pointer bg-purpleContrast hover:bg-purpleContrast/75' : 'cursor-not-allowed'}`}
            disabled={!(email && password) || isLoading}
            onClick={() => setIsLoading(true)}
          >
            <FontAwesomeIcon
              className={`text-zinc-${(email && password && confirmPassword) ? '300' : '500' } ${isLoading && 'animate-spin'}`}
              icon={isLoading ? faSpinner : faArrowRight}
              size="2x"
            />
          </button>
            <span className="text-sm font-europa mt-2 text-zinc-300 p-2">
              Already have an account?
              <button
                className="ml-1 underline hover:text-purpleContrast transition-all ease-in-out duration-200"
                onClick={() => router.push('/login')}
              >
                Login
              </button>
            </span>
        </div>
      </form>
    </>
  );
}