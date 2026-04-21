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
      <div className="flex gap-2 overflow-x-auto pb-6 scrollbar-hide shrink-0">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border ${filter === cat ? 'bg-sky-500 border-sky-400 text-slate-950 shadow-[0_0_15px_rgba(14,165,233,0.3)]' : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-sky-400 hover:border-sky-500/50'}`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="flex-grow overflow-y-auto pr-2 space-y-3 custom-scrollbar">
        {filteredActivities.map((activity) => (
          <div
            key={activity.id}
            onClick={() => onSelectActivity(activity)}
            className="group flex items-center justify-between p-4 rounded-2xl bg-slate-950/50 border border-slate-800/50 hover:border-sky-500/50 hover:bg-slate-900 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-slate-900 rounded-xl group-hover:bg-sky-500/10 transition-colors">
                {activity.icon}
              </div>
              <div>
                <h4 className="text-xs font-black uppercase italic tracking-tight text-white group-hover:text-sky-400 transition-colors">{activity.name}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800">{activity.category}</span>
                  <span className="text-[9px] font-bold text-slate-600 uppercase tracking-tighter italic">⏱ {activity.time}</span>
                </div>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center group-hover:bg-sky-500/20 transition-all">
              <ChevronRight size={14} className="text-slate-700 group-hover:text-sky-400 group-hover:translate-x-1 transition-all" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GymActivitiesList;
