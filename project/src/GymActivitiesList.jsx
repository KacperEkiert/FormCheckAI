import React, { useState } from 'react';
import { 
  Dumbbell, 
  Timer, 
  Flame, 
  Trophy, 
  ChevronRight, 
  Search,
  Zap
} from 'lucide-react';

const ACTIVITIES = [
  { id: 1, name: 'Przysiady Klasyczne', category: 'Nogi', intensity: 'Wysoka', time: '15 min', icon: <Zap className="text-amber-400" /> },
  { id: 2, name: 'Pompki Diamentowe', category: 'Klatka', intensity: 'Średnia', time: '10 min', icon: <Dumbbell className="text-sky-400" /> },
  { id: 3, name: 'Plank (Deska)', category: 'Core', intensity: 'Średnia', time: '5 min', icon: <Timer className="text-emerald-400" /> },
  { id: 4, name: 'Wykroki AI', category: 'Nogi', intensity: 'Wysoka', time: '20 min', icon: <Zap className="text-amber-400" /> },
  { id: 5, name: 'Burpees', category: 'Kardio', intensity: 'Ekstremalna', time: '12 min', icon: <Flame className="text-red-500" /> },
];

const GymActivitiesList = ({ onSelectActivity }) => {
  const [filter, setFilter] = useState('Wszystkie');

  const filteredActivities = filter === 'Wszystkie' 
    ? ACTIVITIES 
    : ACTIVITIES.filter(a => a.category === filter);

  const categories = ['Wszystkie', 'Nogi', 'Klatka', 'Core', 'Kardio'];

  return (
    <div className="w-full h-full flex flex-col gap-6 animate-in fade-in slide-in-from-right-8 duration-700">
      
      {/* Search & Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-xl">
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto scrollbar-hide">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                filter === cat 
                ? 'bg-sky-500 text-slate-950 border-sky-400' 
                : 'bg-slate-950 text-slate-500 border border-slate-800 hover:border-sky-900'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 h-4 w-4" />
          <input 
            type="text" 
            placeholder="Szukaj ćwiczenia..." 
            className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-10 pr-4 text-xs focus:outline-none focus:border-sky-500 transition-colors text-blue-100"
          />
        </div>
      </div>

      {/* Grid List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {filteredActivities.map((activity) => (
          <div 
            key={activity.id}
            onClick={() => onSelectActivity(activity)}
            className="group relative bg-slate-900 border border-slate-800 p-4 rounded-2xl hover:border-sky-500/50 transition-all cursor-pointer overflow-hidden flex flex-col"
          >
            {/* 1. IKONKA I ID - mniejszy padding px-2 */}
            <div className="flex justify-between items-start mb-4 px-2">
              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 group-hover:scale-110 transition-transform">
                {React.cloneElement(activity.icon, { size: 20 })}
              </div>
              <span className="text-[8px] font-mono text-slate-600 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                ID: 00{activity.id}
              </span>
            </div>

            {/* 2. TYTUŁ I STATYSTYKI - px-2 */}
            <div className="mb-3 px-2">
              <h3 className="text-xl font-black italic uppercase text-blue-50 leading-tight tracking-tight">
                {activity.name}
              </h3>
              
              <div className="flex gap-3 mt-2">
                <div className="flex items-center gap-1">
                  <Trophy size={10} className="text-sky-500" />
                  <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                    {activity.intensity}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Timer size={10} className="text-sky-500" />
                  <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                    {activity.time}
                  </span>
                </div>
              </div>
            </div>

            {/* 3. DOLNA SEKCJA - px-2 i mniejszy pt */}
            <div className="mt-auto flex items-center justify-between border-t border-slate-800/50 pt-3 px-2">
              <span className="text-[10px] font-black text-sky-400 uppercase tracking-[0.2em]">
                {activity.category}
              </span>
              <ChevronRight size={14} className="text-slate-700 group-hover:text-sky-400 transition-all" />
            </div>
          </div>
        ))}
      </div>

      {/* Footer Info */}
      <div className="bg-sky-500/5 border border-sky-500/10 p-4 rounded-xl">
        <p className="text-[10px] text-sky-400/60 font-mono text-center leading-relaxed">
          WYBIERZ AKTYWNOŚĆ, ABY SKALIBROWAĆ SENSOR AI I ROZPOCZĄĆ MONITOROWANIE FORMULY RUCHU.
        </p>
      </div>
    </div>
  );
};

export default GymActivitiesList;