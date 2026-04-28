import React, { useEffect, useState, useRef } from 'react';
import { 
  User, Settings, Camera, Trophy, Loader2, Save, Ruler, Target, 
  Brain, ShieldCheck, Activity, Droplets, 
  HeartPulse, PieChart, CheckCircle2, AlertCircle, ShieldAlert,
  Medal, Lock, Award, Zap, Timer, Crown, Dumbbell
} from 'lucide-react';
import { useProfile } from '../../hooks';

const ACHIEVEMENTS_LIST = [
  { id: "001", title: "Król Przysiadów", desc: "Twoja technika przysiadu osiągnęła poziom elitarny.", req: "10 powtórzeń < 100°", icon: <Zap size={20}/>, color: "text-sky-400", unlocked: true },
  { id: "002", title: "Twardy jak Diament", desc: "Niezłomna wytrzymałość i nienaganna forma.", req: "50 powt. technika > 90%", icon: <ShieldCheck size={20}/>, color: "text-emerald-400", unlocked: false },
  { id: "003", title: "Łamacz Desek", desc: "Twój korpus jest ze stali.", req: "Plank przez 3 minuty", icon: <Droplets size={20}/>, color: "text-blue-400", unlocked: false },
  { id: "004", title: "Cyber-Wykrok", desc: "Doskonała koordynacja i balans.", req: "Seria wykroków bez utraty osiowości", icon: <Timer size={20}/>, color: "text-purple-400", unlocked: false },
  { id: "005", title: "Wspinaczka na Szczyt", desc: "Konsekwentny progres i dążenie do doskonałości.", req: "Ocena 100/100 w 5 ćwiczeniach", icon: <Crown size={20}/>, color: "text-amber-400", unlocked: false },
  { id: "006", title: "Generał Barków", desc: "Potężne i stabilne barki.", req: "Wyciskanie OH z idealnym torem", icon: <Activity size={20}/>, color: "text-rose-400", unlocked: false },
  { id: "007", title: "Stalowe Bicepsy", desc: "Maksymalna izolacja i napięcie.", req: "15 powtórzeń bez cheatingu", icon: <ShieldCheck size={20}/>, color: "text-orange-400", unlocked: false }
];

const UserProfile = ({ avatarUrl, onAvatarChange, isGuest, onLogin, initialAchievementId }) => {
  const { loading, formData, setFormData, stats, saveState, saveProfileData, toggleDay } = useProfile(isGuest);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [highlightedAch, setHighlightedAch] = useState(null);
  const fileInputRef = useRef(null);
  const achRefs = useRef({});

  useEffect(() => {
    if (initialAchievementId && !loading) {
      setTimeout(() => {
        setActiveTab('achievements');
        setHighlightedAch(initialAchievementId);
        const attemptScroll = (retryCount = 0) => {
          const targetElement = achRefs.current[initialAchievementId];
          if (targetElement) targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          else if (retryCount < 5) setTimeout(() => attemptScroll(retryCount + 1), 100);
        };
        attemptScroll();
      }, 0);
    }
  }, [initialAchievementId, loading]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[60vh] space-y-6 animate-pulse text-sky-500">
      <Loader2 className="animate-spin" size={48} />
      <p className="font-black text-xs uppercase tracking-[0.3em]">Wczytywanie profilu...</p>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-2 sm:px-4 py-4 sm:py-8 space-y-6 sm:space-y-8 animate-in fade-in zoom-in-95 duration-700 text-sm selection:bg-sky-500/30 relative [scrollbar-gutter:stable]" style={{ scrollbarGutter: 'stable' }}>
      
      {/* 1. SEKCJA HEADER */}
      <div className={`bg-slate-900/80 backdrop-blur-3xl border border-slate-800 rounded-[2rem] sm:rounded-[3rem] p-5 sm:p-8 flex flex-col lg:flex-row items-center gap-6 sm:gap-8 shadow-2xl relative overflow-hidden lg:min-h-[200px] ${isGuest ? 'blur-md grayscale pointer-events-none select-none' : ''}`}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/10 rounded-full blur-[100px] pointer-events-none -translate-y-1/2 translate-x-1/3"></div>
        <div className="relative group shrink-0">
          <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-slate-800 p-1.5 bg-slate-950 overflow-hidden shadow-2xl relative z-10">
            {avatarUrl ? <img src={avatarUrl} className="w-full h-full object-cover rounded-full" alt="Avatar" /> : <div className="w-full h-full flex items-center justify-center text-slate-700 bg-slate-900 rounded-full"><User size={48} /></div>}
          </div>
          <button onClick={() => !isGuest && fileInputRef.current.click()} className="absolute bottom-0 right-0 bg-sky-500 p-2 sm:p-3 rounded-xl sm:rounded-2xl border-2 sm:border-4 border-slate-900 text-slate-950 hover:bg-white hover:scale-110 transition-all z-20 shadow-lg">
            <Camera size={16}/>
          </button>
          <input type="file" ref={fileInputRef} onChange={(e) => { const f = e.target.files[0]; if(f) { const r = new FileReader(); r.onloadend = () => onAvatarChange(r.result); r.readAsDataURL(f); } }} className="hidden" accept="image/*" />
        </div>
        <div className="flex-grow space-y-2 text-center lg:text-left relative z-10 min-w-0">
          <h2 className="text-2xl sm:text-4xl font-black uppercase italic text-white tracking-tighter">
            {formData.firstName || formData.lastName ? `${formData.firstName} ${formData.lastName}` : "Brak Tożsamości"}
          </h2>
          <p className="text-slate-500 font-medium max-w-xl mx-auto lg:mx-0 text-xs sm:text-sm">
            {formData.bio || "Uzupełnij bio w ustawieniach, aby spersonalizować profil."}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:gap-3 shrink-0 relative z-10 w-full lg:w-auto text-center font-black">
            <div className="bg-slate-950/50 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-800"><Dumbbell size={18} className="text-sky-500 mb-1 mx-auto"/><p className="text-[8px] sm:text-[9px] text-slate-500 uppercase tracking-widest">Treningi</p><p className="text-lg text-white">{formData.trainingDays.length} / Tydz</p></div>
            <div className="bg-slate-950/50 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-800"><Droplets size={18} className="text-sky-500 mb-1 mx-auto"/><p className="text-[8px] sm:text-[9px] text-slate-500 uppercase tracking-widest">Woda Cel</p><p className="text-lg text-white">{stats.water} L</p></div>
        </div>
      </div>

      {/* 2. NAWIGACJA */}
      <div className={`flex flex-wrap justify-center gap-1 sm:gap-2 p-1 sm:p-1.5 bg-slate-900/60 border border-slate-800 rounded-xl sm:rounded-2xl w-full sm:w-fit mx-auto backdrop-blur-xl ${isGuest ? 'blur-md pointer-events-none' : ''}`}>
        {[
          { id: 'dashboard', icon: Activity, label: 'Dashboard' }, 
          { id: 'settings', icon: Settings, label: 'Fizyczne' }, 
          { id: 'preferences', icon: Target, label: 'Plan & Dieta' }, 
          { id: 'measurements', icon: Ruler, label: 'Pomiary' },
          { id: 'achievements', icon: Medal, label: 'Osiągnięcia' }
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} className={`flex items-center justify-center gap-1.5 px-3 py-2.5 sm:px-6 sm:py-3 rounded-lg sm:rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all duration-300 flex-grow sm:flex-grow-0 ${activeTab === t.id ? 'bg-white text-slate-950 shadow-xl' : 'text-slate-500 hover:text-white hover:bg-slate-800'}`}>{t.label}</button>
        ))}
      </div>

      <div className={`w-full space-y-6 sm:space-y-8 ${isGuest ? 'blur-md pointer-events-none select-none' : ''}`}>
        <div className="w-full space-y-6">
          {activeTab === 'dashboard' && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-[2rem] p-5 sm:p-8 shadow-xl space-y-6 animate-in slide-in-from-left-8 duration-500 lg:min-h-[560px] flex flex-col">
              <h3 className="text-xs sm:text-sm font-black uppercase text-white tracking-widest border-b border-slate-800 pb-4">Dashboard</h3>
              <div className="grid grid-cols-2 gap-4 flex-grow">
                <div className="bg-slate-950/40 border border-slate-800 rounded-[1.5rem] p-5 sm:p-6 shadow-xl">
                  <h4 className="text-[10px] sm:text-xs font-black text-white uppercase tracking-widest flex items-center gap-2 mb-4"><HeartPulse className="text-rose-500 w-4 h-4"/> Stan Organizmu</h4>
                  <div className="flex justify-between items-end mb-2"><span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">BMI</span><span className="text-xl font-black text-white italic">{stats.bmi}</span></div>
                  <div className="relative h-2.5 w-full bg-slate-950 rounded-full border border-slate-800 flex overflow-hidden">
                    <div className="h-full bg-sky-500" style={{ width: '25%' }}></div>
                    <div className="h-full bg-emerald-500" style={{ width: '25%' }}></div>
                    <div className="h-full bg-amber-500" style={{ width: '25%' }}></div>
                    <div className="h-full bg-rose-500" style={{ width: '25%' }}></div>
                    <div className="absolute top-0 bottom-0 w-1 bg-white shadow-xl transition-all duration-1000" style={{ 
                      left: `${(() => {
                        const b = parseFloat(stats.bmi) || 0;
                        if (b <= 0) return 0;
                        if (b <= 18.5) return (b / 18.5) * 25;
                        if (b <= 25) return 25 + ((b - 18.5) / (25 - 18.5)) * 25;
                        if (b <= 30) return 50 + ((b - 25) / (30 - 25)) * 25;
                        return Math.min(100, 75 + ((b - 30) / 10) * 25);
                      })()}%` 
                    }}></div>
                  </div>
                  <p className="text-[9px] font-black uppercase mt-2 text-right text-slate-500">Kategoria: {stats.status}</p>
                </div>
                <div className="bg-slate-950/40 border border-slate-800 rounded-[1.5rem] p-5 sm:p-6 shadow-xl flex flex-col items-center justify-center text-center"><Trophy className="text-slate-700 mb-3 w-8 h-8" /><h4 className="text-sm font-black text-white uppercase tracking-widest mb-1">Twój Progres</h4><p className="text-[10px] text-slate-500 font-medium leading-relaxed italic">AI potrzebuje min. 3 sesji w tygodniu do analizy.</p></div>
                <div className="bg-slate-950/40 border border-slate-800 rounded-[1.5rem] p-5 sm:p-6 shadow-xl space-y-6 relative overflow-hidden col-span-2">
                  <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"><Brain size={80} /></div>
                  <h3 className="text-[10px] font-black uppercase text-sky-500 tracking-[0.2em] flex items-center gap-2"><PieChart size={14}/> AI Core Engine</h3>
                  <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 text-center">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Target Kaloryczny</p>
                    <div className="flex justify-center items-end gap-1">
                      <span className="text-4xl font-black text-white italic">{stats.tdee}</span>
                      <span className="text-[10px] font-bold text-slate-500 mb-1">Kcal</span>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <MacroBar label="Białko" grams={stats.macros.p} pct={stats.macros.pPct} color="bg-sky-500" />
                    <MacroBar label="Tłuszcze" grams={stats.macros.f} pct={stats.macros.fPct} color="bg-amber-500" />
                    <MacroBar label="Węglowodany" grams={stats.macros.c} pct={stats.macros.cPct} color="bg-emerald-500" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-[2rem] p-5 sm:p-8 shadow-xl space-y-6 animate-in slide-in-from-left-8 duration-500 lg:min-h-[560px] flex flex-col">
              <h3 className="text-xs sm:text-sm font-black uppercase text-white tracking-widest border-b border-slate-800 pb-4">Dane Fizyczne</h3>
              <div className="grid grid-cols-2 gap-4 flex-grow">
                <Input text="Imię" val={formData.firstName} onChange={(e)=>setFormData({...formData, firstName: e.target.value})} />
                <Input text="Nazwisko" val={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} />
                <Input text="Wiek" type="number" val={formData.age} onChange={(e)=>setFormData({...formData, age: e.target.value})} />
                <Input text="Waga (kg)" type="number" val={formData.weight} onChange={(e)=>setFormData({...formData, weight: e.target.value})} />
                <Input text="Wzrost (cm)" type="number" val={formData.height} onChange={(e)=>setFormData({...formData, height: e.target.value})} />
                <div className="hidden sm:block"></div>
                <div className="col-span-2">
                  <Select label="Płeć" val={formData.gender} onChange={(e)=>setFormData({...formData, gender: e.target.value})} options={['Mężczyzna', 'Kobieta']} />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-2">Bio</label>
                  <textarea value={formData.bio} onChange={(e)=>setFormData({...formData, bio: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white font-bold outline-none resize-none h-24" />
                </div>
              </div>
              <SaveButton saveProfileData={saveProfileData} saveState={saveState} />
            </div>
          )}

          {activeTab === 'preferences' && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-[2rem] p-5 sm:p-8 shadow-xl space-y-6 animate-in slide-in-from-left-8 duration-500 lg:min-h-[560px] flex flex-col">
              <h3 className="text-xs sm:text-sm font-black uppercase text-white tracking-widest border-b border-slate-800 pb-4">Plan & Dieta</h3>
              <div className="grid grid-cols-2 gap-4">
                <Select label="Cel" val={formData.goal} onChange={(e)=>setFormData({...formData, goal: e.target.value})} options={['Masa', 'Redukcja', 'Siła']} />
                <Select label="Dieta" val={formData.diet} onChange={(e)=>setFormData({...formData, diet: e.target.value})} options={['Zbilansowana', 'Wysokobiałkowa', 'Keto']} />
              </div>
              <div className="space-y-3 pt-4 border-t border-slate-800 flex-grow">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-2">Dni Treningowe</label>
                <div className="flex flex-wrap gap-2">{['Pon', 'Wt', 'Śr', 'Czw', 'Pią', 'Sob', 'Ndz'].map(day => (<button key={day} onClick={() => toggleDay(day)} className={`px-3 py-2.5 rounded-lg font-black text-[10px] transition-all border-2 flex-grow text-center ${formData.trainingDays.includes(day) ? 'bg-sky-500 border-sky-500 text-slate-950' : 'bg-slate-950 border-slate-800 text-slate-500'}`}>{day}</button>))}</div>
              </div>
              <SaveButton saveProfileData={saveProfileData} saveState={saveState} />
            </div>
          )}

          {activeTab === 'measurements' && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-[2rem] p-5 sm:p-8 shadow-xl space-y-6 animate-in slide-in-from-left-8 duration-500 lg:min-h-[560px] flex flex-col">
              <h3 className="text-xs sm:text-sm font-black uppercase text-white tracking-widest border-b border-slate-800 pb-4">Pomiary</h3>
              <div className="grid grid-cols-2 gap-4 flex-grow">
                {['chest', 'arm', 'waist', 'thigh'].map(m => (
                  <div key={m} className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-2 uppercase">
                      {m === 'chest' ? 'Klatka' : m === 'arm' ? 'Biceps' : m === 'waist' ? 'Talia' : 'Udo'}
                    </label>
                    <input type="number" value={formData.measurements?.[m] || ''} onChange={(e) => setFormData({...formData, measurements: { ...formData.measurements, [m]: e.target.value }})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-3 text-white font-black text-center outline-none" placeholder="--" />
                  </div>
                ))}
              </div>
              <SaveButton saveProfileData={saveProfileData} saveState={saveState}/>
            </div>
          )}

          {activeTab === 'achievements' && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-[2rem] p-5 sm:p-8 shadow-xl animate-in slide-in-from-left-8 duration-500 lg:min-h-[560px]">
              <div className="flex items-center gap-4 mb-8 border-b border-slate-800 pb-6">
                <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/20"><Award className="text-amber-500 w-6 h-6" /></div>
                <div><h3 className="text-xl font-black uppercase italic text-white tracking-tighter">Księga Wyzwań AI</h3></div>
              </div>
              <div className="grid grid-cols-1 gap-4">
                {ACHIEVEMENTS_LIST.map(ach => (
                  <div key={ach.id} ref={el => { if (el) achRefs.current[ach.id] = el; }} className={`p-4 rounded-[1.5rem] border transition-all duration-700 flex flex-col sm:flex-row gap-4 ${highlightedAch === ach.id ? 'ring-2 ring-sky-500 bg-sky-500/10 border-sky-500' : 'bg-slate-950/40 border-slate-800'} ${!ach.unlocked && 'opacity-60'}`}>
                    <div className={`shrink-0 p-4 w-fit h-fit rounded-xl bg-slate-900 border border-slate-800 ${ach.unlocked ? ach.color : 'text-slate-700'}`}>{ach.unlocked ? ach.icon : <Lock size={20}/>}</div>
                    <div>
                      <h4 className="text-base font-black uppercase italic text-white tracking-wider mb-1">{ach.title}</h4>
                      <p className="text-xs text-slate-400 mb-3">{ach.desc}</p>
                      <div className="bg-black/40 rounded-xl px-4 py-2 border border-slate-800/50 inline-flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase"><Target size={12} className="text-sky-500" /> Cel: {ach.req}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const SaveButton = ({ saveProfileData, saveState, btnColor = "bg-sky-500" }) => (
  <button 
    onClick={saveProfileData} 
    disabled={saveState === 'saving'} 
    className={`w-full mt-4 ${saveState === 'success' ? 'bg-emerald-500 text-white' : saveState === 'error' ? 'bg-rose-500 text-white' : `${btnColor} text-slate-950`} px-8 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 shadow-lg`}
  >
    {saveState === 'saving' ? <Loader2 size={16} className="animate-spin" /> : saveState === 'success' ? <CheckCircle2 size={16} /> : saveState === 'error' ? <AlertCircle size={16} /> : <Save size={16} />}
    {saveState === 'saving' ? 'Synchronizacja...' : saveState === 'success' ? 'Dane Zapisane' : saveState === 'error' ? 'Błąd zapisu' : 'Zapisz zmiany'}
  </button>
);

const Input = ({ text, val, onChange, type = "text" }) => (
  <div className="space-y-1.5">
    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-2">{text}</label>
    <input type={type} value={val} onChange={onChange} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white font-bold outline-none focus:border-sky-500 transition-all" />
  </div>
);

const Select = ({ label, val, onChange, options }) => (
  <div className="space-y-1.5">
    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-2">{label}</label>
    <select value={val} onChange={onChange} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white font-bold outline-none cursor-pointer">
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  </div>
);

const MacroBar = ({ label, grams, pct, color }) => (
  <div className="space-y-1.5">
    <div className="flex justify-between items-end">
      <span className="text-[9px] font-black text-slate-400 uppercase">{label}</span>
      <div className="text-right">
        <span className="text-sm font-black text-white">{grams}g</span>
        <span className="text-[8px] font-bold text-slate-500 ml-1">({pct}%)</span>
      </div>
    </div>
    <div className="w-full h-1.5 bg-slate-950 border border-slate-800 rounded-full overflow-hidden flex">
      <div className={`h-full ${color} transition-all duration-1000`} style={{ width: `${pct}%` }}></div>
    </div>
  </div>
);

export default UserProfile;
