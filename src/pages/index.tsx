import Head from 'next/head';
import Image from 'next/image';

export default function Home() {
  return (
    <>
      <Head>
        <title>Headstart 2.0 | 10K Mini Marathon</title>
        <meta name="description" content="Join Headstart 2.0, the 10K mini marathon running at Durbar Hall on 11th Oct 2026." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="relative min-h-screen flex items-center overflow-hidden bg-[#0a0a0a] font-sans">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <Image 
            src="/background.jpg"
            alt="Headstart 2.0 Runner Background"
            fill
            className="object-cover object-center opacity-90"
            priority
          />
          {/* Gradient overlay to make text pop on the right side */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/20 to-black/90"></div>
        </div>

        {/* Content Aligned to Right */}
        <div className="relative z-20 w-full flex justify-end h-full py-12 md:py-16 pr-6 sm:pr-10 md:pr-14 lg:pr-20 xl:pr-24 pl-6">
          
          <div className="flex flex-col items-start max-w-xl text-left drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)]">
            
            {/* Top info (Date & Venue) */}
            <p className="text-amber-200/90 font-semibold tracking-[0.2em] text-[10px] md:text-xs mb-4 uppercase flex items-center gap-2 md:gap-3">
              <span>11 Oct 2026</span>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]"></span>
              <span>Durbar Hall</span>
            </p>

            {/* Main Title */}
            <div className="mb-3">
              <h1 className="text-5xl md:text-7xl lg:text-[7rem] font-black tracking-tighter uppercase text-white leading-none">
                HEADSTART
              </h1>
              <h1 className="text-5xl md:text-7xl lg:text-[7rem] font-black tracking-tighter uppercase leading-none text-transparent [-webkit-text-stroke:2px_#f59e0b] lg:[-webkit-text-stroke:2.5px_#f59e0b] mt-1">
                2.0
              </h1>
            </div>

            {/* Subtitle */}
            <h2 className="text-xl md:text-2xl font-extrabold text-amber-100 mb-6 tracking-widest uppercase">
              10K Mini Marathon
            </h2>

            {/* Tagline & Info */}
            <div className="space-y-4 mb-8">
              <p className="text-lg md:text-xl font-bold text-amber-50/95 tracking-wider">
                TOGETHER. INSPIRED. FORWARD.
              </p>
              
              <div className="flex flex-col gap-1.5">
                <p className="text-gray-200 text-base">
                  <span className="text-amber-400 font-bold">Rs 350</span> &mdash; Mecians
                </p>
                <p className="text-gray-200 text-base">
                  <span className="text-amber-400 font-bold">Rs 500</span> &mdash; Public <span className="text-gray-400 text-xs">(Early Bird Tickets)</span>
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center w-full">
              <a 
                href="https://bit.ly/headstart" 
                target="_blank" 
                rel="noopener noreferrer"
                className="group relative inline-flex items-center justify-center px-8 py-4 font-bold text-black transition-all duration-300 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 focus:outline-none overflow-hidden shadow-[0_0_25px_rgba(245,158,11,0.4)] hover:shadow-[0_0_35px_rgba(245,158,11,0.6)]"
              >
                <span className="relative z-10 flex items-center gap-3 uppercase tracking-[0.2em] text-xs md:text-sm font-extrabold">
                  Register Now
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 md:h-5 md:w-5 group-hover:translate-x-2 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </span>
                <div className="absolute inset-0 h-full w-0 bg-white/30 transition-all duration-300 ease-out group-hover:w-full z-0"></div>
              </a>
            </div>

          </div>
        </div>
      </main>
    </>
  );
}
