import React from 'react';
import { Award, X, Trophy, Target } from 'lucide-react';
import { ACTIVITIES } from '../../../constants';

const AchievementsPanel = ({ 
  showAchievements, 
  setShowAchievements, 
  handleAchievementClick 
}) => {
  return (
    <>
      {showAchievements && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] transition-opacity duration-300"
          onClick={() => setShowAchievements(false)}
        />
      )}

      <div className={`fixed top-0 right-0 h-full w-80 max-w-[90%] bg-slate-900 border-l border-slate-800 z-[201] shadow-2xl transform transition-transform duration-300 ease-out p-6 flex flex-col ${showAchievements ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <Award className="text-amber-500" size={24} />
            </div>
            <h2 className="text-xl font-black italic uppercase text-white tracking-tighter">Osiągnięcia</h2>
          </div>
          <button 
            onClick={() => setShowAchievements(false)}
            className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 space-y-4 scrollbar-hide">
          {ACTIVITIES && ACTIVITIES.map(a => (
            <div 
              key={a.id} 
              onClick={() => handleAchievementClick(a.id)}
              className="group bg-black/40 border border-slate-800 p-4 rounded-2xl flex items-center gap-4 hover:border-amber-500/50 transition-all cursor-pointer active:scale-95"
            >
              <div className="relative">
                <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 group-hover:bg-amber-500/10 transition-colors">
                   <Trophy size={18} className="text-amber-500" />
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-black" />
              </div>
              <div className="flex-1">
                <h4 className="text-[11px] font-black uppercase italic text-white leading-none mb-1 group-hover:text-amber-500 transition-colors">
                  {a.achievement || 'Mistrz Formy'}
                </h4>
                <div className="flex items-center gap-1.5">
                  <Target size={10} className="text-slate-600" />
                  <p className="text-[9px] text-slate-500 uppercase font-bold tracking-tighter">Za: {a.name}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-6 border-t border-slate-800 text-center text-slate-500 text-[10px] uppercase font-bold tracking-widest">
            System FormCheck AI v2.0
        </div>
      </div>
    </>
  );
};

export default AchievementsPanel;
