import React from 'react';
import { ChevronRight } from 'lucide-react';
import { ACTIVITIES } from '../../../constants';

const GymActivitiesList = ({ onSelectActivity, filter, setFilter }) => {
  const categories = ['Wszystkie', 'Nogi', 'Klatka', 'Plecy', 'Core', 'Barki', 'Biceps', 'Triceps', 'Kardio', 'Przedramie'];
  
  const filteredActivities = filter === 'Wszystkie' 
    ? ACTIVITIES 
    : ACTIVITIES.filter(a => a.category === filter);

  return (
    <div className="h-full flex flex-col p-6 overflow-hidden">
      {/* Category Filter */}
      <div className="flex gap-2 overflow-x-auto pb-6 scrollbar-hide shrink-0">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border ${filter === cat ? 'bg-sky-500 border-sky-400 text-slate-950 shadow-[0_0_20px_rgba(14,165,233,0.4)]' : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-sky-400 hover:border-sky-500/50'}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Activities Grid */}
      <div className="flex-grow overflow-y-auto pr-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 content-start pb-10">
        {filteredActivities.map((activity) => (
          <div
            key={activity.id}
            onClick={() => onSelectActivity(activity)}
            className="group relative flex flex-col justify-between p-6 rounded-[2rem] bg-slate-900/30 border border-slate-800/50 hover:border-sky-500/50 hover:bg-slate-900/60 transition-all cursor-pointer overflow-hidden h-fit min-h-[160px]"
          >
            {/* Background Glow */}
            <div className="absolute -top-12 -right-12 w-24 h-24 bg-sky-500/10 blur-3xl rounded-full group-hover:bg-sky-500/20 transition-all" />
            
            <div className="flex items-start justify-between mb-4">
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 group-hover:border-sky-500/30 group-hover:bg-sky-500/5 transition-all shadow-xl">
                {activity.icon}
              </div>
              <div className="w-8 h-8 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center group-hover:border-sky-500/30 group-hover:bg-sky-500/20 transition-all">
                <ChevronRight size={14} className="text-slate-600 group-hover:text-sky-400 group-hover:translate-x-0.5 transition-all" />
              </div>
            </div>

            <div>
              <h4 className="text-xs font-black uppercase italic tracking-tight text-white group-hover:text-sky-400 transition-colors leading-tight mb-2">
                {activity.name}
              </h4>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black text-sky-500/70 uppercase tracking-widest bg-sky-500/5 px-2 py-1 rounded-lg border border-sky-500/10">
                  {activity.category}
                </span>
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter italic">
                  ⏱ {activity.time}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GymActivitiesList;
