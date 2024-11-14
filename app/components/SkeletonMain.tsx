export default function SkeletonMain() {
  return (
    <>
      <main className="mt-10 mx-auto flex-col flex-wrap items-center md:items-start md:flex-row flex md:justify-center gap-6">
        <div className="flex flex-col md:flex-row xxl:flex-col gap-6">
          <div className="w-[360px] sm:w-[460px] md:w-[360px] lg:w-[420px] h-[270px] bg-gray-300 rounded-lg animate-pulse"></div>
          <div className="w-[360px] sm:w-[460px] md:w-[360px] lg:w-[420px] h-[270px] bg-gray-300 rounded-lg animate-pulse"></div>
        </div>
        <div className="flex flex-col gap-8 md:flex-row">
          <div className="w-[600px] h-[550px] bg-gray-300 rounded-lg animate-pulse"></div>
          <div className="flex flex-col divide-y divide-gray-500">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="w-[360px] h-[100px] bg-gray-300 rounded-lg animate-pulse my-2"></div>
            ))}
          </div>
        </div>
      </main>
      <div className="hidden xxl:flex w-full p-2/4 mt-7 justify-center items-center">
        <div className="bg-zinc-500/60 w-44 h-0.5 mr-2 rounded-lg animate-pulse"></div>
        <div className="w-6 h-6 mx-4 bg-zinc-300 rounded-full animate-pulse"></div>
        <div className="bg-zinc-500/60 w-44 h-0.5 ml-2 rounded-lg animate-pulse"></div>
      </div>
    </>
  );
}