import React, { useMemo } from 'react';
import { Zap, Dumbbell, Timer, Trophy, Flame } from 'lucide-react';
import { ACTIVITIES } from './GymActivitiesList';

const FeedbackPage = ({ workoutData, onBack, onSelectNewExercise }) => {
  
  // LOGIKA REKOMENDACJI
  const recommendations = useMemo(() => {
    const currentCategory = workoutData?.category;
    const currentName = workoutData?.name;

    let related = ACTIVITIES.filter(ex => 
      ex.category === currentCategory && ex.name !== currentName
    );

    if (related.length < 2) {
      const others = ACTIVITIES.filter(ex => 
        ex.category !== currentCategory && ex.name !== currentName
      ).sort(() => 0.5 - Math.random());
      
      related = [...related, ...others];
    }

    return related.slice(0, 2);
  }, [workoutData]);

  const data = {
    score: workoutData?.score || 91,
    muscle: workoutData?.name || "Brak danych",
    category: workoutData?.category || "Trening",
    notes: "Świetna robotą! System AI wykrył stabilną formę. Skup się na pełnym zakresie ruchu w kolejnych seriach.",
    repsCompleted: workoutData?.reps || 0,
    improvements: ["Tempo pod kontrolą", "Plecy proste (Super!)"],
    warnings: ["Brak krytycznych uwag - tak trzymaj!"],
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-8 font-sans animate-in fade-in duration-500 overflow-y-auto">
      {/* Header */}
      <header className="max-w-6xl mx-auto mb-8 flex justify-between items-center border-b border-slate-800 pb-6 shrink-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="px-4 py-2 hover:bg-slate-900 rounded-xl transition-colors text-sky-400 border border-sky-400/20 text-sm font-bold uppercase tracking-tighter"
          >
            ← POWRÓT
          </button>
          <h1 className="text-xl md:text-2xl font-black tracking-tighter uppercase italic">
            Form<span className="text-sky-400">Check</span> Feedback
          </h1>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Ostatnia partia</p>
          <p className="text-sm font-mono text-sky-500">{data.category}</p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto">
        {/* Górna sekcja */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Score */}
          <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 flex flex-col items-center justify-center shadow-2xl overflow-hidden shrink-0">
            <h3 className="text-[10px] text-slate-500 mb-6 uppercase font-black tracking-widest">AI Performance Score</h3>
            <div className="relative flex items-center justify-center">
              <svg className="w-40 h-40 transform -rotate-90">
                <circle className="text-slate-800" strokeWidth="10" stroke="currentColor" fill="transparent" r="70" cx="80" cy="80" />
                <circle className="text-sky-500" strokeWidth="10" strokeDasharray={440} strokeDashoffset={440 - (440 * data.score) / 100} strokeLinecap="round" stroke="currentColor" fill="transparent" r="70" cx="80" cy="80" />
              </svg>
              <div className="absolute text-center">
                <span className="text-5xl font-black italic">{data.score}</span>
                <p className="text-xs text-slate-500 font-bold">/100</p>
              </div>
            </div>
          </div>

          {/* Video Replay */}
          <div className="lg:col-span-2 bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden relative shadow-2xl min-h-[300px] flex items-center justify-center">
            {workoutData?.videoUrl ? (
              <div className="w-full h-full relative group">
                <div className="p-3 bg-slate-900/80 absolute top-0 w-full z-20 flex justify-between items-center border-b border-slate-800">
                  <span className="text-[10px] font-black uppercase tracking-widest text-sky-400 flex items-center gap-2">
                    ● SESSION REPLAY: {data.muscle}
                  </span>
                </div>
                <video src={workoutData.videoUrl} className="w-full h-full object-cover" controls autoPlay loop />
              </div>
            ) : (
              <div className="text-center">
                <p className="text-slate-700 font-black uppercase tracking-widest">Nagranie wideo niedostępne</p>
              </div>
            )}
          </div>
        </div>

        {/* Statystyki */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10 shrink-0">
          <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl overflow-hidden">
            <h3 className="text-[10px] text-slate-500 mb-4 uppercase font-black tracking-widest shrink-0">Analiza Formy</h3>
            <ul className="space-y-3 shrink-0">
              {data.improvements.map((imp, i) => (
                <li key={i} className="text-emerald-400 text-xs flex items-start gap-2 font-bold shrink-0">✓ {imp}</li>
              ))}
              {data.warnings.map((w, i) => (
                <li key={i} className="text-amber-400 text-xs flex items-start gap-2 italic font-medium shrink-0">⚠️ {w}</li>
              ))}
            </ul>
          </div>

          <div className="bg-slate-900 p-6 rounded-3xl border border-sky-900/20 shadow-xl lg:col-span-2 overflow-hidden flex flex-col justify-between">
            <h3 className="text-[10px] text-slate-500 mb-4 uppercase font-black tracking-widest shrink-0">Wnioski Trenera AI</h3>
            <div className="border-l-2 border-sky-500 pl-4">
               <p className="text-slate-200 text-sm leading-relaxed italic">
                 "Wykonano {data.repsCompleted} powtórzeń ćwiczenia {data.muscle}. {data.notes}"
               </p>
            </div>
          </div>

          <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl text-center flex flex-col justify-center shrink-0">
            <h3 className="text-[10px] text-slate-500 mb-2 uppercase font-black tracking-widest shrink-0">Powtórzenia</h3>
            <span className="text-5xl font-black text-sky-400 italic shrink-0">{data.repsCompleted}</span>
          </div>
        </div>

        {/* REKOMENDACJE - NAPRAWIONE */}
        <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl mb-10 overflow-hidden">
          <h3 className="text-center text-[10px] text-sky-400 mb-6 uppercase font-black tracking-[0.3em] shrink-0">
            Rekomendowane do Twojego treningu ({data.category})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 shrink-0">
            {recommendations.map((ex) => (
              <div 
                key={ex.id} 
                onClick={() => onSelectNewExercise(ex)}
                // Poprawione tło i hover
                className="group flex items-center justify-between bg-slate-950 p-4 rounded-2xl border border-slate-800 hover:border-sky-400 transition-all cursor-pointer h-full shrink-0"
              >
                <div className="flex items-center gap-4 min-w-0">
                  {/* Stara ikona */}
                  <div className="w-10 h-10 bg-sky-500/10 rounded-lg flex items-center justify-center text-sky-500 font-bold group-hover:bg-sky-500 group-hover:text-slate-950 transition-colors shrink-0">
                    {ex.icon}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-sm uppercase italic tracking-tight text-white group-hover:text-sky-400 transition-colors line-clamp-1 shrink-0">{ex.name}</h4>
                    <p className="text-[10px] text-slate-500 font-mono shrink-0">{ex.category} • {ex.time}</p>
                  </div>
                </div>
                {/* PRZYWRÓCONA STRZAŁKA W KÓŁKU */}
                <div className="bg-slate-900 w-8 h-8 rounded-full flex items-center justify-center border border-slate-800 group-hover:border-sky-500 shrink-0 ml-4 transition-all flex-none">
                    <span className="text-sky-500 font-black">→</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default FeedbackPage;