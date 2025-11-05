'use client'


import { useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGoogle, faGithub, faFacebook, faDiscord } from '@fortawesome/free-brands-svg-icons';
import { faArrowRight, faEye, faEyeSlash, faSpinner } from '@fortawesome/free-solid-svg-icons';
import SocialAuthButton from './SocialAuthButton';

const P5Background = dynamic(() => import('@/P5Background'), { ssr: false });

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const router = useRouter();

  const socialAuthOptions = [
    { provider: 'google', icon: faGoogle, bgColor: 'bg-slate-700', hoverBgColor: 'hover:bg-slate-800/60 border border-gray-600/60' },
    { provider: 'github', icon: faGithub, bgColor: 'bg-gray-800', hoverBgColor: 'hover:bg-gray-900 border border-gray-700' },
    { provider: 'facebook', icon: faFacebook, bgColor: 'bg-blue-600', hoverBgColor: 'hover:bg-blue-700 border border-blue-500/50' },
    { provider: 'discord', icon: faDiscord, bgColor: 'bg-indigo-500', hoverBgColor: 'hover:bg-indigo-600 border border-gray-500' },
  ];

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // TODO: login logic

    const user_slug = "johann-gottfried";

    try {
      // For the login, use a function that authenticates the user with email and password
      // For example: await signInWithEmailAndPassword(auth, email, password);

      router.push(`/profile/${user_slug}`);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <>
      <P5Background />
      <form
        onSubmit={handleSubmit}
        className="absolute w-1/4 h-2/4 bg-darkBg/90 mb-32 rounded-3xl border border-zinc-600/60 shadow-md shadow-zinc-900 text-zinc-300 p-8 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
      >
        <h1 className="text-2xl mb-6 text-center">Login</h1>

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

        <div className="mb-6">
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

        <div className="w-full flex flex-col items-center justify-center mt-10">
          <button
            type="submit"
            className={`flex justify-center items-center self-center p-4 px-5 border-2 border-zinc-600/70 text-zinc-400 rounded-xl transition-all ease-in-out duration-200 ${(email && password) ? 'cursor-pointer bg-purpleContrast hover:bg-purpleContrast/75' : 'cursor-not-allowed'}`}
            onClick={() => setIsLoading(true)}
            disabled={!(email && password) || isLoading}
          >
            <FontAwesomeIcon
              className={`text-zinc-${(email && password) ? '300' : '500'} ${isLoading && 'animate-spin'}`}
              icon={isLoading ? faSpinner : faArrowRight}
              size="2x"
            />
          </button>
          <span className="text-sm font-europa mt-2 text-zinc-300 p-2">
            Don't have an account?
            <button
              className="ml-1 underline hover:text-purpleContrast transition-all ease-in-out duration-200"
              onClick={() => router.push('/register')}
            >
              Register
            </button>
          </span>
        </div>
      </form>
    </>
  );
}