import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGithubSquare, faTwitterSquare, faLinkedin, faYoutubeSquare } from '@fortawesome/free-brands-svg-icons';

const socialLinks = [
  {
    href: "https://github.com/rayan6ms",
    icon: faGithubSquare,
  },
  {
    href: "https://twitter.com/rayan6ms",
    icon: faTwitterSquare,
  },
  {
    href: "https://linkedin.com/in/rayan6ms",
    icon: faLinkedin,
  },
  {
    href: "https://youtube.com/@migole",
    icon: faYoutubeSquare,
  }
];

export default function Footer() {
  return (
    <footer className="bg-greyBg border-t border-zinc-700/50 py-8 mt-10">
      <div className="container mx-auto flex flex-col md:flex-row justify-between items-end">
        <div className="text-center md:text-left mb-6 md:mb-0">
          <h1 className="text-5xl font-somerton text-purpleContrast ">DEVBLOG</h1>
          <p className="font-lato text-zinc-200 text-lg mt-2">
            Navigating the Digital Wilderness with Code.
          </p>
        </div>
        <div className="flex space-x-4 pr-4 font-europa underline text-xl self-center [text-shadow:_0_2px_4px_var(--tw-shadow-color)] shadow-zinc-600">
          <Link href="/" className="text-zinc-200 hover:text-purpleContrast transition-colors duration-300">
            Home
          </Link>
          <Link href="/about" className="text-zinc-200 hover:text-purpleContrast transition-colors duration-300">
            About
          </Link>
          <Link href="/contact" className="text-zinc-200 hover:text-purpleContrast transition-colors duration-300">
            Contact
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 mt-6 md:mt-0 [text-shadow:_0_2px_4px_var(--tw-shadow-color)] shadow-zinc-600">
          {socialLinks.map(link => {
            const social = link.href.split('/')[2].split('.')[0].toLowerCase();
            const username = link.href.split('/').pop()?.replace('@', '');
            const label = `${social.charAt(0).toUpperCase() + social.slice(1)} de ${username}`;
            const text = `${social}/${username}`;
            return (
              <Link
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="text-zinc-200 hover:text-purpleContrast transition-colors duration-300 flex items-center"
              >
                <FontAwesomeIcon icon={link.icon} className="w-6 h-6 mr-2" />
                {text}
              </Link>
            );
          })}
        </div>
      </div>
      <div className="text-center text-zinc-300 mt-6 font-lato [text-shadow:_0_2px_4px_var(--tw-shadow-color)] shadow-zinc-600">
        <p>&copy; {new Date().getFullYear()} DEVBLOG. All rights reserved.</p>
      </div>
    </footer>
  )
}
