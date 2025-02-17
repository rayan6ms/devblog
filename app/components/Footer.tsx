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
    <footer className="bg-greyBg border-t border-zinc-700/50 xs:p-6 mt-10 py-6">
      <div className="flex justify-center">
        <div className="flex justify-between items-end w-full xl:w-[90%]">
          <div className="flex flex-1 flex-col md:flex-row justify-between items-center">
            <div className="flex-1 md:text-left mb-6 md:mb-0">
              <div className="lg:ml-auto lg:w-3/4">
                <h1 className="text-5xl text-center lg:text-start font-somerton text-purpleContrast ">DEVBLOG</h1>
                <p className="font-lato text-zinc-200 text-center lg:text-start text-lg lg:w-64 xl:w-full mt-2">
                  Navigating the Digital Wilderness with Code.
                </p>
              </div>
            </div>
            <div className="flex flex-1 justify-center gap-4 font-europa underline text-lg shadow-zinc-600 text-zinc-200">
              <Link href="/" className="hover:text-purpleContrast text-center transition-colors duration-300">
                Home
              </Link>
              <Link href="/about" className="hover:text-purpleContrast transition-colors duration-300">
                About
              </Link>
              <Link href="/contact" className="hover:text-purpleContrast transition-colors duration-300">
                Contact
              </Link>
            </div>
            <div className="flex-1 place-content-center lg:place-content-start grid grid-cols-2 md:grid-rows-2 md:grid-cols-none lg:grid-cols-2 3xl:self-end gap-2.5 lg:gap-4 mt-6 md:mt-0 [text-shadow:_0_1px_1px_var(--tw-shadow-color)] shadow-zinc-600">
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
                    className="text-zinc-200 hover:text-purpleContrast transition-colors duration-300 flex items-center w-fit"
                  >
                    <FontAwesomeIcon icon={link.icon} className="w-6 h-6 mr-2" />
                    {text}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      <div className="text-center text-zinc-300 mt-6 font-lato [text-shadow:_0_2px_1px_var(--tw-shadow-color)] shadow-zinc-600">
        <p>&copy; {new Date().getFullYear()} DEVBLOG. All rights reserved.</p>
      </div>
    </footer>
  )
}
