import React from 'react';

const FeedbackPage = ({ workoutData, onBack }) => {
  const data = workoutData || {
    score: 85,
    muscle: "Nogi - Przysiad",
    notes: "Świetna robotą! Skup się na stabilizacji bioder. W następnej sesji popracujemy nad głębokością.",
    repsCompleted: 12,
    improvements: ["Plecy proste (Super!)", "Głowa w dobrej pozycji"],
    warnings: ["Kolana uciekają do środka przy wstawaniu"],
    recommendations: [
      { name: "Wykroki", sets: "3 serie x 12 powt." },
      { name: "Plank", sets: "3 serie x 45 sek." }
    ]
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-8 font-sans animate-in fade-in duration-500">
      {/* Header */}
      <header className="max-w-6xl mx-auto mb-8 flex justify-between items-center border-b border-slate-800 pb-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="px-4 py-2 hover:bg-slate-900 rounded-xl transition-colors text-sky-400 border border-sky-400/20 text-sm font-bold"
          >
            ← POWRÓT
          </button>
          <h1 className="text-xl md:text-2xl font-black tracking-tighter uppercase italic">
            Form<span className="text-sky-400">Check</span> Feedback
          </h1>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Sesja zakończona</p>
          <p className="text-sm font-mono text-sky-500">{data.muscle}</p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          
          {/* AI Score */}
          <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 flex flex-col items-center justify-center shadow-2xl">
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

          {/* Video Placeholder */}
          <div className="lg:col-span-2 bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden relative group shadow-2xl min-h-[300px]">
            <div className="absolute inset-0 bg-slate-950/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 z-10">
              <div className="bg-sky-500 px-6 py-3 rounded-full text-slate-950 font-black text-sm uppercase tracking-widest cursor-pointer">
                ODTWÓRZ SESJĘ
              </div>
            </div>
            <div className="p-4 bg-slate-900/80 absolute top-0 w-full z-20 flex justify-between items-center border-b border-slate-800">
              <span className="text-xs font-black uppercase tracking-widest text-sky-400 flex items-center gap-2">
                ● SESSION REPLAY
              </span>
            </div>
            <img 
              src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80&w=1000" 
              alt="Workout" 
              className="w-full h-full object-cover opacity-50 transition-transform duration-700 group-hover:scale-105"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {/* Analiza */}
          <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl">
            <h3 className="text-[10px] text-slate-500 mb-4 uppercase font-black tracking-widest">Analiza Formy</h3>
            <ul className="space-y-3">
              {data.warnings.map((w, i) => (
                <li key={i} className="text-amber-400 text-xs flex items-start gap-2 italic font-medium">
                  <span className="font-bold">⚠️</span> {w}
                </li>
              ))}
              {data.improvements.map((imp, i) => (
                <li key={i} className="text-emerald-400 text-xs flex items-start gap-2 font-medium">
                  <span className="font-bold">✓</span> {imp}
                </li>
              ))}
            </ul>
          </div>

          {/* Notatki */}
          <div className="bg-slate-900 p-6 rounded-3xl border border-sky-900/20 shadow-xl lg:col-span-2">
            <h3 className="text-[10px] text-slate-500 mb-4 uppercase font-black tracking-widest">Notatki Trenera AI</h3>
            <div className="border-l-2 border-sky-500 pl-4">
               <p className="text-slate-200 text-sm leading-relaxed italic">
                 "{data.notes}"
               </p>
            </div>
          </div>

          {/* Powtórzenia */}
          <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl text-center flex flex-col justify-center">
            <h3 className="text-[10px] text-slate-500 mb-2 uppercase font-black tracking-widest">Suma Powtórzeń</h3>
            <span className="text-5xl font-black text-sky-400 italic">{data.repsCompleted}</span>
            <p className="text-[10px] font-bold text-emerald-500 mt-2 uppercase">↑ PROGRES</p>
          </div>
        </div>

        {/* Rekomendacje */}
        <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl">
          <h3 className="text-[10px] text-slate-500 mb-5 uppercase font-black tracking-widest">Następne Ćwiczenia</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.recommendations.map((ex, i) => (
              <div key={i} className="flex items-center justify-between bg-slate-950 p-4 rounded-2xl border border-slate-800 hover:border-sky-500 transition-all cursor-pointer group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-sky-500/10 rounded-lg flex items-center justify-center text-sky-500 font-bold group-hover:bg-sky-500 group-hover:text-slate-950">
                    #
                  </div>
                  <div>
                    <h4 className="font-bold text-sm uppercase italic tracking-tight">{ex.name}</h4>
                    <p className="text-[10px] text-slate-500 font-mono">{ex.sets}</p>
                  </div>
                </div>
                <span className="text-slate-800 group-hover:text-sky-500 text-xl font-black">→</span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default FeedbackPage;