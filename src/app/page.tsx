import Image from 'next/image';
import { Bebas_Neue, Oswald } from 'next/font/google';

const bebasNeue = Bebas_Neue({
  weight: '400',
  subsets: ['latin'],
});

const oswald = Oswald({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['latin'],
});

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-black">
      <nav className="relative z-50 w-full bg-black/80 backdrop-blur-md border-b border-amber-500/40 px-6 sm:px-10 md:px-14 lg:px-20 py-4 flex items-center justify-between shadow-[0_1px_20px_rgba(245,158,11,0.15)]">
        <Image
          src="/logo.png"
          alt="Excel Logo"
          width={180}
          height={64}
          className="object-contain h-10 sm:h-12 md:h-16 w-auto"
          priority
        />
        <div className={`flex items-baseline gap-1.5 sm:gap-2 ${bebasNeue.className}`}>
          <span className="text-xl sm:text-2xl md:text-3xl lg:text-4xl tracking-wide uppercase text-white leading-none">
            HEADSTART
          </span>
          <span className="text-xl sm:text-2xl md:text-3xl lg:text-4xl tracking-wide uppercase leading-none text-transparent [-webkit-text-stroke:1px_#f59e0b] md:[-webkit-text-stroke:1.5px_#f59e0b]">
            2.0
          </span>
        </div>
      </nav>

      <main className="relative flex-1 flex flex-col overflow-y-auto overflow-x-hidden bg-[#0a0a0a] font-sans">
        {/* Background Image */}
        <div className="absolute inset-0 z-0 min-h-full">
          <Image
            src="/background.jpg"
            alt="Headstart 2.0 Runner Background"
            fill
            className="object-cover object-center opacity-90"
            priority
          />
          {/* Gradient overlay for readability */}
          <div className="absolute inset-0 bg-black/60 md:bg-gradient-to-r md:from-transparent md:via-black/20 md:to-black/90"></div>
        </div>

        {/* Content Aligned to Right on Desktop, Centered on Mobile */}
        <div className="relative z-20 w-full flex flex-col justify-center flex-1 py-10 md:py-16 px-6 sm:px-10 md:px-14 lg:px-20 xl:px-24 min-h-min">

          <div className="flex flex-col items-start w-fit text-left drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] mx-auto md:ml-auto md:mr-0">

            {/* Main Title */}
            <div className={`mb-3 flex items-baseline gap-2 sm:gap-4 whitespace-nowrap ${bebasNeue.className}`}>
              <h1 className="text-5xl sm:text-6xl md:text-8xl lg:text-[8rem] tracking-wide uppercase text-white leading-none">
                HEADSTART
              </h1>
              <h1 className="text-5xl sm:text-6xl md:text-8xl lg:text-[8rem] tracking-wide uppercase leading-none text-transparent [-webkit-text-stroke:1.5px_#f59e0b] md:[-webkit-text-stroke:2px_#f59e0b] lg:[-webkit-text-stroke:2.5px_#f59e0b]">
                2.0
              </h1>
            </div>

            {/* Subtitle */}
            <h2 className={`text-xl md:text-2xl font-semibold text-amber-100 mb-8 tracking-[0.3em] uppercase ${oswald.className}`}>
              10K Mini Marathon
            </h2>

            {/* Event Details */}
            <div className={`flex flex-col gap-3 mb-10 border-l-2 border-amber-500 pl-4 ${oswald.className}`}>
              <div className="flex items-center gap-5">
                <p className="text-amber-400 font-semibold uppercase tracking-[0.25em] text-xs w-14">Date</p>
                <p className="text-white font-light text-sm md:text-base tracking-widest">11 Oct 2026</p>
              </div>
              <div className="flex items-center gap-5">
                <p className="text-amber-400 font-semibold uppercase tracking-[0.25em] text-xs w-14">Time</p>
                <p className="text-white font-light text-sm md:text-base tracking-widest">06:00 AM-11:00 AM</p>
              </div>
              <div className="flex items-center gap-5">
                <p className="text-amber-400 font-semibold uppercase tracking-[0.25em] text-xs w-14">Venue</p>
                <p className="text-white font-light text-sm md:text-base tracking-widest">Durbar Hall</p>
              </div>
            </div>

            {/* Register Button */}
            <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center w-full">
              <a
                href="https://bit.ly/headstart"
                target="_blank"
                rel="noopener noreferrer"
                className="group relative inline-flex items-center justify-center px-8 py-4 font-bold text-black transition-all duration-300 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 focus:outline-none overflow-hidden shadow-[0_0_25px_rgba(245,158,11,0.4)] hover:shadow-[0_0_35px_rgba(245,158,11,0.6)]"
              >
                <span className={`relative z-10 flex items-center gap-3 uppercase tracking-[0.3em] text-sm md:text-base font-semibold ${oswald.className}`}>
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
    </div>
  );
}
