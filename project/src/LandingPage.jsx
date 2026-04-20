/* eslint-disable no-unused-vars */
import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ShieldCheck, Zap, ChevronRight, Cpu, Target, Play, Camera, BarChart3, MessageSquare, AlertTriangle, Home } from 'lucide-react';

// --- Sub-komponenty ---

const Nav = ({ onLaunch, onDemo, session }) => (
  <nav className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-5xl">
    <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl px-6 py-3 flex items-center justify-between shadow-2xl">
      <div className="flex items-center gap-2 cursor-pointer group" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
        <div className="w-8 h-8 bg-sky-500 rounded-lg rotate-45 flex items-center justify-center shadow-[0_0_15px_rgba(14,165,233,0.4)] group-hover:scale-110 transition-transform">
          <div className="w-4 h-4 bg-slate-950 rounded-full" />
        </div>
        <span className="font-black tracking-tighter text-xl italic text-white uppercase">FORMCHECK<span className="text-sky-400">AI</span></span>
      </div>
      <div className="hidden md:flex items-center gap-6 text-[10px] font-black tracking-[0.2em] uppercase text-slate-400">
        <a href="#demo" className="hover:text-sky-400 transition-colors">Zobacz Demo</a>
        <a href="#disclaimer" className="hover:text-sky-400 transition-colors">Ważne info</a>
        <button 
          onClick={onDemo} 
          className="text-white border border-slate-700 px-4 py-2 rounded-xl hover:bg-slate-800 transition-all uppercase font-black"
        >
          Otwórz Demo
        </button>
        <button 
          onClick={onLaunch} 
          className="bg-sky-500 text-slate-950 px-5 py-2 rounded-xl font-black hover:bg-sky-400 hover:shadow-[0_0_20px_rgba(14,165,233,0.4)] transition-all active:scale-95 flex items-center gap-2 whitespace-nowrap"
        >
          {session ? 'Przejdź do aplikacji' : 'Zaloguj się'}
        </button>
      </div>
    </div>
  </nav>
);

const DemoSection = () => (
  <section id="demo" className="py-32 bg-slate-900/30">
    <div className="container mx-auto px-6 max-w-5xl">
      <div className="flex flex-col md:flex-row gap-12 items-center">
        <div className="w-full md:w-1/2">
          <h2 className="text-4xl font-black uppercase italic text-white mb-6 leading-none">
            Twój salon to<br />
            <span className="text-sky-400">Twoja siłownia.</span>
          </h2>
          <p className="text-slate-400 font-bold text-sm uppercase tracking-widest italic mb-8 leading-relaxed">
            Nasz zaawansowany algorytm analizuje mechanikę ruchu Twojego ciała, abyś mógł bezpiecznie pracować nad formą w dowolnym miejscu. System wspiera treningi funkcjonalne i siłowe.
          </p>
          <div className="space-y-4">
            <div className="flex items-center gap-4 text-white font-black uppercase text-[10px]">
              <Home className="text-sky-500" size={20} /> Dowolne miejsce. Twój progres.
            </div>
            <div className="flex items-center gap-4 text-white font-black uppercase text-[10px]">
              <ShieldCheck className="text-sky-500" size={20} /> Precyzyjna analiza stawów.
            </div>
          </div>
        </div>
        <div className="w-full md:w-1/2">
          <div className="relative aspect-[9/16] max-w-[300px] mx-auto bg-slate-950 rounded-[2.5rem] border-8 border-slate-900 overflow-hidden shadow-2xl shadow-sky-500/10">
            <video 
              autoPlay 
              muted 
              loop 
              playsInline 
              className="absolute inset-0 w-full h-full object-cover grayscale-[50%] hover:grayscale-0 transition-all duration-700"
            >
              <source src="https://videos.pexels.com/video-files/4366663/4366663-uhd_1440_2160_25fps.mp4" type="video/mp4" />
              Twoja przeglądarka nie wspiera wideo.
            </video>
            
            <div className="absolute inset-0 pointer-events-none">
               <svg className="w-full h-full text-sky-400/80" viewBox="0 0 100 177">
                 <circle cx="50" cy="35" r="5" fill="currentColor" className="animate-pulse" />
                 <line x1="50" y1="40" x2="50" y2="80" stroke="currentColor" strokeWidth="1" />
                 <line x1="50" y1="80" x2="35" y2="120" stroke="currentColor" strokeWidth="1" />
                 <line x1="50" y1="80" x2="65" y2="120" stroke="currentColor" strokeWidth="1" />
                 <line x1="35" y1="120" x2="35" y2="150" stroke="currentColor" strokeWidth="1" />
                 <line x1="65" y1="120" x2="65" y2="150" stroke="currentColor" strokeWidth="1" />
               </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

const Disclaimer = () => (
  <section id="disclaimer" className="py-20 bg-red-500/5 border-y border-red-500/10">
    <div className="container mx-auto px-6 flex flex-col md:flex-row items-center gap-8 text-center md:text-left">
      <div className="bg-red-500/10 p-6 rounded-3xl shrink-0">
        <AlertTriangle className="text-red-500" size={40} />
      </div>
      <div>
        <h4 className="text-red-500 font-black uppercase italic tracking-widest mb-2">Pamiętaj o bezpieczeństwie!</h4>
        <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest leading-relaxed max-w-4xl italic">
          FormCheckAI jest narzędziem pomocniczym i edukacyjnym, a nie zamiennikiem medycznym. Nigdy nie forsuj bólu. Jeśli masz urazy kręgosłupa lub stawów, przed rozpoczęciem treningów skonsultuj się z fizjoterapeutą. Prawidłowa technika to fundament Twojego zdrowia.
        </p>
      </div>
    </div>
  </section>
);

const Hero = ({ onDemo, session, onLaunch }) => {
  const container = useRef(null);
  const { scrollYProgress } = useScroll({
    target: container,
    offset: ["start start", "end start"]
  });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);

  return (
    <section ref={container} className="relative min-h-screen flex flex-col justify-center items-center overflow-hidden pt-32 pb-20 bg-slate-950">
      <motion.div style={{ y }} className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,#0f172a_0%,#020617_100%)]" />
      </motion.div>

      <div className="container mx-auto px-6 relative z-10 text-center mb-16">
        <motion.h1 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-5xl md:text-8xl font-black tracking-tighter uppercase italic leading-[0.9] mb-8 text-white"
        >
          Twój osobisty<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-blue-600 inline-block py-2">trener techniki.</span>
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="max-w-2xl mx-auto text-slate-400 font-bold text-sm uppercase tracking-[0.1em] mb-12 italic leading-relaxed"
        >
          Koryguj technikę przysiadów w czasie rzeczywistym. Analiza ruchu z wykorzystaniem AI dla maksymalnej precyzji i bezpieczeństwa.
        </motion.p>

        <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
          <button 
            onClick={session ? onLaunch : onDemo}
            className="group bg-sky-500 text-slate-950 px-12 py-5 rounded-2xl font-black uppercase tracking-widest shadow-[0_0_30px_rgba(14,165,233,0.3)] hover:scale-105 transition-all active:scale-95 flex items-center gap-3"
          >
            {session ? 'Przejdź do aplikacji' : 'Uruchom Demo'} {session ? <ChevronRight size={18} /> : <Play size={18} fill="currentColor" />}
          </button>
          <a href="#demo" className="text-white font-black text-xs uppercase tracking-[0.2em] border-b-2 border-sky-500/30 pb-1 hover:border-sky-500 transition-all italic">
            Zobacz przykład
          </a>
        </div>
      </div>
    </section>
  );
};

const BentoGrid = () => {
  return (
    <section id="features" className="py-32 container mx-auto px-6 bg-slate-950">
      <div className="grid grid-cols-1 md:grid-cols-4 grid-rows-none md:grid-rows-2 gap-6 md:h-[800px]">
        
        <div className="md:col-span-2 md:row-span-2 bg-slate-900/50 border border-slate-800 p-10 flex flex-col justify-end relative overflow-hidden group min-h-[400px] rounded-[2.5rem] shadow-xl">
          <div className="absolute top-0 right-0 p-10 opacity-[0.03] group-hover:opacity-10 transition-opacity">
            <Target size={300} className="text-sky-500" />
          </div>
          <h3 className="text-4xl font-black uppercase italic mb-4 text-white leading-none text-sky-400">Analiza Wizyjna</h3>
          <p className="text-slate-500 font-black text-[10px] uppercase tracking-widest leading-relaxed">System wykorzystuje MediaPipe Pose do śledzenia 33 punktów kluczowych Twojego ciała bezpośrednio w Twoim telefonie lub laptopie.</p>
        </div>

        <div className="md:col-span-2 bg-sky-500 p-10 text-slate-950 flex flex-col justify-between min-h-[250px] rounded-[2.5rem] shadow-[0_0_40px_rgba(14,165,233,0.2)]">
          <div className="flex justify-between items-start">
            <MessageSquare size={40} className="opacity-80" />
          </div>
          <div>
            <h3 className="text-5xl font-black uppercase leading-[0.85] italic">Feedback<br />Głosowy.</h3>
            <p className="mt-4 font-black text-[9px] uppercase tracking-widest opacity-80">"Przyklej pięty", "Zejdź niżej" - System informuje Cię o błędach w trakcie trwania serii.</p>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-10 flex flex-col justify-between hover:border-sky-500/50 transition-all cursor-pointer group min-h-[250px] rounded-[2.5rem]">
          <BarChart3 className="group-hover:text-sky-400 transition-colors text-sky-500" size={32} />
          <h4 className="font-black uppercase italic text-white tracking-widest text-2xl">Lokalny<br />Raport</h4>
        </div>

        <div className="bg-white text-slate-950 p-10 flex flex-col justify-between min-h-[250px] rounded-[2.5rem]">
          <ShieldCheck size={32} className="text-sky-600" />
          <h4 className="font-black uppercase italic tracking-tighter text-2xl leading-none">Prywatność<br />100%</h4>
          <p className="text-[8px] font-black uppercase leading-tight opacity-70">Obraz z kamery przetwarzany jest tylko u Ciebie. Nigdy nie nagrywamy Twojego wizerunku na serwery.</p>
        </div>

      </div>
    </section>
  );
};

const Footer = () => (
  <footer className="bg-slate-950 text-slate-500 py-24 border-t border-slate-900">
    <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between gap-16">
      <div className="space-y-6 text-white">
        <div className="font-black italic text-3xl tracking-tighter uppercase underline decoration-sky-500 decoration-4 underline-offset-8">FORMCHECKAI</div>
        <p className="font-black text-[10px] uppercase tracking-[0.4em] text-slate-600">Twój osobisty asystent treningu siłowego.</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-16 font-black text-[10px] uppercase tracking-[0.3em]">
        <div className="space-y-6">
          <div className="text-white font-black italic uppercase">Jak to działa</div>
          <div className="hover:text-sky-400 cursor-pointer transition-colors uppercase">Bezpieczeństwo</div>
        </div>
        <div className="space-y-6">
          <div className="text-white font-black italic uppercase">Zacznij</div>
          <div className="hover:text-sky-400 cursor-pointer transition-colors uppercase">Uruchom Demo</div>
        </div>
        <div className="space-y-6">
          <div className="text-white font-black italic uppercase">System</div>
          <div className="hover:text-sky-400 cursor-pointer transition-colors uppercase">Prywatność</div>
        </div>
      </div>
    </div>
  </footer>
);

// --- Główny Komponent ---

const LandingPage = ({ onLaunch, onDemo, session }) => {
  return (
    <div className="bg-slate-950 text-white selection:bg-sky-500 selection:text-slate-950 font-sans antialiased scroll-smooth">
      <Nav onLaunch={onLaunch} onDemo={onDemo} session={session} />
      <Hero onDemo={onDemo} session={session} onLaunch={onLaunch} />
      
      <div className="bg-sky-500 py-6 overflow-hidden border-y border-slate-950 shadow-[0_0_50px_rgba(14,165,233,0.2)]">
        <motion.div 
          animate={{ x: [0, -1000] }}
          transition={{ repeat: Infinity, duration: 30, ease: "linear" }}
          className="flex whitespace-nowrap gap-24 text-slate-950 font-black uppercase italic tracking-tighter text-3xl"
        >
          {[...Array(10)].map((_, i) => (
            <span key={i}>Analiza w czasie rzeczywistym • Wsparcie treningu siłowego • Pełna prywatność • Liczenie powtórzeń • Korekta techniki</span>
          ))}
        </motion.div>
      </div>

      <DemoSection />
      <Disclaimer />
      <BentoGrid />

      <section className="py-72 relative flex items-center justify-center overflow-hidden bg-slate-950">
        <div className="absolute inset-0 bg-sky-500/10 backdrop-blur-3xl flex items-center justify-center">
          <motion.div 
            animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 8, repeat: Infinity }}
            className="w-[800px] h-[800px] bg-sky-500/20 rounded-full blur-[120px]" 
          />
        </div>
        <div className="relative z-10 text-center px-6">
          <h2 className="text-6xl md:text-9xl font-black uppercase italic tracking-tighter leading-[0.8] mb-16 text-white">
            Sprawdź formę<br />bez logowania.
          </h2>
          <button 
            onClick={onDemo}
            className="group bg-sky-500 text-slate-950 text-2xl px-16 py-8 rounded-3xl font-black uppercase italic tracking-widest hover:scale-105 hover:shadow-[0_0_50px_rgba(14,165,233,0.4)] transition-all flex items-center gap-6 mx-auto active:scale-95"
          >
            Uruchom Analizę AI <ChevronRight size={32} className="group-hover:translate-x-2 transition-transform" />
          </button>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default LandingPage;
