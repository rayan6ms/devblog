'use client';

import React from 'react';
import Footer from '@/components/Footer';

export default function SkeletonTrending() {
  const skeletonPanels = Array.from({ length: 7 }); // Para os painéis do accordion
  const skeletonPosts = Array.from({ length: 24 }); // Para as postagens

  return (
    <>
      <div
        className={`gap-4 hidden md:grid lg:w-3/4 sm:w-2/3 px-2 xs:px-8 sm:px-0 max-w-3xl mx-auto py-4 h-[450px] transition-all duration-700`}
        style={{
          gridTemplateColumns: 'repeat(7, 1fr)',
        }}
      >
        {skeletonPanels.map((_, index) => (
          <div
            key={index}
            className="relative h-full rounded-full bg-gray-300 animate-pulse"
            style={{
              gridColumn: 'span 1',
              gridRow: 'auto',
            }}
          ></div>
        ))}
      </div>

      {/* horizontal */}
      <div className="md:grid-cols-1 grid-cols-none grid gap-4 lg:w-3/4 sm:w-2/3 px-2 xs:px-8 sm:px-0 max-w-5xl mx-auto py-4 h-[500px] md:hidden">
        {skeletonPanels.map((_, index) => (
          <div
            key={index}
            className="relative h-full rounded-full bg-gray-300 animate-pulse"
            style={{
              gridColumn: '1 / -1',
              gridRow: 'span 1',
            }}
          ></div>
        ))}
      </div>


      <div className="w-full flex flex-col items-center my-6">
        <div className="w-full max-w-[1200px] px-2">
          <h2 className="bg-gray-300 h-8 w-40 rounded-lg mb-6 animate-pulse"></h2>
          <div className="flex flex-wrap justify-center gap-3 mt-4">
            {skeletonPosts.slice(0, 24).map((_, index) => (
              <div key={index} className="md:w-[380px] w-[97%] h-[140px] bg-gray-300 rounded-2xl animate-pulse"></div>
            ))}
          </div>

          <h2 className="bg-gray-300 h-8 w-40 rounded-lg mt-10 mb-6 animate-pulse"></h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1 gap-x-4 justify-center mt-4 w-full px-2">
            {skeletonPosts.map((_, index) => (
              <div key={index} className="w-full h-[140px] bg-gray-300 rounded-2xl animate-pulse my-2"></div>
            ))}
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}

