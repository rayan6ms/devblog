import Link from 'next/link';
import slugify from 'slugify';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTwitter, faLinkedin, faYoutube, faGithub } from '@fortawesome/free-brands-svg-icons';

export default function PostFooter() {
  const author = 'Johann Gottfried'
  const authorDescription = 'Olá, pessoal! Meu nome é Johann Gottfried e sou um entusiasta de tecnologia apaixonado por explorar as últimas inovações e descobertas do mundo digital.'
  const authorSocials = [
    {
      link: `https://twitter.com/${author}`,
      icon: faTwitter,
    },
    {
      link: `https://www.linkedin.com/in/${author}`,
      icon: faLinkedin,
    },
    {
      link: `https://www.youtube.com/${author}`,
      icon: faYoutube,
    },
    {
      link: `https://github.com/${author}`,
      icon: faGithub,
    },  
  ]

  return (
    <section className="flex border-t-2 border-slate-700 my-11 pt-6">
        <Link href={`/profile/${slugify(author, { lower: true, strict: true })}`}>
          <img
            className="min-w-[64px] min-h-[64px] max-w-[64px] max-h-[64px]
            sm:min-w-[86px] sm:min-h-[86px] sm:max-w-[86px] sm:max-h-[86px] object-cover rounded-full"
            src="https://i.etsystatic.com/19286482/r/il/96c0fd/2980731281/il_1080xN.2980731281_j8z4.jpg"
            alt={`Avatar de ${author}`}
            title={`Avatar de ${author}`}
          />
        </Link>
        <div className="mt-1 ml-5 sm:ml-7">
          <Link
            href={`/profile/${slugify(author, { lower: true, strict: true })}`}
            rel="author"
            className="text-gray-100 font-bold text-xl hover:text-purpleContrast transition-all ease-in-out"
          >
            { author }
          </Link>
          <p className="flex max-h-[72px] w-11/12 mt-1 mb-2 gap-1 text-zinc-400">
            <span className="line-clamp-3" title={authorDescription}>
              { authorDescription }
            </span>
          </p>
          <div className="flex flex-col sm:flex-row sm:items-center">
            <Link
              className="text-[13px] tracking-[.06em] leading-5 w-fit p-1.5 font-sans bg-gray-800 rounded-lg text-zinc-400 hover:bg-gray-700 hover:text-purpleContrast uppercase transition-all ease-in-out duration-300"
              href={`/profile/${slugify(author, { lower: true, strict: true })}`}
            >
              Posts do autor
            </Link>
            <div className="flex gap-4 mt-3 sm:mt-0 sm:ml-3">
              {authorSocials.map(({ link, icon }, index) => (
                <a
                  key={ index }
                  href={ link }
                  target='_blank'
                  className="rounded-full group antialiased"
                >
                  <FontAwesomeIcon
                    className="text-wheat
                      group-hover:text-purpleContrast
                      transition-all ease-in-out"
                    icon={ icon }
                    size="lg"
                  />
                </a>
              ))}
            </div>
          </div>
        </div>
    </section>
  )
}
