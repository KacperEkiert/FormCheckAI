import React, { useState } from 'react';
import { Clock, Timer, Download, Database } from 'lucide-react';
import { useWorkoutDetection } from '../../../hooks';
import { EXERCISES } from '../../../config/exercises';

const CameraView = ({ isActive, isGuest, onWorkoutFinish, selectedEx }) => {
  const [selectedExercise, setSelectedExercise] = useState(selectedEx?.exerciseId || 'squat');

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
    countdown,
    qualityAlert,
    kneeAngle,
    backAngle,
    isBackPoor,
    isShallow,
    isRecordingDataset,
    startDataset,
    stopAndExportDataset
  } = useWorkoutDetection(isActive, isGuest, onWorkoutFinish, selectedExercise);

  const initialLabels = EXERCISES['squat'].labels.reduce((acc, label) => ({ ...acc, [label]: false }), {});
  const [activeLabels, setActiveLabels] = useState(initialLabels);

  const handleExerciseChange = (e) => {
    const newExercise = e.target.value;
    setSelectedExercise(newExercise);
    const newLabels = EXERCISES[newExercise].labels.reduce((acc, label) => ({ ...acc, [label]: false }), {});
    setActiveLabels(newLabels);
  };

  const toggleLabel = (label) => {
    setActiveLabels(prev => ({...prev, [label]: !prev[label]}));
  };

  const setCorrectLabel = () => {
    const defaultLabels = EXERCISES[selectedExercise].labels.reduce((acc, label) => ({ ...acc, [label]: false }), {});
    setActiveLabels(defaultLabels);
  };

  const formatTime = (s) => `${Math.floor(s/60)}:${(s%60).toString().padStart(2, '0')}`;

  return (
    <div className="relative w-full h-full bg-slate-950 rounded-[2rem] border border-slate-800 overflow-hidden shadow-2xl">
      <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover opacity-0" playsInline muted />
      <canvas ref={canvasRef} className="w-full h-full object-cover scale-x-[-1]" />
      
      {/* ⚠️ Massive Quality Alert */}
      {qualityAlert && (
        <div className="absolute top-0 inset-x-0 z-[100] bg-red-600/90 text-white px-4 py-3 text-center font-black text-sm uppercase tracking-widest shadow-2xl backdrop-blur-md animate-pulse">
          ⚠️ {qualityAlert}
        </div>
      )}

      {/* 🛑 Massive Technique Error Banners */}
      <div className="absolute top-20 inset-x-0 flex flex-col items-center gap-4 z-[90] pointer-events-none px-6">
        {workoutStage === 'active' && isHeelLifted && (
          <div className="w-full max-w-xl bg-red-600 text-white font-black px-6 py-6 rounded-3xl shadow-[0_0_50px_rgba(220,38,38,0.5)] animate-bounce border-4 border-white text-center">
            <div className="text-4xl md:text-6xl tracking-tighter uppercase mb-1">PIĘTY W DÓŁ!</div>
            <div className="text-xs md:text-sm opacity-90 uppercase tracking-[0.2em]">Przyklej pięty do ziemi</div>
          </div>
        )}
        
        {workoutStage === 'active' && isShallow && (
          <div className="w-full max-w-xl bg-amber-500 text-slate-950 font-black px-6 py-6 rounded-3xl shadow-[0_0_50px_rgba(245,158,11,0.5)] animate-in slide-in-from-top-10 duration-300 border-4 border-slate-950 text-center">
            <div className="text-4xl md:text-6xl tracking-tighter uppercase mb-1">ZEJDŹ NIŻEJ!</div>
            <div className="text-xs md:text-sm opacity-90 uppercase tracking-[0.2em]">Zbyt płytkie powtórzenie</div>
          </div>
        )}

        {workoutStage === 'active' && isBackPoor && (
          <div className="w-full max-w-xl bg-red-600 text-white font-black px-6 py-6 rounded-3xl shadow-[0_0_50px_rgba(220,38,38,0.5)] animate-pulse border-4 border-white text-center">
            <div className="text-4xl md:text-6xl tracking-tighter uppercase mb-1">PLECY PROSTO!</div>
            <div className="text-xs md:text-sm opacity-90 uppercase tracking-[0.2em]">Nie garb się i trzymaj pion</div>
          </div>
        )}
      </div>

      {workoutStage === 'active' && (
        <>
          {/* Main Rep Counter & Timer - Enlarged for distance visibility */}
          <div className="absolute top-8 right-8 flex flex-col items-end gap-4 z-50">
            <div className="bg-slate-900/90 border-2 border-sky-500/50 px-8 py-6 rounded-[3rem] backdrop-blur-xl shadow-2xl flex flex-col items-center min-w-[160px] md:min-w-[200px]">
              <span className="text-[12px] md:text-sm font-black uppercase tracking-[0.4em] text-sky-500 mb-1 italic">Reps</span>
              <div key={repCount} className="text-7xl md:text-9xl font-black italic text-white animate-in zoom-in duration-300 drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]">{repCount}</div>
            </div>
            <div className="bg-slate-900/90 border border-slate-800 px-6 py-4 rounded-2xl backdrop-blur-xl flex items-center gap-3">
              <Clock size={20} className="text-sky-500" />
              <span className="text-2xl md:text-3xl font-black font-mono text-white tracking-widest">{formatTime(timeLeft)}</span>
            </div>
          </div>

          {/* Real-time Angle Metrics - More visible DOM elements instead of canvas text */}
          <div className="absolute bottom-8 left-8 z-50 flex flex-col gap-2">
            <div className="bg-slate-900/80 backdrop-blur-md px-4 py-2 rounded-xl border border-slate-800 flex items-center gap-4">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">KNEE</span>
                <span className={`text-xl font-black ${kneeAngle < 90 ? 'text-green-500' : 'text-sky-400'}`}>{kneeAngle}°</span>
              </div>
              <div className="h-8 w-px bg-slate-800" />
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">BACK</span>
                <span className={`text-xl font-black ${isBackPoor ? 'text-red-500' : 'text-sky-400'}`}>{backAngle}°</span>
              </div>
            </div>
          </div>

          {isGuest && (
            <div className="absolute top-8 left-8 z-50">
              <div className="bg-amber-500 text-slate-950 px-5 py-2 rounded-full font-black text-xs uppercase tracking-widest shadow-lg flex items-center gap-2">
                <Timer size={14} /> Tryb Demo
              </div>
            </div>
          )}

          {/* Dataset Controls - Visible during active workout */}
          <div className="absolute top-8 left-8 z-50 flex flex-col gap-2">
           <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-2xl backdrop-blur-xl flex flex-col gap-3">
               <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Dane Treningowe ML</span>
                
                <select 
                  value={selectedExercise} 
                  onChange={handleExerciseChange}
                  disabled={isRecordingDataset}
                  className="bg-slate-800 text-xs text-white uppercase font-bold py-1.5 px-2 rounded-lg border border-slate-700 outline-none w-full"
                >
                  {Object.values(EXERCISES).map(ex => (
                    <option key={ex.id} value={ex.id}>{ex.name}</option>
                  ))}
                </select>

                <div className="grid grid-cols-2 gap-2 mb-1">
                  <button 
                    onClick={setCorrectLabel}
                    className={`col-span-2 text-[9px] font-bold uppercase py-1.5 px-2 rounded-lg border transition-all ${Object.values(activeLabels).every(v => !v) ? 'bg-green-500/20 text-green-400 border-green-500/50' : 'bg-slate-800/30 text-slate-500 border-slate-700 hover:bg-slate-800'}`}
                  >
                    {Object.values(activeLabels).every(v => !v) ? '✓ POPRAWNE (AKTYWNE)' : 'USTAW JAKO POPRAWNE'}
                  </button>
                  {Object.keys(activeLabels).map(l => (
                    <button 
                      key={l}
                      onClick={() => toggleLabel(l)}
                      className={`text-[9px] font-bold uppercase py-1 px-2 rounded-lg border transition-all ${activeLabels[l] ? 'bg-red-500/20 text-red-400 border-red-500/50' : 'bg-slate-800/50 text-slate-500 border-slate-700'}`}
                    >
                      {l} {activeLabels[l] && '●'}
                    </button>
                  ))}
                </div>
               {isRecordingDataset ? (
                 <button 
                   onClick={() => stopAndExportDataset(selectedExercise)}
                   className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase py-2 rounded-xl flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(245,158,11,0.3)] transition-all"
                 >
                   <Download size={14} /> Zapisz JSON
                 </button>
               ) : (
                 <button 
                   onClick={() => startDataset(activeLabels, selectedExercise)}
                   className="w-full bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs uppercase py-2 rounded-xl flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(14,165,233,0.3)] transition-all"
                 >
                   <Database size={14} /> Nagrywaj
                 </button>
               )}
             </div>
          </div>

          {/* Phase Indicator */}
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2">
             <div className={`px-10 py-4 rounded-full font-black uppercase tracking-[0.3em] text-xs md:text-sm shadow-2xl transition-all duration-300 ${phase === 'down' ? 'bg-sky-500 text-slate-950 animate-pulse scale-110' : 'bg-slate-900/95 text-slate-400'}`}>
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
      </div>
    </div>
  );
};

export default CameraView;
