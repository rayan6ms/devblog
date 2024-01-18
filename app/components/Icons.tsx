import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTwitter, faLinkedin, faYoutube, faGithub } from '@fortawesome/free-brands-svg-icons';

interface IconsProps extends React.HTMLAttributes<HTMLDivElement> {}

export default function Icons({ className }: IconsProps) {
  const socialMediaIcons = [
    { Icon: faTwitter, link: "https://twitter.com/rayan6ms" },
    { Icon: faLinkedin, link: "https://www.linkedin.com/in/rayan6ms/" },
    { Icon: faYoutube, link: "https://www.youtube.com/@migole" },
    { Icon: faGithub, link: "https://github.com/rayan6ms" },
  ];

  return (
    <div className={`space-x-4 ${className}`}>
      {socialMediaIcons.map(({ Icon, link}, index) => (
        <a
          key={ index }
          href={ link }
          target='_blank'
          className="flex border-2 border-wheat rounded-full p-3 group antialiased"
        >
          <FontAwesomeIcon
            className="text-wheat
              group-hover:text-purpleContrast
              transition-all ease-in-out"
            icon={ Icon }
            size="lg"
          />
        </a>
      ))}
    </div>
  )
}
