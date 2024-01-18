import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';

type SocialAuthButtonProps = {
  provider: string;
  icon: IconDefinition;
  bgColor: string;
  hoverBgColor: string;
  handleAuth: (provider: string) => void;
};

export default function SocialAuthButton({ provider, icon, bgColor, hoverBgColor, handleAuth }: SocialAuthButtonProps) {
  return (
    <button 
      onClick={() => handleAuth(provider)}
      className={`flex items-center justify-center w-full p-2 rounded-md shadow-md mb-2 ${bgColor} ${hoverBgColor} text-white transition-colors duration-300`}
    >
      <FontAwesomeIcon icon={icon} />
    </button>
  );
};