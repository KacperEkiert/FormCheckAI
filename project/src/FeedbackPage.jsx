import React from 'react';
import { 
  ChevronLeft, ChevronRight, Play, Award, Target, 
  Clock, Activity, X, RotateCcw, BarChart3 
} from 'lucide-react';

export default function FeedbackPage({ 
  workouts, 
  currentIndex, 
  onNavigate, 
  onBack, 
  onSelectNewExercise, 
  isGuest 
}) {
  const current = workouts[currentIndex];
  
  if (!current) return null;

  return (
    <div className="h-full flex flex-col gap-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
        >
          <ChevronLeft size={20} /> Wróć do listy
        </button>
        <div className="flex items-center gap-4 bg-slate-900 border border-slate-800 px-4 py-2 rounded-full">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
            Sesja {currentIndex + 1} z {workouts.length}
          </span>
          <div className="flex gap-1">
            <button 
              disabled={currentIndex === 0}
              onClick={() => onNavigate(currentIndex - 1)}
              className="p-1 hover:bg-slate-800 rounded-full disabled:opacity-30"
            >
              <ChevronLeft size={16} />
            </button>
            <button 
              disabled={currentIndex === workouts.length - 1}
              onClick={() => onNavigate(currentIndex + 1)}
              className="p-1 hover:bg-slate-800 rounded-full disabled:opacity-30"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-grow grid grid-cols-1 xl:grid-cols-3 gap-6 overflow-y-auto pb-8">
        {/* Left: Video Player */}
        <div className="xl:col-span-2 flex flex-col gap-4">
          <div className="aspect-video bg-black rounded-[2rem] border border-slate-800 overflow-hidden shadow-2xl relative">
            <video 
              src={current.videoUrl} 
              controls 
              className="w-full h-full object-contain"
            />
          </div>
          <div className="bg-slate-900/50 p-6 rounded-3xl border border-slate-800 flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-black uppercase italic text-white">{current.name}</h2>
              <p className="text-slate-400 text-sm font-bold uppercase tracking-wider">{current.date} • {current.reps} powtórzeń</p>
            </div>
            <button 
              onClick={() => onSelectNewExercise({ name: current.name, category: current.category })}
              className="bg-sky-500 text-slate-950 px-6 py-3 rounded-xl font-black uppercase text-sm hover:bg-sky-400 transition-colors shadow-lg shadow-sky-500/20"
            >
              Powtórz ćwiczenie
            </button>
          </div>
        </div>

        {/* Right: Metrics */}
        <div className="flex flex-col gap-4">
          <div className="bg-slate-900 p-6 rounded-[2rem] border border-slate-800 shadow-xl">
            <div className="flex items-center gap-3 mb-6">
              <Award className="text-amber-500" size={24} />
              <h3 className="text-lg font-black uppercase tracking-widest">Wynik Sesji</h3>
            </div>
            
            <div className="text-center py-6">
              <div className="text-7xl font-black italic text-white mb-2">{current.score}<span className="text-2xl text-slate-600">/100</span></div>
              <div className={`text-sm font-bold uppercase tracking-[0.2em] ${current.score > 80 ? 'text-green-500' : 'text-amber-500'}`}>
                {current.score > 80 ? 'Mistrzowska technika' : 'Dobra praca'}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="bg-black/40 p-4 rounded-2xl border border-slate-800">
                <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Śr. Głębokość</p>
                <p className="text-xl font-black">{current.debug.knee.avg}°</p>
              </div>
              <div className="bg-black/40 p-4 rounded-2xl border border-slate-800">
                <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Śr. Pochylenie</p>
                <p className="text-xl font-black">{current.debug.back.avg}°</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 p-6 rounded-[2rem] border border-slate-800 flex-grow">
            <div className="flex items-center gap-3 mb-6">
              <Activity className="text-sky-500" size={24} />
              <h3 className="text-lg font-black uppercase tracking-widest">Analiza Błędów</h3>
            </div>

            <div className="space-y-4">
              <StatRow label="Pięty w górze" value={`${current.debug.faults.heelLiftPct}% czasu`} active={current.debug.faults.heelLiftPct > 10} />
              <StatRow label="Zgarbienie pleców" value={`${current.debug.faults.poorBackPct}% czasu`} active={current.debug.faults.poorBackPct > 10} />
              <StatRow label="Zbyt płytkie" value={`${current.debug.faults.shallowReps} powtórzeń`} active={current.debug.faults.shallowReps > 0} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Pomocniczy komponent do listy błędów
function StatRow({ label, value, active }) {
  return (
    <div className={`flex justify-between items-center p-3 rounded-xl border ${active ? 'bg-red-950/30 border-red-900/50' : 'bg-black/20 border-slate-800'}`}>
      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</span>
      <span className={`text-xs font-black ${active ? 'text-red-400' : 'text-emerald-400'}`}>{value}</span>
    </div>
  );
}