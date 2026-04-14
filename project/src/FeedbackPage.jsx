import React from 'react';
import { 
  ChevronLeft, 
  CheckCircle2, 
  AlertTriangle, 
  Trophy, 
  ArrowRight,
  PlayCircle
} from 'lucide-react';

const FeedbackPage = ({ workoutData, onBack, onSelectNewExercise }) => {
  // Przykładowe rekomendacje dopasowane do kategorii
  const recommendations = [
    { id: "002", name: "Wykroki AI", category: "Nogi", difficulty: "20m" },
    { id: "003", name: "Wspięcia na palce", category: "Nogi", difficulty: "10m" }
  ];

  return (
    /* Dodana klasa scrollbar-custom oraz pr-4 dla odstępu od krawędzi */
    <div className="w-full h-full text-blue-100 animate-in fade-in duration-500 overflow-y-auto scrollbar-custom pr-4">
      
      {/* NAGŁÓWEK SEKCJI */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="bg-sky-500/20 p-2 rounded-xl border border-sky-500/30">
            <Trophy className="text-sky-400 h-6 w-6" />
          </div>
          <h1 className="text-3xl font-black uppercase italic tracking-tighter">
            FormCheck <span className="text-sky-400">Feedback</span>
          </h1>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Ostatnia partia</p>
          <p className="text-sky-400 font-bold uppercase italic">{workoutData?.category || 'Nogi'}</p>
        </div>
      </div>

      {/* GŁÓWNY GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
        
        {/* WYNIK PUNKTOWY */}
        <div className="lg:col-span-4 bg-slate-900/40 rounded-[2rem] border border-slate-800 p-8 flex flex-col items-center justify-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-sky-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-8 z-10">AI Performance Score</p>
          
          <div className="relative h-48 w-48 flex items-center justify-center z-10">
            <svg className="h-full w-full transform -rotate-90">
              <circle
                cx="96" cy="96" r="88"
                stroke="currentColor" strokeWidth="12" fill="transparent"
                className="text-slate-800"
              />
              <circle
                cx="96" cy="96" r="88"
                stroke="currentColor" strokeWidth="12" fill="transparent"
                strokeDasharray={552}
                strokeDashoffset={552 - (552 * (workoutData?.score || 94)) / 100}
                className="text-sky-500 transition-all duration-1000 ease-out"
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-6xl font-black italic">{workoutData?.score || 94}</span>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">/100</span>
            </div>
          </div>
        </div>

        {/* WIDEO REPLAY */}
        <div className="lg:col-span-8 bg-slate-900/40 rounded-[2rem] border border-slate-800 p-4 relative group">
          <div className="flex items-center gap-2 mb-3 ml-2">
            <div className="h-2 w-2 rounded-full bg-sky-500 animate-pulse" />
            <span className="text-[9px] font-black uppercase tracking-widest text-sky-500">
              Session Replay: {workoutData?.name || 'Przysiady Klasyczne'}
            </span>
          </div>
          <div className="aspect-video bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
            {workoutData?.videoUrl ? (
              <video 
                src={workoutData.videoUrl} 
                className="w-full h-full object-cover"
                autoPlay loop muted
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-slate-800 uppercase font-black italic">
                <PlayCircle size={64} className="opacity-20" />
                <span>Oczekiwanie na nagranie</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ANALIZA I STATYSTYKI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        
        {/* CHECKLISTA */}
        <div className="bg-slate-900/40 rounded-[1.5rem] border border-slate-800 p-6">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-6">Analiza Formy</h3>
          <ul className="space-y-4">
            <li className="flex items-center gap-3 text-sm font-bold text-green-400">
              <CheckCircle2 size={18} /> Tempo pod kontrolą
            </li>
            <li className="flex items-center gap-3 text-sm font-bold text-green-400">
              <CheckCircle2 size={18} /> Plecy proste (Super!)
            </li>
            <li className="flex items-center gap-3 text-sm font-bold text-amber-400 leading-tight">
              <AlertTriangle size={18} className="shrink-0" /> Brak krytycznych uwag
            </li>
          </ul>
        </div>

        {/* KOMENTARZ AI */}
        <div className="bg-slate-900/40 rounded-[1.5rem] border border-slate-800 p-6">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-6">Wnioski Trenera AI</h3>
          <p className="text-sm text-slate-400 italic leading-relaxed border-l-2 border-sky-500 pl-4 py-1">
            "Wykonano {workoutData?.reps || 0} powtórzeń. System AI wykrył stabilną formę. Skup się na pełnym zakresie ruchu w kolejnych seriach."
          </p>
        </div>

        {/* REPS COUNT */}
        <div className="bg-slate-900/40 rounded-[1.5rem] border border-slate-800 p-6 flex flex-col items-center justify-center">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">Powtórzenia</h3>
          <p className="text-7xl font-black italic text-sky-400 tracking-tighter">{workoutData?.reps || 0}</p>
        </div>
      </div>

      {/* REKOMENDACJE */}
      <div className="pb-8">
        <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-sky-500 mb-6 text-center">
          Rekomendowane do Twojego treningu
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recommendations.map((ex) => (
            <button
              key={ex.id}
              onClick={() => onSelectNewExercise(ex)}
              className="group flex items-center justify-between p-5 bg-slate-900/60 rounded-2xl border border-slate-800 hover:border-sky-500/50 hover:bg-slate-800/80 transition-all text-left"
            >
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-sky-500/10 rounded-xl flex items-center justify-center group-hover:bg-sky-500 group-hover:text-slate-950 transition-colors">
                  <ActivityIcon size={20} />
                </div>
                <div>
                  <h4 className="font-black uppercase italic tracking-tight text-white">{ex.name}</h4>
                  <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">{ex.category} • {ex.difficulty}</p>
                </div>
              </div>
              <div className="h-8 w-8 rounded-full border border-slate-700 flex items-center justify-center group-hover:bg-sky-500 group-hover:border-sky-500 transition-all">
                <ArrowRight size={14} className="group-hover:text-slate-950" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// Pomocnicza ikona
const ActivityIcon = ({ size, className }) => (
  <svg 
    width={size} height={size} viewBox="0 0 24 24" fill="none" 
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" 
    className={className}
  >
    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
  </svg>
);

export default FeedbackPage;