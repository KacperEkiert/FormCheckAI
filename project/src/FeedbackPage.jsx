import React from 'react';
import { 
  ChevronLeft, 
  CheckCircle2, 
  AlertTriangle, 
  Trophy, 
  ArrowRight,
  PlayCircle,
  Activity as ActivityIcon,
  XCircle,
  Zap,
  ShieldAlert
} from 'lucide-react';

const FeedbackPage = ({ workoutData, onBack, onSelectNewExercise }) => {
  const f = workoutData?.debug?.faults;
  const score = workoutData?.score || 0;

  // 1. DYNAMICZNA ANALIZA FORMY (Checklista)
  const getFormAnalysis = () => {
    const analysis = [];
    
    // Plecy
    if (!f || f.poorBackPct === 0) analysis.push({ label: "Stabilizacja pleców", status: "perfect", desc: "Wzorowa postawa pionowa." });
    else if (f.poorBackPct < 15) analysis.push({ label: "Stabilizacja pleców", status: "warning", desc: `Lekkie pochylenie (${f.poorBackPct}%).` });
    else analysis.push({ label: "Stabilizacja pleców", status: "critical", desc: `Zbyt mocne pochylenie (${f.poorBackPct}%).` });

    // Pięty
    if (!f || f.heelLiftPct === 0) analysis.push({ label: "Kontakt z podłożem", status: "perfect", desc: "Pięty stabilnie na ziemi." });
    else if (f.heelLiftPct < 10) analysis.push({ label: "Kontakt z podłożem", status: "warning", desc: "Lekkie odrywanie pięt." });
    else analysis.push({ label: "Kontakt z podłożem", status: "critical", desc: `Pięty w górze (${f.heelLiftPct}% czasu).` });

    // Zakres ruchu
    const shallowPct = Math.round((f?.shallowReps / (workoutData.reps || 1)) * 100) || 0;
    if (shallowPct === 0) analysis.push({ label: "Zakres ruchu (ROM)", status: "perfect", desc: "Pełna głębokość powtórzeń." });
    else if (shallowPct < 30) analysis.push({ label: "Zakres ruchu (ROM)", status: "warning", desc: `${f.shallowReps} powtórzenia zbyt płytkie.` });
    else analysis.push({ label: "Zakres ruchu (ROM)", status: "critical", desc: `Aż ${shallowPct}% płytkich powtórzeń.` });

    return analysis;
  };

  // 2. WNIOSKI TRENERA AI
  const getCoachConclusion = () => {
    if (score > 90) return {
      title: "Poziom: ELITE",
      text: "Twoja technika jest niemal perfekcyjna. Utrzymujesz idealną stabilność kręgosłupa i pełny zakres ruchu. Możesz rozważyć zwiększenie obciążenia w kolejnej sesji.",
      icon: <Trophy className="text-yellow-500" />
    };
    if (score > 70) return {
      title: "Poziom: SOLID",
      text: "Bardzo dobra baza. Zwróć uwagę na detale – uciekające plecy lub lekko uniesione pięty w ostatniej fazie ruchu. Kontroluj tempo przy schodzeniu w dół.",
      icon: <CheckCircle2 className="text-green-500" />
    };
    if (score > 40) return {
      title: "Poziom: DEVELOPING",
      text: "Technika wymaga poprawy. Twoja forma załamuje się pod wpływem zmęczenia. Skup się na mobilności bioder i pilnuj, aby pięty nie traciły kontaktu z ziemią.",
      icon: <Zap className="text-amber-500" />
    };
    return {
      title: "Poziom: CRITICAL ALERT",
      text: "Wykryto błędy zagrażające zdrowiu. Znaczne pochylenie tułowia przy odrywaniu pięt drastycznie obciąża stawy. Zredukuj ciężar i wróć do podstaw techniki.",
      icon: <ShieldAlert className="text-red-500" />
    };
  };

  const formItems = getFormAnalysis();
  const coach = getCoachConclusion();

  return (
    <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors mb-8 group">
        <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
        <span className="text-xs font-black uppercase tracking-widest">Biblioteka Ćwiczeń</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
        {/* AI PERFORMANCE SCORE */}
        <div className="lg:col-span-4 bg-slate-900/40 rounded-[2.5rem] border border-slate-800 p-8 flex flex-col items-center justify-center relative overflow-hidden group shadow-2xl">
          <div className={`absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity ${score > 70 ? 'bg-green-500' : 'bg-red-500'}`} />
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 mb-8 z-10">AI Performance Score</p>
          
          <div className="relative h-56 w-56 flex items-center justify-center z-10">
            <svg className="h-full w-full transform -rotate-90" viewBox="0 0 192 192">
              <circle cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="10" fill="transparent" className="text-slate-800" />
              <circle
                cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="10" fill="transparent"
                strokeDasharray={552.92}
                strokeDashoffset={552.92 - (552.92 * score) / 100}
                className={`${score > 80 ? 'text-green-500 shadow-[0_0_20px_#22c55e]' : score > 50 ? 'text-amber-500' : 'text-red-500'} transition-all duration-1000 ease-out`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-6xl font-black italic tracking-tighter text-white">{score}</span>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">/ 100</span>
            </div>
          </div>
        </div>

        {/* VIDEO REPLAY */}
        <div className="lg:col-span-8 bg-slate-900/40 rounded-[2.5rem] border border-slate-800 p-4 relative shadow-2xl">
          <div className="flex items-center justify-between mb-3 px-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-sky-500 animate-pulse" />
              <span className="text-[9px] font-black uppercase tracking-widest text-sky-500">Session Replay: {workoutData?.name}</span>
            </div>
            <span className="text-[9px] font-mono text-slate-600">{workoutData?.date}</span>
          </div>
          <div className="aspect-video bg-slate-950 rounded-[1.5rem] overflow-hidden border border-slate-800 relative group">
            {workoutData?.videoUrl ? (
              <video src={workoutData.videoUrl} className="w-full h-full object-cover" autoPlay loop muted />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-slate-800 uppercase font-black italic">
                <PlayCircle size={64} className="opacity-10" />
                <span className="text-xs tracking-widest">Nagranie niedostępne</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        {/* ANALIZA FORMY */}
        <div className="bg-slate-900/40 rounded-[2.5rem] border border-slate-800 p-8 shadow-xl">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-8 flex items-center gap-2">
            <ActivityIcon size={14} className="text-sky-500" /> Analiza Formy
          </h3>
          <div className="space-y-6">
            {formItems.map((item, idx) => (
              <div key={idx} className="flex items-start gap-4 p-4 rounded-2xl bg-slate-950/50 border border-slate-800/50">
                <div className="mt-1">
                  {item.status === 'perfect' && <CheckCircle2 className="text-green-500" size={20} />}
                  {item.status === 'warning' && <AlertTriangle className="text-amber-500" size={20} />}
                  {item.status === 'critical' && <XCircle className="text-red-500" size={20} />}
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1">{item.label}</p>
                  <p className="text-sm font-bold text-white leading-tight">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* WNIOSKI TRENERA AI */}
        <div className="bg-slate-900/40 rounded-[2.5rem] border border-slate-800 p-8 shadow-xl flex flex-col">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-8 flex items-center gap-2">
            <Zap size={14} className="text-sky-500" /> Wnioski Trenera AI
          </h3>
          <div className="flex-grow flex flex-col justify-center">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800">
                {coach.icon}
              </div>
              <h4 className="text-2xl font-black uppercase italic text-white tracking-tighter">{coach.title}</h4>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed font-medium italic border-l-4 border-sky-500 pl-6 py-2">
              "{coach.text}"
            </p>
          </div>
          
          <div className="mt-8 pt-8 border-t border-slate-800/50 flex justify-between items-center">
            <div>
              <p className="text-[8px] font-black text-slate-600 uppercase">Największe nachylenie</p>
              <p className="text-xl font-black text-white">{workoutData?.debug?.back?.max || 0}°</p>
            </div>
            <div>
              <p className="text-[8px] font-black text-slate-600 uppercase text-right">Głębokość max</p>
              <p className="text-xl font-black text-white text-right">{workoutData?.debug?.knee?.min || 0}°</p>
            </div>
          </div>
        </div>
      </div>

      {/* RECOMMENDATIONS */}
      <div>
        <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-sky-500 mb-6 text-center">Rekomendowane Aktywności</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { id: 2, name: 'Przysiad Bułgarski', category: 'Stabilizacja', diff: 'Medium' },
            { id: 3, name: 'Rozciąganie Skokowe', category: 'Mobilność', diff: 'Easy' }
          ].map((ex) => (
            <button key={ex.id} className="group flex items-center justify-between p-6 bg-slate-900/60 rounded-2xl border border-slate-800 hover:border-sky-500/50 transition-all text-left">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-sky-500/10 rounded-xl flex items-center justify-center group-hover:bg-sky-500 group-hover:text-slate-950 transition-colors">
                  <ActivityIcon size={20} />
                </div>
                <div>
                  <h4 className="font-black uppercase italic text-white">{ex.name}</h4>
                  <p className="text-[9px] text-slate-500 uppercase font-bold">{ex.category} • {ex.diff}</p>
                </div>
              </div>
              <ArrowRight size={18} className="text-slate-700 group-hover:text-sky-500 group-hover:translate-x-1 transition-all" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FeedbackPage;
