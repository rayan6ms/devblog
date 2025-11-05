export default function SkeletonRecentPage() {
  return (
    <>
      <div className="w-full flex flex-col items-center my-6">
        <div className="xxl:w-[90%] w-full">
          <div className="grid grid-cols-1 gap-5 px-2">
            <h2 className="ml-2 col-start-1 row-start-1 text-xl font-somerton uppercase bg-gray-300 h-8 w-40 rounded-md animate-pulse"></h2>
            <div className="col-start-1 row-start-2 w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {Array.from({ length: 24 }).map((_, index) => (
                <div key={index} className="bg-greyBg border border-t-0 border-zinc-700/30 rounded-lg overflow-hidden shadow-lg group animate-pulse">
                  <div className="w-full h-[200px] bg-gray-300"></div>
                  <div className="flex flex-col p-4 h-52">
                    <div className="bg-gray-300 h-6 w-3/4 rounded-md mb-4"></div>
                    <div className="bg-gray-300 h-4 w-full rounded-md mb-2"></div>
                    <div className="bg-gray-300 h-4 w-5/6 rounded-md mb-2"></div>
                    <div className="flex items-center justify-between my-2">
                      <div className="bg-gray-300 h-4 w-20 rounded-md"></div>
                      <div className="bg-gray-300 h-4 w-10 rounded-md"></div>
                    </div>
                    <div className="flex items-center justify-between text-zinc-400 text-sm">
                      <div className="bg-gray-300 h-4 w-16 rounded-md"></div>
                      <div className="bg-gray-300 h-4 w-12 rounded-md"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
