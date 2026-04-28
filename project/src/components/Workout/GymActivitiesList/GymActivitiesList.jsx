import React from 'react';
import { ChevronRight, Lock } from 'lucide-react';
import { ACTIVITIES } from '../../../constants';

const GymActivitiesList = ({ onSelectActivity, filter, setFilter }) => {
  const categories = ['Wszystkie', 'Nogi', 'Klatka', 'Plecy', 'Core', 'Barki', 'Biceps', 'Triceps', 'Kardio', 'Przedramie'];
  
const filteredActivities = (!filter || filter === 'Wszystkie') 
    ? ACTIVITIES 
    : ACTIVITIES.filter(a => a.category.toUpperCase() === filter.toUpperCase());
  return (
    <div className="h-full flex flex-col p-6 overflow-hidden">

      {/* Activities Grid */}
      <div className="flex-grow overflow-y-auto pr-2 grid grid-cols-1 md:grid-cols-2 gap-4 content-start pb-10">
        {filteredActivities.map((activity) => {
          const isLocked = !activity.exerciseId;
          
          return (
            <div
              key={activity.id}
              onClick={() => !isLocked && onSelectActivity(activity)}
              className={`group relative flex flex-col justify-between p-6 rounded-[2rem] border transition-all overflow-hidden h-fit min-h-[160px] ${isLocked ? 'bg-slate-900/10 border-slate-900 cursor-not-allowed opacity-40' : 'bg-slate-900/30 border-slate-800/50 hover:border-sky-500/50 hover:bg-slate-900/60 cursor-pointer shadow-xl'}`}
            >
              {/* Background Glow (only for active) */}
              {!isLocked && <div className="absolute -top-12 -right-12 w-24 h-24 bg-sky-500/10 blur-3xl rounded-full group-hover:bg-sky-500/20 transition-all" />}
              
              <div className="flex items-start justify-between mb-4">
                <div className={`p-4 bg-slate-950 rounded-2xl border ${isLocked ? 'border-slate-900' : 'border-slate-800 group-hover:border-sky-500/30 group-hover:bg-sky-500/5'} transition-all shadow-xl`}>
                  {activity.icon}
                </div>
                <div className={`w-8 h-8 rounded-full bg-slate-950 border flex items-center justify-center transition-all ${isLocked ? 'border-slate-900' : 'border-slate-800 group-hover:border-sky-500/30 group-hover:bg-sky-500/20'}`}>
                  {isLocked ? (
                    <Lock size={12} className="text-slate-700" />
                  ) : (
                    <ChevronRight size={14} className="text-slate-600 group-hover:text-sky-400 group-hover:translate-x-0.5 transition-all" />
                  )}
                </div>
              </div>

              <div>
                <h4 className={`text-xs font-black uppercase italic tracking-tight transition-colors leading-tight mb-2 ${isLocked ? 'text-slate-600' : 'text-white group-hover:text-sky-400'}`}>
                  {activity.name}
                </h4>
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border ${isLocked ? 'bg-slate-950/50 border-slate-900 text-slate-700' : 'bg-sky-500/5 border-sky-500/10 text-sky-500/70'}`}>
                    {activity.category}
                  </span>
                  <span className={`text-[9px] font-bold uppercase tracking-tighter italic ${isLocked ? 'text-slate-800' : 'text-slate-500'}`}>
                    {isLocked ? '🔒 Coming Soon' : `⏱ ${activity.time}`}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default GymActivitiesList;
