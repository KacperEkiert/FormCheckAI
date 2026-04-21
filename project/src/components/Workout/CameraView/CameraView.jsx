import React from 'react';
import { Clock, Timer } from 'lucide-react';
import { useWorkoutDetection } from '../../../hooks';

const CameraView = ({ isActive, isGuest, onWorkoutFinish }) => {
  const {
    videoRef,
    canvasRef,
    workoutStage,
    repCount,
    phase,
    setupHint,
    calibProgress,
    isHeelLifted,
    timeLeft,
    countdown
  } = useWorkoutDetection(isActive, isGuest, onWorkoutFinish);

  const formatTime = (s) => `${Math.floor(s/60)}:${(s%60).toString().padStart(2, '0')}`;

  return (
    <div className="relative w-full h-full bg-slate-950 rounded-[2rem] border border-slate-800 overflow-hidden shadow-2xl">
      <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover opacity-0" playsInline muted />
      <canvas ref={canvasRef} className="w-full h-full object-cover scale-x-[-1]" />
      {workoutStage === 'active' && (
        <>
          <div className="absolute top-8 right-8 flex flex-col items-end gap-4 z-50">
            <div className="bg-slate-900/80 border-2 border-sky-500/50 px-8 py-4 rounded-[2.5rem] backdrop-blur-xl shadow-2xl flex flex-col items-center min-w-[140px]">
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-sky-500 mb-1 italic">Reps</span>
              <div key={repCount} className="text-6xl font-black italic text-white animate-in zoom-in duration-300">{repCount}</div>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 px-6 py-3 rounded-2xl backdrop-blur-xl flex items-center gap-3">
              <Clock size={16} className="text-sky-500" />
              <span className="text-xl font-black font-mono text-white tracking-widest">{formatTime(timeLeft)}</span>
            </div>
          </div>
          {isGuest && (
            <div className="absolute top-8 left-8 z-50">
              <div className="bg-amber-500 text-slate-950 px-4 py-1.5 rounded-full font-black text-[10px] uppercase tracking-widest shadow-lg flex items-center gap-2">
                <Timer size={12} /> Tryb Demo
              </div>
            </div>
          )}
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2">
             <div className={`px-8 py-3 rounded-full font-black uppercase tracking-[0.3em] text-[10px] shadow-xl ${phase === 'down' ? 'bg-sky-500 text-slate-950 animate-pulse' : 'bg-slate-900/90 text-slate-400'}`}>
                {phase === 'down' ? '↓↓ DÓŁ ↓↓' : '↑↑ GÓRA ↑↑'}
             </div>
          </div>
        </>
      )}
      <div className="absolute inset-0 pointer-events-none z-50 flex items-center justify-center p-6 text-center">
        {workoutStage === 'calibrating' && (
          <div className="bg-slate-900/95 border-2 border-sky-500/50 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-[0_0_80px_rgba(0,0,0,0.8)] flex flex-col items-center gap-6 animate-in fade-in zoom-in">
            <h3 className="text-2xl font-black uppercase tracking-widest text-white">{setupHint}</h3>
            {calibProgress > 0 && <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden"><div className="bg-green-500 h-full transition-all duration-100" style={{ width: `${calibProgress}%` }} /></div>}
            <div className="w-48 h-72 border-2 border-dashed border-sky-500/30 rounded-3xl relative">
               <div className="absolute inset-x-4 top-1/4 bottom-1/4 border-y border-sky-500/20 animate-pulse" />
            </div>
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest italic">Ustaw się w odległości 2-3 metrów</p>
          </div>
        )}
        {workoutStage === 'starting' && (
          <div className="flex flex-col items-center gap-8 animate-in zoom-in fade-in">
            <div className="text-sky-500 font-black text-[20px] uppercase tracking-[0.5em] italic">Przygotuj się</div>
            <div className="bg-sky-500 text-slate-950 font-black text-9xl w-48 h-48 rounded-full shadow-[0_0_100px_rgba(14,165,233,0.6)] italic flex items-center justify-center animate-bounce">
              {countdown}
            </div>
          </div>
        )}
        {workoutStage === 'active' && isHeelLifted && (
          <div className="absolute bottom-32 bg-red-600 text-white font-black px-10 py-4 rounded-2xl shadow-2xl animate-bounce border-4 border-white uppercase tracking-tighter">PRZYKLEJ PIĘTY DO ZIEMI!</div>
        )}
      </div>
    </div>
  );
};

export default CameraView;
