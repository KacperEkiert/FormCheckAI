import React, { useEffect, useState, useRef } from 'react';
import { 
  User, Settings, Camera, Trophy, Loader2, Save, Ruler, Target, 
  Brain, ShieldCheck, Activity, Droplets, 
  Dumbbell, HeartPulse, PieChart, Info, CheckCircle2, AlertCircle, ShieldAlert,
  Medal, Lock, Award, Zap, Timer, Crown
} from 'lucide-react';
import { supabase } from './supabaseClient';

// --- KONFIGURACJA SYSTEMU ---
const DEFAULT_FORM_DATA = {
  firstName: '', lastName: '', age: '25', weight: '75', height: '180',
  gender: 'Mężczyzna', goal: 'Masa', activityLevel: 'Moderowany',
  experience: 'Początkujący', diet: 'Zbilansowana', equipment: 'Siłownia',
  trainingDays: ['Pon', 'Śr', 'Pią'], bio: '',
  measurements: { chest: '', arm: '', waist: '', thigh: '' }
};

const DEFAULT_STATS = {
  bmi: '0.0', bmr: 0, tdee: 0, water: 0, status: 'Oczekiwanie', 
  macros: { p: 0, f: 0, c: 0, pPct: 0, fPct: 0, cPct: 0 }
};

// --- ZSYNCHRONIZOWANA LISTA OSIĄGNIĘĆ ---
const ACHIEVEMENTS_LIST = [
  { 
    id: "001", 
    title: "Król Przysiadów", 
    desc: "Twoja technika przysiadu osiągnęła poziom elitarny. Głębokość i stabilność są perfekcyjne.", 
    req: "Wykonaj 10 powtórzeń z kątem kolan poniżej 100° przy pełnej kontroli.", 
    icon: <Zap size={20}/>, 
    color: "text-sky-400", 
    unlocked: true 
  },
  { 
    id: "002", 
    title: "Twardy jak Diament", 
    desc: "Niezłomna wytrzymałość i nienaganna forma podczas długich serii.", 
    req: "Wykonaj 50 powtórzeń z oceną techniki powyżej 90%.", 
    icon: <ShieldCheck size={20}/>, 
    color: "text-emerald-400", 
    unlocked: false 
  },
  { 
    id: "003", 
    title: "Łamacz Desek", 
    desc: "Twój korpus jest ze stali. Izometryczna siła, której nic nie złamie.", 
    req: "Utrzymaj idealną linię kręgosłupa w pozycji deski (plank) przez 3 minuty.", 
    icon: <Droplets size={20}/>, 
    color: "text-blue-400", 
    unlocked: false 
  },
  { 
    id: "004", 
    title: "Cyber-Wykrok", 
    desc: "Doskonała koordynacja i balans podczas dynamicznych wykroków.", 
    req: "Ukończ serię wykroków bez utraty osiowości kolan i bioder.", 
    icon: <Timer size={20}/>, 
    color: "text-purple-400", 
    unlocked: false 
  },
  { 
    id: "005", 
    title: "Wspinaczka na Szczyt", 
    desc: "Konsekwentny progres i dążenie do doskonałości w każdym aspekcie treningu.", 
    req: "Zdobądź łączną ocenę formy 100/100 w 5 różnych ćwiczeniach.", 
    icon: <Crown size={20}/>, 
    color: "text-amber-400", 
    unlocked: false 
  },
  { 
    id: "006", 
    title: "Generał Barków", 
    desc: "Potężne i stabilne barki. Twoja siła wyciskania budzi respekt.", 
    req: "Wykonaj pełną serię wyciskania nad głowę z idealnym torem ruchu.", 
    icon: <Activity size={20}/>, 
    color: "text-rose-400", 
    unlocked: false 
  },
  { 
    id: "007", 
    title: "Stalowe Bicepsy", 
    desc: "Maksymalna izolacja i pełne napięcie mięśniowe podczas uginania ramion.", 
    req: "Wykonaj 15 powtórzeń bez używania pędu ciała (cheatingu).", 
    icon: <ShieldCheck size={20}/>, 
    color: "text-orange-400", 
    unlocked: false 
  }
];

const UserProfile = ({ avatarUrl, onAvatarChange, isGuest, onLogin, initialAchievementId }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [saveState, setSaveState] = useState('idle');
  const [highlightedAch, setHighlightedAch] = useState(null);
  
  const [formData, setFormData] = useState(DEFAULT_FORM_DATA);
  const [stats, setStats] = useState(DEFAULT_STATS);
  const fileInputRef = useRef(null);
  const achRefs = useRef({});

  // --- PANCERNA LOGIKA PRZENOSZENIA DO OSIĄGNIĘĆ ---
  useEffect(() => {
    if (initialAchievementId && !loading) {
      setActiveTab('achievements');
      setHighlightedAch(initialAchievementId);
      
      const attemptScroll = (retryCount = 0) => {
        const targetElement = achRefs.current[initialAchievementId];
        if (targetElement) {
          targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else if (retryCount < 5) {
          setTimeout(() => attemptScroll(retryCount + 1), 100);
        }
      };
      const timer = setTimeout(() => attemptScroll(), 500);
      return () => clearTimeout(timer);
    }
  }, [initialAchievementId, loading]);

  // --- ENGINE OBLICZENIOWY ---
  const runDiagnostics = React.useCallback((data) => {
    const w = parseFloat(data.weight) || 75;
    const h = parseFloat(data.height) || 180;
    const a = parseFloat(data.age) || 25;
    const bmiVal = parseFloat((w / Math.pow(h / 100, 2)).toFixed(1));
    let status = 'Norma';
    if (bmiVal < 18.5) status = 'Niedowaga';
    else if (bmiVal > 25 && bmiVal <= 30) status = 'Nadwaga';
    else if (bmiVal > 30) status = 'Otyłość';

    let bmrVal = (10 * w) + (6.25 * h) - (5 * a);
    bmrVal = data.gender === 'Mężczyzna' ? bmrVal + 5 : bmrVal - 161;
    const multipliers = { 'Minimalny': 1.2, 'Niski': 1.375, 'Moderowany': 1.55, 'Wysoki': 1.725, 'Ekstremalny': 1.9 };
    const tdeeVal = Math.round(bmrVal * (multipliers[data.activityLevel] || 1.2));
    let targetKcal = tdeeVal;
    if (data.goal === 'Masa') targetKcal += 350;
    if (data.goal === 'Redukcja') targetKcal -= 500;
    const waterIntake = (w * 0.035 + (data.trainingDays.length * 0.1)).toFixed(1);

    // Makroskładniki z uwzględnieniem diety
    let pGrams = Math.round(w * 2.2);
    let fGrams = Math.round(w * 1.0);
    
    if (data.diet === 'Keto') {
      let targetKcalKeto = targetKcal;
      pGrams = Math.round((targetKcalKeto * 0.25) / 4);
      fGrams = Math.round((targetKcalKeto * 0.70) / 9);
      let cGrams = Math.round((targetKcalKeto * 0.05) / 4);
      return returnStatsObj(bmiVal, bmrVal, targetKcalKeto, status, waterIntake, pGrams, fGrams, cGrams);
    } 
    
    if (data.diet === 'Wysokobiałkowa') pGrams = Math.round(w * 2.6);
    
    const pKcal = pGrams * 4;
    const fKcal = fGrams * 9;
    let cKcal = targetKcal - pKcal - fKcal;
    let cGrams = Math.max(0, Math.round(cKcal / 4));

    return returnStatsObj(bmiVal, bmrVal, targetKcal, status, waterIntake, pGrams, fGrams, cGrams);
  }, []);

  const returnStatsObj = (bmi, bmr, tdee, status, water, p, f, c) => {
    const totalKcal = (p * 4) + (f * 9) + (c * 4);
    return {
      bmi: bmi.toFixed(1), bmr: Math.round(bmr), tdee: tdee, status, water: water,
      macros: { 
        p: p, f: f, c: c, 
        pPct: Math.round(((p * 4) / totalKcal) * 100) || 0,
        fPct: Math.round(((f * 9) / totalKcal) * 100) || 0,
        cPct: Math.round(((c * 4) / totalKcal) * 100) || 0 
      }
    };
  };

  useEffect(() => {
    const initSystem = async () => {
      if (isGuest) {
        setFormData(DEFAULT_FORM_DATA);
        setStats(runDiagnostics(DEFAULT_FORM_DATA));
        setLoading(false);
        return;
      }

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUser(user);
          const { data: profile } = await supabase.from('profiles').select('payload').eq('id', user.id).single();
          let parsedData = profile?.payload || JSON.parse(localStorage.getItem(`profile_data_${user.id}`) || '{}');
          const merged = {
            ...DEFAULT_FORM_DATA,
            ...parsedData,
            measurements: { ...DEFAULT_FORM_DATA.measurements, ...(parsedData.measurements || {}) },
            trainingDays: parsedData.trainingDays || DEFAULT_FORM_DATA.trainingDays
          };
          setFormData(merged);
          setStats(runDiagnostics(merged));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    initSystem();
  }, [isGuest, runDiagnostics]);

  const saveProfileData = async () => {
    if (isGuest) return;
    setSaveState('saving');
    const cleanData = {
      ...formData,
      age: Math.max(13, parseInt(formData.age) || 25).toString(),
      weight: Math.max(30, parseFloat(formData.weight) || 75).toString(),
      height: Math.max(100, parseFloat(formData.height) || 180).toString(),
      measurements: {
        chest: formData.measurements.chest ? Math.max(0, parseFloat(formData.measurements.chest)).toString() : '',
        arm: formData.measurements.arm ? Math.max(0, parseFloat(formData.measurements.arm)).toString() : '',
        waist: formData.measurements.waist ? Math.max(0, parseFloat(formData.measurements.waist)).toString() : '',
        thigh: formData.measurements.thigh ? Math.max(0, parseFloat(formData.measurements.thigh)).toString() : '',
      }
    };

    try {
      const { error } = await supabase.from('profiles').upsert({ id: user?.id, payload: cleanData, updated_at: new Date().toISOString() });
      if (error) throw error;
      localStorage.setItem(`profile_data_${user?.id}`, JSON.stringify(cleanData));
      setFormData(cleanData);
      setStats(runDiagnostics(cleanData));
      setSaveState('success');
      setTimeout(() => setSaveState('idle'), 3000);
    } catch (e) {
      console.error(e);
      setSaveState('error');
      setTimeout(() => setSaveState('idle'), 3000);
    }
  };

  const toggleDay = (day) => {
    if (isGuest) return;
    const days = formData.trainingDays.includes(day) ? formData.trainingDays.filter(d => d !== day) : [...formData.trainingDays, day];
    setFormData({...formData, trainingDays: days});
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[60vh] space-y-6 animate-pulse text-sky-500">
      <Loader2 className="animate-spin" size={48} />
      <p className="font-black text-xs uppercase tracking-[0.3em]">Wczytywanie profilu...</p>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 animate-in fade-in zoom-in-95 duration-700 text-sm selection:bg-sky-500/30 relative">
      
      {/* 1. SEKCJA HEADER */}
      <div className={`bg-slate-900/80 backdrop-blur-3xl border border-slate-800 rounded-[3rem] p-8 flex flex-col xl:flex-row items-center gap-8 shadow-2xl relative overflow-hidden ${isGuest ? 'blur-md grayscale pointer-events-none select-none' : ''}`}>
        <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/10 rounded-full blur-[100px] pointer-events-none -translate-y-1/2 translate-x-1/3"></div>
        <div className="relative group shrink-0">
          <div className="w-32 h-32 rounded-full border-4 border-slate-800 p-1.5 bg-slate-950 overflow-hidden shadow-2xl relative z-10">
            {avatarUrl ? <img src={avatarUrl} className="w-full h-full object-cover rounded-full" alt="Avatar" /> : <div className="w-full h-full flex items-center justify-center text-slate-700 bg-slate-900 rounded-full"><User size={48} /></div>}
          </div>
          <button onClick={() => !isGuest && fileInputRef.current.click()} className="absolute bottom-0 right-0 bg-sky-500 p-3 rounded-2xl border-4 border-slate-900 text-slate-950 hover:bg-white hover:scale-110 transition-all z-20 shadow-lg">
            <Camera size={18}/>
          </button>
          <input type="file" ref={fileInputRef} onChange={(e) => { const f = e.target.files[0]; if(f) { const r = new FileReader(); r.onloadend = () => onAvatarChange(r.result); r.readAsDataURL(f); } }} className="hidden" accept="image/*" />
        </div>
        <div className="flex-grow space-y-3 text-center xl:text-left relative z-10">
          <div className="flex flex-wrap justify-center xl:justify-start gap-2">
            <span className="px-3 py-1 bg-sky-500 text-slate-950 text-[9px] font-black uppercase tracking-widest rounded-md shadow-lg">Athlete Pro</span>
            <span className="px-3 py-1 bg-slate-800 text-slate-300 text-[9px] font-black uppercase tracking-widest rounded-md border border-slate-700">{formData.experience}</span>
          </div>
          <h2 className="text-4xl font-black uppercase italic text-white tracking-tighter">{formData.firstName || formData.lastName ? `${formData.firstName} ${formData.lastName}` : "Brak Tożsamości"}</h2>
          <p className="text-slate-500 font-medium max-w-xl mx-auto xl:mx-0">{formData.bio || "Uzupełnij bio w ustawieniach, aby spersonalizować profil."}</p>
        </div>
        <div className="grid grid-cols-2 gap-3 shrink-0 relative z-10 w-full xl:w-auto text-center font-black">
            <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800"><Dumbbell size={20} className="text-sky-500 mb-2 mx-auto"/><p className="text-[9px] text-slate-500 uppercase tracking-widest">Treningi</p><p className="text-xl text-white">{formData.trainingDays.length} / Tydz</p></div>
            <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800"><Droplets size={20} className="text-sky-500 mb-2 mx-auto"/><p className="text-[9px] text-slate-500 uppercase tracking-widest">Woda Cel</p><p className="text-xl text-white">{stats.water} L</p></div>
        </div>
      </div>

      {/* 2. NAWIGACJA */}
      <div className={`flex flex-wrap justify-center gap-2 p-1.5 bg-slate-900/60 border border-slate-800 rounded-2xl w-fit mx-auto backdrop-blur-xl ${isGuest ? 'blur-md pointer-events-none' : ''}`}>
        {[
          { id: 'dashboard', icon: Activity, label: 'Dashboard' }, 
          { id: 'settings', icon: Settings, label: 'Dane Fizyczne' }, 
          { id: 'preferences', icon: Target, label: 'Plan & Dieta' }, 
          { id: 'measurements', icon: Ruler, label: 'Pomiary' },
          { id: 'achievements', icon: Medal, label: 'Osiągnięcia' }
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${activeTab === t.id ? 'bg-white text-slate-950 shadow-xl scale-105' : 'text-slate-500 hover:text-white hover:bg-slate-800'}`}><t.icon size={14} /> {t.label}</button>
        ))}
      </div>

      {/* GUEST OVERLAY */}
      {isGuest && (
        <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center p-8 text-center bg-slate-950/10 backdrop-blur-sm rounded-[3rem]">
          <div className="bg-slate-900/90 border-2 border-sky-500/50 p-10 rounded-[3rem] shadow-[0_0_100px_rgba(0,0,0,0.8)] max-w-lg animate-in zoom-in duration-500">
            <div className="bg-sky-500 p-5 rounded-3xl mb-6 shadow-[0_0_30px_rgba(14,165,233,0.5)] inline-block">
              <ShieldAlert className="text-slate-950" size={32} />
            </div>
            <h2 className="text-4xl font-black uppercase italic text-white mb-4 tracking-tighter">Profil Zablokowany</h2>
            <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-xs leading-relaxed mb-8 italic">Zaloguj się, aby odblokować zaawansowane statystyki AI, dziennik pomiarów oraz personalizację treningów.</p>
            <button 
              onClick={onLogin}
              className="w-full bg-sky-500 text-slate-950 px-12 py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-sky-400 hover:scale-105 transition-all active:scale-95 shadow-xl flex items-center justify-center gap-3"
            >
              Zaloguj się teraz <Target size={18} />
            </button>
          </div>
        </div>
      )}

      <div className={`grid grid-cols-1 lg:grid-cols-3 gap-8 ${isGuest ? 'blur-md pointer-events-none select-none' : ''}`}>
        <div className="lg:col-span-2 space-y-6">
          {activeTab === 'dashboard' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-left-8 duration-500">
              <div className="bg-slate-900/60 border border-slate-800 rounded-[2rem] p-8 shadow-xl">
                <h4 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2 mb-6"><HeartPulse className="text-rose-500"/> Stan Organizmu</h4>
                <div className="flex justify-between items-end mb-2"><span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">BMI</span><span className="text-2xl font-black text-white italic">{stats.bmi}</span></div>
                <div className="relative h-3 w-full bg-slate-950 rounded-full border border-slate-800 flex overflow-hidden">
                  <div className="h-full bg-sky-500" style={{ width: '18.5%' }}></div><div className="h-full bg-emerald-500" style={{ width: '6.5%' }}></div><div className="h-full bg-amber-500" style={{ width: '5%' }}></div><div className="h-full bg-rose-500" style={{ width: '70%' }}></div>
                  <div className="absolute top-0 bottom-0 w-1 bg-white shadow-xl transition-all duration-1000" style={{ left: `${Math.min(100, (parseFloat(stats.bmi) / 40) * 100)}%` }}></div>
                </div>
                <p className="text-[10px] font-black uppercase mt-2 text-right text-slate-500">Kategoria: {stats.status}</p>
              </div>
              <div className="bg-slate-900/60 border border-slate-800 rounded-[2rem] p-8 shadow-xl flex flex-col items-center text-center"><Trophy size={40} className="text-slate-700 mb-4" /><h4 className="font-black text-white uppercase tracking-widest mb-2">Twój Progres</h4><p className="text-xs text-slate-500 font-medium leading-relaxed italic">AI potrzebuje min. 3 sesji w tygodniu do analizy biomechanicznej.</p></div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-[3rem] p-8 xl:p-10 shadow-xl space-y-8 animate-in slide-in-from-left-8 duration-500">
              <HeaderZapisz title="Dane Fizyczne" saveProfileData={saveProfileData} saveState={saveState} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input text="Imię" val={formData.firstName} onChange={(e)=>setFormData({...formData, firstName: e.target.value})} />
                <Input text="Wiek" type="number" val={formData.age} onChange={(e)=>setFormData({...formData, age: e.target.value})} />
                <Input text="Waga (kg)" type="number" val={formData.weight} onChange={(e)=>setFormData({...formData, weight: e.target.value})} />
                <Input text="Wzrost (cm)" type="number" val={formData.height} onChange={(e)=>setFormData({...formData, height: e.target.value})} />
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Płeć</label>
                  <select value={formData.gender} onChange={(e)=>setFormData({...formData, gender: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white font-bold outline-none cursor-pointer">
                    <option value="Mężczyzna">Mężczyzna</option>
                    <option value="Kobieta">Kobieta</option>
                  </select>
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Bio</label>
                  <textarea value={formData.bio} onChange={(e)=>setFormData({...formData, bio: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white font-bold outline-none resize-none h-24" />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'preferences' && (
             <div className="bg-slate-900/60 border border-slate-800 rounded-[3rem] p-8 xl:p-10 shadow-xl space-y-8 animate-in slide-in-from-left-8 duration-500">
               <HeaderZapisz title="Plan & Dieta" saveProfileData={saveProfileData} saveState={saveState} />
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <Select label="Cel" val={formData.goal} onChange={(e)=>setFormData({...formData, goal: e.target.value})} options={['Masa', 'Redukcja', 'Siła']} />
                 <Select label="Dieta" val={formData.diet} onChange={(e)=>setFormData({...formData, diet: e.target.value})} options={['Zbilansowana', 'Wysokobiałkowa', 'Keto']} />
               </div>
               <div className="space-y-4 pt-4 border-t border-slate-800">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Dni Treningowe</label>
                  <div className="flex flex-wrap gap-3">{['Pon', 'Wt', 'Śr', 'Czw', 'Pią', 'Sob', 'Ndz'].map(day => (<button key={day} onClick={() => toggleDay(day)} className={`px-5 py-3 rounded-xl font-black text-[11px] transition-all border-2 ${formData.trainingDays.includes(day) ? 'bg-sky-500 border-sky-500 text-slate-950' : 'bg-slate-950 border-slate-800 text-slate-500'}`}>{day}</button>))}</div>
               </div>
             </div>
          )}

          {activeTab === 'measurements' && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-[3rem] p-8 xl:p-10 shadow-xl space-y-8 animate-in slide-in-from-left-8 duration-500">
              <HeaderZapisz title="Pomiary" saveProfileData={saveProfileData} saveState={saveState} btnColor="bg-emerald-500" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {['chest', 'arm', 'waist', 'thigh'].map(m => (
                  <div key={m} className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2 uppercase" >
                      {m === 'chest' ? 'Klatka' : m === 'arm' ? 'Biceps' : m === 'waist' ? 'Talia' : 'Udo'}
                    </label>
                    <input type="number" value={formData.measurements?.[m] || ''} onChange={(e) => setFormData({...formData, measurements: { ...formData.measurements, [m]: e.target.value }})} className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white font-black text-lg text-center outline-none" placeholder="--" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'achievements' && (
            <div className="space-y-6">
              <div className="bg-slate-900/60 border border-slate-800 rounded-[3rem] p-8 shadow-xl">
                <div className="flex items-center gap-4 mb-10 border-b border-slate-800 pb-8">
                  <div className="p-4 bg-amber-500/10 rounded-3xl border border-amber-500/20">
                    <Award className="text-amber-500" size={32}/>
                  </div>
                  <div>
                    <h3 className="text-2xl font-black uppercase italic text-white tracking-tighter">Księga Wyzwań AI</h3>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Odblokuj nagrody poprzez trening i dyscyplinę</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-5">
                  {ACHIEVEMENTS_LIST.map(ach => (
                    <div 
                      key={ach.id} 
                      ref={el => { if (el) achRefs.current[ach.id] = el; }}
                      className={`group relative p-6 rounded-[2.5rem] border transition-all duration-700 overflow-hidden ${
                        highlightedAch === ach.id 
                        ? 'ring-4 ring-sky-500 bg-sky-500/15 border-sky-500 scale-[1.02] shadow-[0_0_40px_rgba(14,165,233,0.3)] z-20' 
                        : 'bg-slate-950/40 border-slate-800 hover:border-slate-600'
                      } ${!ach.unlocked && 'opacity-60'}`}
                    >
                      <div className="flex items-start gap-6 relative z-10">
                        <div className={`shrink-0 p-5 rounded-2xl bg-slate-900 border border-slate-800 ${ach.unlocked ? ach.color : 'text-slate-700'}`}>
                          {ach.unlocked ? ach.icon : <Lock size={22}/>}
                        </div>
                        <div className="flex-grow">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className={`text-lg font-black uppercase italic tracking-wider ${ach.unlocked ? 'text-white' : 'text-slate-600'}`}>
                              {ach.title}
                            </h4>
                            {ach.unlocked && <CheckCircle2 size={18} className="text-emerald-500" />}
                          </div>
                          <p className="text-sm text-slate-400 font-medium mb-4 leading-relaxed">{ach.desc}</p>
                          <div className="bg-black/40 rounded-2xl px-5 py-3 border border-slate-800/50 inline-flex items-center gap-3">
                             <Target size={14} className="text-sky-500" />
                             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                               Cel: <span className="text-slate-200">{ach.req}</span>
                             </span>
                          </div>
                        </div>
                      </div>
                      
                      {ach.unlocked && (
                        <div className="absolute -bottom-4 -right-4 opacity-5 pointer-events-none group-hover:scale-125 transition-transform duration-1000 transform rotate-12">
                          {React.cloneElement(ach.icon, { size: 100 })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* KOLUMNA PRAWA (AI ANALYTICS) */}
        <div className="space-y-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-[3rem] p-8 shadow-2xl space-y-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none"><Brain size={120} /></div>
            <h3 className="text-xs font-black uppercase text-sky-500 tracking-[0.3em] flex items-center gap-3 relative z-10"><PieChart size={16}/> AI Core Engine</h3>
            <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 text-center relative overflow-hidden shadow-inner group">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Target Kaloryczny</p>
              <div className="flex justify-center items-end gap-2">
                <span className="text-5xl font-black text-white italic tracking-tighter">{stats.tdee}</span>
                <span className="text-xs font-bold text-slate-500 mb-1.5 uppercase">Kcal</span>
              </div>
            </div>
            <div className="space-y-5">
              <MacroBar label="Białko" grams={stats.macros.p} pct={stats.macros.pPct} color="bg-sky-500" />
              <MacroBar label="Tłuszcze" grams={stats.macros.f} pct={stats.macros.fPct} color="bg-amber-500" />
              <MacroBar label="Węglowodany" grams={stats.macros.c} pct={stats.macros.cPct} color="bg-emerald-500" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-[2rem] p-6 shadow-xl">
             <h4 className="text-[10px] font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2"><ShieldCheck size={14} className="text-sky-500" /> Wnioski Systemu</h4>
             <ul className="space-y-3 text-xs text-slate-400 font-medium italic">
               <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-sky-500 mt-1.5 shrink-0"></div>Zalecane nawodnienie: {stats.water}L/doba</li>
               <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0"></div>Cel: {formData.goal} (Skorygowano makro)</li>
             </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- KOMPONENTY UI ---
const HeaderZapisz = ({ title, saveProfileData, saveState, btnColor = "bg-sky-500" }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
    <h3 className="text-sm font-black uppercase text-white tracking-widest">{title}</h3>
    <button onClick={saveProfileData} disabled={saveState === 'saving'} className={`${saveState === 'success' ? 'bg-emerald-500 text-white' : saveState === 'error' ? 'bg-rose-500 text-white' : `${btnColor} text-slate-950 hover:bg-white`} px-8 py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 shadow-lg w-full sm:w-auto`}>
      {saveState === 'saving' ? <Loader2 size={14} className="animate-spin" /> : saveState === 'success' ? <CheckCircle2 size={14} /> : saveState === 'error' ? <AlertCircle size={14} /> : <Save size={14} />}
      {saveState === 'saving' ? 'Synchro...' : saveState === 'success' ? 'Zapisano' : saveState === 'error' ? 'Błąd' : 'Zapisz'}
    </button>
  </div>
);

const Input = ({ text, val, onChange, type = "text" }) => (
  <div className="space-y-2">
    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">{text}</label>
    <input type={type} value={val} onChange={onChange} className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white font-bold outline-none focus:border-sky-500 transition-all" />
  </div>
);

const Select = ({ label, val, onChange, options }) => (
  <div className="space-y-2">
    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">{label}</label>
    <select value={val} onChange={onChange} className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white font-bold outline-none cursor-pointer">
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  </div>
);

const MacroBar = ({ label, grams, pct, color }) => (
  <div className="space-y-2">
    <div className="flex justify-between items-end">
      <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{label}</span>
      <div className="text-right">
        <span className="text-base font-black text-white">{grams}g</span>
        <span className="text-[9px] font-bold text-slate-500 ml-2">({pct}%)</span>
      </div>
    </div>
    <div className="w-full h-2 bg-slate-950 border border-slate-800 rounded-full overflow-hidden flex">
      <div className={`h-full ${color} shadow-[0_0_10px_currentColor] transition-all duration-1000`} style={{ width: `${pct}%` }}></div>
    </div>
  </div>
);

export default UserProfile;
