'use client'


import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGoogle, faGithub, faFacebook, faDiscord } from '@fortawesome/free-brands-svg-icons';
import { faArrowRight, faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import SocialAuthButton from './SocialAuthButton';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const router = useRouter();

  const socialAuthOptions = [
    { provider: 'google', icon: faGoogle, bgColor: 'bg-slate-700', hoverBgColor: 'hover:bg-slate-800/60 border border-gray-700/50' },
    { provider: 'github', icon: faGithub, bgColor: 'bg-gray-800', hoverBgColor: 'hover:bg-gray-900/50 border border-gray-800' },
    { provider: 'facebook', icon: faFacebook, bgColor: 'bg-blue-600', hoverBgColor: 'hover:bg-blue-700 border border-blue-500/50' },
    { provider: 'discord', icon: faDiscord, bgColor: 'bg-indigo-500', hoverBgColor: 'hover:bg-indigo-600 border border-gray-500' },
  ];

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // TODO: login logic

    const user_slug = "johann-gottfried";

    try {
      // Para o login, use uma função que autentica o usuário com email e senha
      // Por exemplo: await signInWithEmailAndPassword(auth, email, password);
  
      // Após a autenticação/registro bem-sucedida, redirecione para o perfil ou outra página
      router.push(`/profile/${user_slug}`);
    } catch (error) {
      console.error(error);
      // Trate erros, como email já em uso ou senha inválida
    }
  };

  const handleSocialAuth = async (provider: string) => {
    try {
      switch (provider) {
        case 'google':
          provider = new GoogleAuthProvider();
          break;
        case 'github':
          provider = new GithubAuthProvider();
          break;
        // Inclua casos para outros provedores como Facebook, Discord, etc.
        default:
          throw new Error('Provedor não suportado');
      }
  
      // Autenticação com o provedor selecionado
      const result = await signInWithPopup(auth, provider);
      // Você pode acessar informações do usuário através de result.user
  
      // Redirecione para o perfil ou outra página após o login bem-sucedido
      router.push(`/profile/${result.user.uid}`);
    } catch (error) {
      console.error(error);
      // Trate erros específicos da autenticação social
    }
  };

  return (
    <div className="w-full h-screen flex justify-center items-center bg-greyBg">
      <form 
        onSubmit={handleSubmit}
        className="w-1/4 h-2/4 bg-darkBg/80 mb-32 rounded-3xl border border-zinc-700/50 shadow-md shadow-zinc-900 text-zinc-400 p-8"
      >
        <h1 className="text-2xl mb-6 text-center">Login</h1>
        
        <div className="mb-4">
          <label htmlFor="email" className="block mb-2">Email:</label>
          <input 
            type="email"
            id="email"
            value={email} 
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-2 rounded-md bg-lessDarkBg border border-zinc-700/60 text-zinc-400" 
            required
          />
        </div>
        
        <div className="mb-6">
          <label htmlFor="password" className="block mb-2">Password:</label>
          <div className="relative flex items-center border border-zinc-700/60 rounded-md bg-lessDarkBg">
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
              className="absolute right-3.5 cursor-pointer text-zinc-400 hover:text-zinc-300 transition-colors duration-300"
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
              handleAuth={handleSocialAuth}
            />
          ))}
        </div>

        {/* <button type="submit" className="w-full p-2 rounded-md shadow-md shadow-zinc-900 bg-purpleContrast hover:brightness-110 text-zinc-200 hover:bg-slate transition-colors duration-300">
          Login
        </button> */}
        <div className="w-full flex flex-col items-center justify-center mt-12">
          <button
            type="submit"
            className={`flex justify-center items-center self-center p-4 px-5 border-2 border-zinc-700/60 text-zinc-400 rounded-xl transition-all ease-in-out duration-300 ${(email && password) ? 'cursor-pointer bg-purpleContrast hover:bg-purpleContrast/75' : 'cursor-not-allowed'}`}
            disabled={!(email && password)}
          >
            <FontAwesomeIcon className={`text-zinc-${(email && password) ? '300' : '500' }`} icon={faArrowRight} size="2x" />
          </button>
            <span className="text-sm font-europa mt-2 text-zinc-500 p-2">
              Don't have an account?
              <button
                className="ml-1 text-zinc-400 underline hover:text-purpleContrast transition-all ease-in-out duration-300"
                onClick={() => router.push('/register')}
              >
                Register
              </button>
            </span>
        </div>
      </form>
    </div>
  );
}