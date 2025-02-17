import Footer from '@/components/Footer';

export default function Page() {
  return (
    <>
      <div className="px-6 py-5">
        <h1 className="text-4xl md:text-5xl font-somerton text-center mb-8 pt-10 text-white">
          About <span className="text-purpleContrast">DEVBLOG</span>
        </h1>

        <div className="flex flex-col items-center space-y-12">
          <div
            className="w-full max-w-3xl lg:max-w-2xl xl:max-w-lg border-4 border-purpleContrast rounded-xl bg-darkBg p-8 lg:p-10 text-center shadow-lg transform transition-all duration-500 ease-in-out animate-slide-down opacity-0 lg:-ml-10"
            style={{
              animationDelay: '0.2s',
              animationFillMode: 'forwards',
            }}
          >
            <p className="text-lg font-lato text-white">
              DEVBLOG is a software development blog filled with tutorials, articles, and interactive features. This project serves as a personal{' '}
              <span className="text-purpleContrast">portfolio</span>, showcasing my skills in web development and my passion for design and functionality.
            </p>
          </div>

          <div
            className="w-full max-w-3xl lg:max-w-2xl xl:max-w-lg border-4 border-purpleContrast rounded-xl bg-darkBg p-8 lg:p-10 text-center shadow-lg transform transition-all duration-500 ease-in-out animate-slide-down opacity-0 lg:-mr-10"
            style={{
              animationDelay: '0.4s',
              animationFillMode: 'forwards',
            }}
          >
            <p className="text-lg font-lato text-white">
              Built using <span className="text-purpleContrast">Next.js</span>, <span className="text-purpleContrast">React.js</span>,{' '}
              <span className="text-purpleContrast">Mongoose</span>, <span className="text-purpleContrast">Tailwind CSS</span>,{' '}
              <span className="text-purpleContrast">p5.js</span>, <span className="text-purpleContrast">Zod</span>, and{' '}
              <span className="text-purpleContrast">FontAwesome</span>, this was my first time using some of these technologies. It was a challenging but rewarding experience, and I hope I've done a great job!
            </p>
          </div>

          <div
            className="w-full max-w-3xl lg:max-w-2xl xl:max-w-lg border-4 border-purpleContrast rounded-xl bg-darkBg p-8 lg:p-10 text-center shadow-lg transform transition-all duration-500 ease-in-out animate-slide-down opacity-0 lg:-ml-10"
            style={{
              animationDelay: '0.6s',
              animationFillMode: 'forwards',
            }}
          >
            <p className="text-lg font-lato text-white">
              The site features advanced functionality like tag-based search, post recommendations, user interaction tools, and even a{' '}
              <span className="text-purpleContrast">playground</span> with games and animations, showcasing my ability to create engaging web experiences.
            </p>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
