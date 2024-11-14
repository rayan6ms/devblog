export default function SkeletonFirstSection() {
  return (
    <section className="bg-greyBg">
      <div className="flex md:justify-center items-center flex-wrap gap-6 md:gap-8 lg:gap-x-28 xxl:gap-x-8 mt-24 w-[360px] sm:w-[460px] md:w-full mx-auto h-fit md:h-[500px] xxl:h-[260px] py-14 md:px-8">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="group flex gap-6 w-full h-[130px] sm:h-[180px] md:w-[320px] md:h-[120px] lg:w-[380px] lg:h-[150px] xxl:w-[300px] xxl:h-[100px] box-content animate-pulse"
          >
            <div className="flex relative min-w-[130px] max-w-[130px] h-[130px] sm:min-w-[180px] sm:max-w-[180px] sm:h-[180px] md:min-w-[150px] md:max-w-[150px] md:h-[150px] xxl:min-w-[105px] xxl:max-w-[105px] xxl:h-[105px] bg-gray-300 rounded-lg"></div>
            <div className="flex flex-col justify-center w-fit h-full">
              <div className="flex justify-between mb-2">
                <div className="bg-gray-300 h-5 w-20 rounded animate-pulse"></div>
              </div>
              <div className="bg-gray-300 h-6 w-32 md:w-48 rounded animate-pulse"></div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}