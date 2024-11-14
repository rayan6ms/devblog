export default function SkeletonSecondSection() {
  const sections = ["Trending Posts", "Recent Posts", "Recommended Posts"];

  return (
    <section className="w-full justify-center grid grid-flow-row md:grid-flow-col gap-8 mt-14">
      {sections.map((section, index) => (
        <div
          key={index}
          className={`flex gap-3 flex-col items-center gap-y-5 border-gray-700/60 md:border rounded-md p-4 lg:p-8 xxl:last:flex md:last:hidden animate-pulse`}
        > 
          <h2 className="text-2xl font-bold text-center bg-gray-300 h-8 w-40 rounded-md"></h2>
          <div className="w-[360px] h-[270px] bg-gray-300 rounded-lg"></div>
          <div className="flex flex-col gap-3 w-full">
            <div className="w-[360px] h-[100px] bg-gray-300 rounded-lg"></div>
            <div className="w-[360px] h-[100px] bg-gray-300 rounded-lg"></div>
          </div>
          <div className="w-full h-8 bg-gray-300 rounded-md"></div>
        </div>
      ))}
    </section>
  );
}