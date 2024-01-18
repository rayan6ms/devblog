import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGithub, faLinkedin, faTwitter, faYoutube } from '@fortawesome/free-brands-svg-icons';

type SocialLink = {
  provider: string;
  icon: any;
  bgColor: string;
  hoverBgColor: string;
  url: string;
};

type SocialLinksProps = {
  links: Record<string, string>;
};

const SocialLink = ({ link }: { link: SocialLink }) => (
  <a
    href={link.url}
    className={`${link.bgColor} ${link.hoverBgColor} flex items-center p-2 rounded-md m-1 transition-all duration-300`}
    target="_blank"
    rel="noopener noreferrer"
  >
    <FontAwesomeIcon icon={link.icon} className="text-white" />
    <span className="ml-2 text-zinc-200">{link.provider}</span>
  </a>
);

export default function SocialLinks({ links }: SocialLinksProps) {
  const socialLinks = [
    { 
      provider: 'LinkedIn', 
      icon: faLinkedin, 
      bgColor: 'bg-blue-500/75', 
      hoverBgColor: 'hover:bg-blue-600/80 border border-blue-500/50',
      url: links.linkedin,
    },
    { 
      provider: 'GitHub', 
      icon: faGithub, 
      bgColor: 'bg-gray-800', 
      hoverBgColor: 'hover:bg-gray-900/70 border border-gray-600/50',
      url: links.github,
    },
    { 
      provider: 'YouTube', 
      icon: faYoutube, 
      bgColor: 'bg-red-600/80', 
      hoverBgColor: 'hover:bg-red-700/80 border border-red-500/70',
      url: links.youtube,
    },
    { 
      provider: 'Twitter', 
      icon: faTwitter, 
      bgColor: 'bg-blue-500', 
      hoverBgColor: 'hover:bg-blue-500/75 border border-blue-400/50',
      url: links.twitter,
    }
  ];

  return (
    <div className={`xs:flex grid grid-cols-2 md:items-center justify-center md:w-auto w-full bg-zinc-800/60 p-1 rounded-xl border border-zinc-500/30 shadow-md`}>
    {socialLinks.map((link, index) => (
      <SocialLink key={index} link={link} />
    ))}
  </div>
  );
};