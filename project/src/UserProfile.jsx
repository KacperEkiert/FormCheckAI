import React, { useEffect, useState, useRef } from 'react';
import { 
  User, Settings, Flame, Camera, Trophy, Loader2, Save, Ruler, Target, 
  Brain, TrendingUp, Star, ShieldCheck, Activity, Utensils, Droplets, 
  Dumbbell, HeartPulse, PieChart, Info, CheckCircle2, AlertCircle
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

const UserProfile = ({ avatarUrl, onAvatarChange }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [saveState, setSaveState] = useState('idle'); // idle | saving | success | error
  
  const [formData, setFormData] = useState(DEFAULT_FORM_DATA);
  const [stats, setStats] = useState(DEFAULT_STATS);
  const fileInputRef = useRef(null);

  // --- ENGINE OBLICZENIOWY AI ---
  const runDiagnostics = (data) => {
    const w = parseFloat(data.weight) || 75;
    const h = parseFloat(data.height) || 180;
    const a = parseFloat(data.age) || 25;
    
    // BMI
    const bmiVal = parseFloat((w / Math.pow(h / 100, 2)).toFixed(1));
    let status = 'Norma';
    if (bmiVal < 18.5) status = 'Niedowaga';
    else if (bmiVal > 25 && bmiVal <= 30) status = 'Nadwaga';
    else if (bmiVal > 30) status = 'Otyłość';

    // BMR (Mifflin-St Jeor)
    let bmrVal = (10 * w) + (6.25 * h) - (5 * a);
    bmrVal = data.gender === 'Mężczyzna' ? bmrVal + 5 : bmrVal - 161;

    // TDEE
    const multipliers = { 'Minimalny': 1.2, 'Niski': 1.375, 'Moderowany': 1.55, 'Wysoki': 1.725, 'Ekstremalny': 1.9 };
    const tdeeVal = Math.round(bmrVal * (multipliers[data.activityLevel] || 1.2));

    // Kalorie Celowe
    let targetKcal = tdeeVal;
    if (data.goal === 'Masa') targetKcal += 350;
    if (data.goal === 'Redukcja') targetKcal -= 500;

    // Woda (litry)
    const waterIntake = (w * 0.035 + (data.trainingDays.length * 0.1)).toFixed(1);

    // Makroskładniki z uwzględnieniem diety
    let pGrams = Math.round(w * 2.2); // domyślnie 2.2g/kg
    let fGrams = Math.round(w * 1.0); // domyślnie 1.0g/kg
    
    if (data.diet === 'Keto') {
      let cKcal = Math.round(targetKcal * 0.05);
      const cGrams = Math.round(cKcal / 4);
      pGrams = Math.round((targetKcal * 0.25) / 4);
      fGrams = Math.round((targetKcal * 0.70) / 9);
      return returnStatsObj(bmiVal, bmrVal, targetKcal, status, waterIntake, pGrams, fGrams, cGrams);
    } 
    
    if (data.diet === 'Wysokobiałkowa') pGrams = Math.round(w * 2.6);
    
    const pKcal = pGrams * 4;
    const fKcal = fGrams * 9;
    let cKcal = targetKcal - pKcal - fKcal;
    let cGrams = Math.max(0, Math.round(cKcal / 4)); // Zapobieganie ujemnym węglom

    return returnStatsObj(bmiVal, bmrVal, targetKcal, status, waterIntake, pGrams, fGrams, cGrams);
  };

  const returnStatsObj = (bmi, bmr, tdee, status, water, p, f, c) => {
    const totalKcal = (p * 4) + (f * 9) + (c * 4);
    return {
      bmi: bmi.toFixed(1), bmr: Math.round(bmr), tdee, status, water,
      macros: { 
        p, f, c,
        pPct: Math.round(((p * 4) / totalKcal) * 100) || 0,
        fPct: Math.round(((f * 9) / totalKcal) * 100) || 0,
        cPct: Math.round(((c * 4) / totalKcal) * 100) || 0,
      }
    };
  };

  // --- CYKL ŻYCIA I DANE ---
  useEffect(() => {
    const initSystem = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUser(user);
          
          // POBIERANIE Z SUPABASE
          const { data: profile } = await supabase
            .from('profiles')
            .select('payload')
            .eq('id', user.id)
            .single();

          let parsedData = {};
          if (profile?.payload) {
            parsedData = profile.payload;
          } else {
            // Fallback do localStorage jeśli brak w bazie
            const savedData = localStorage.getItem(`profile_data_${user.id}`);
            if (savedData) parsedData = JSON.parse(savedData);
          }
          
          // BEZPIECZNY DEEP MERGE - Ochrona przed undefined
          const merged = {
            ...DEFAULT_FORM_DATA,
            ...parsedData,
            measurements: {
              ...DEFAULT_FORM_DATA.measurements,
              ...(parsedData.measurements || {})
            },
            trainingDays: parsedData.trainingDays || DEFAULT_FORM_DATA.trainingDays
          };

          setFormData(merged);
          setStats(runDiagnostics(merged));
        }
      } catch (err) {
        console.error("Błąd autoryzacji/danych:", err);
      } finally {
        setLoading(false);
      }
    };
    initSystem();
  }, []);

  const saveProfileData = async () => {
    setSaveState('saving');
    
    // Rygorystyczna walidacja i parsowanie
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

    setFormData(cleanData);
    const newStats = runDiagnostics(cleanData);

    // ZAPIS DO SUPABASE
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({ 
          id: user?.id, 
          payload: cleanData, 
          updated_at: new Date().toISOString() 
        });

      if (error) throw error;

      localStorage.setItem(`profile_data_${user?.id}`, JSON.stringify(cleanData));
      setStats(newStats);
      setSaveState('success');
      setTimeout(() => setSaveState('idle'), 3000);
    } catch (e) {
      console.error("Błąd zapisu:", e);
      setSaveState('error');
      setTimeout(() => setSaveState('idle'), 3000);
    }
  };

  const toggleDay = (day) => {
    const days = formData.trainingDays.includes(day) 
      ? formData.trainingDays.filter(d => d !== day)
      : [...formData.trainingDays, day];
    setFormData({...formData, trainingDays: days});
  };

  // --- RENDEROWANIE ---
  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[60vh] space-y-6 animate-pulse">
      <Loader2 className="animate-spin text-sky-500" size={48} />
      <p className="text-slate-400 font-black text-xs uppercase tracking-[0.3em]">Wczytywanie Modułu Pro...</p>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 animate-in fade-in zoom-in-95 duration-700 text-sm selection:bg-sky-500/30">
      
      {/* 1. SEKCJA HEADER: WIZYTÓWKA */}
      <div className="bg-slate-900/80 backdrop-blur-3xl border border-slate-800 rounded-[3rem] p-8 flex flex-col xl:flex-row items-center gap-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden">
        {/* Dekoracyjne tło */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/10 rounded-full blur-[100px] pointer-events-none -translate-y-1/2 translate-x-1/3"></div>

        <div className="relative group shrink-0">
          <div className="w-32 h-32 rounded-full border-4 border-slate-800 p-1.5 bg-slate-950 overflow-hidden shadow-2xl relative z-10">
            {avatarUrl ? (
              <img src={avatarUrl} className="w-full h-full object-cover rounded-full" alt="Avatar" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-700 bg-slate-900 rounded-full"><User size={48} /></div>
            )}
          </div>
          <button onClick={() => fileInputRef.current.click()} className="absolute bottom-0 right-0 bg-sky-500 p-3 rounded-2xl border-4 border-slate-900 text-slate-950 hover:bg-white hover:scale-110 transition-all z-20 shadow-lg">
            <Camera size={18}/>
          </button>
          <input type="file" ref={fileInputRef} onChange={(e) => {
            const f = e.target.files[0];
            if(f) { const r = new FileReader(); r.onloadend = () => onAvatarChange(r.result); r.readAsDataURL(f); }
          }} className="hidden" accept="image/*" />
        </div>

        <div className="flex-grow space-y-3 text-center xl:text-left relative z-10">
          <div className="flex flex-wrap justify-center xl:justify-start gap-2">
            <span className="px-3 py-1 bg-sky-500 text-slate-950 text-[9px] font-black uppercase tracking-widest rounded-md shadow-[0_0_15px_rgba(14,165,233,0.4)]">Athlete Pro</span>
            <span className="px-3 py-1 bg-slate-800 text-slate-300 text-[9px] font-black uppercase tracking-widest rounded-md border border-slate-700">{formData.experience}</span>
          </div>
          <h2 className="text-4xl font-black uppercase italic text-white tracking-tighter">
            {formData.firstName || formData.lastName ? `${formData.firstName} ${formData.lastName}` : "Brak Tożsamości"}
          </h2>
          <p className="text-slate-500 font-medium max-w-xl mx-auto xl:mx-0">{formData.bio || "Uzupełnij bio w ustawieniach, aby spersonalizować profil."}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 shrink-0 relative z-10 w-full xl:w-auto">
            <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800 text-center flex flex-col items-center justify-center">
                <Dumbbell size={20} className="text-sky-500 mb-2"/>
                <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Treningi</p>
                <p className="text-xl font-black text-white">{formData.trainingDays.length} / Tydz</p>
            </div>
            <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800 text-center flex flex-col items-center justify-center">
                <Droplets size={20} className="text-sky-500 mb-2"/>
                <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Woda Cel</p>
                <p className="text-xl font-black text-white">{stats.water} L</p>
            </div>
        </div>
      </div>

      {/* 2. NAWIGACJA GŁÓWNA */}
      <div className="flex flex-wrap justify-center gap-2 p-1.5 bg-slate-900/60 border border-slate-800 rounded-2xl w-fit mx-auto backdrop-blur-xl">
        {[
          { id: 'dashboard', icon: Activity, label: 'Dashboard' },
          { id: 'settings', icon: Settings, label: 'Dane Fizyczne' },
          { id: 'preferences', icon: Target, label: 'Plan & Dieta' },
          { id: 'measurements', icon: Ruler, label: 'Pomiary' }
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${activeTab === t.id ? 'bg-white text-slate-950 shadow-xl scale-105' : 'text-slate-500 hover:text-white hover:bg-slate-800'}`}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* KOLUMNA LEWA: AKTYWNY TAB */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* TAB: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-left-8 duration-500">
              <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-[2rem] p-8 shadow-xl">
                <div className="flex items-center justify-between mb-6">
                  <h4 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2"><HeartPulse className="text-rose-500"/> Stan Organizmu</h4>
                </div>
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between items-end mb-2">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Wskaźnik BMI</span>
                      <span className="text-2xl font-black text-white italic">{stats.bmi}</span>
                    </div>
                    {/* ZAAWANSOWANY WIZUALIZATOR BMI */}
                    <div className="relative h-3 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800 flex">
                      <div className="h-full bg-sky-500" style={{ width: '18.5%' }}></div>
                      <div className="h-full bg-emerald-500" style={{ width: '6.5%' }}></div>
                      <div className="h-full bg-amber-500" style={{ width: '5%' }}></div>
                      <div className="h-full bg-rose-500" style={{ width: '70%' }}></div>
                      {/* Znacznik pozycji BMI */}
                      <div className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_10px_white] transition-all duration-1000" style={{ left: `${Math.min(100, (parseFloat(stats.bmi) / 40) * 100)}%` }}></div>
                    </div>
                    <p className={`text-[10px] font-black uppercase mt-2 text-right ${stats.status === 'Norma' ? 'text-emerald-500' : stats.status === 'Niedowaga' ? 'text-sky-500' : 'text-rose-500'}`}>
                      Kategoria: {stats.status}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-[2rem] p-8 shadow-xl flex flex-col justify-center items-center text-center group hover:border-sky-500/30 transition-colors">
                <Trophy size={40} className="text-slate-700 group-hover:text-amber-500 transition-colors duration-500 mb-4" />
                <h4 className="font-black text-white uppercase tracking-widest mb-2">Twój Progres</h4>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  System potrzebuje więcej danych z Twoich treningów. Wykonaj min. 3 sesje w tym tygodniu, aby AI mogło wygenerować raport biomechaniczny.
                </p>
              </div>
            </div>
          )}

          {/* TAB: USTAWIENIA (Dane fizyczne) */}
          {activeTab === 'settings' && (
            <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-[3rem] p-8 xl:p-10 shadow-xl space-y-8 animate-in slide-in-from-left-8 duration-500">
              <HeaderZapisz title="Dane Fizyczne" saveProfileData={saveProfileData} saveState={saveState} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input text="Imię" val={formData.firstName} onChange={(e)=>setFormData({...formData, firstName: e.target.value})} />
                <Input text="Nazwisko" val={formData.lastName} onChange={(e)=>setFormData({...formData, lastName: e.target.value})} />
                <Input text="Wiek" type="number" val={formData.age} onChange={(e)=>setFormData({...formData, age: e.target.value})} />
                <Input text="Waga (kg)" type="number" val={formData.weight} onChange={(e)=>setFormData({...formData, weight: e.target.value})} />
                <Input text="Wzrost (cm)" type="number" val={formData.height} onChange={(e)=>setFormData({...formData, height: e.target.value})} />
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Płeć</label>
                  <select value={formData.gender} onChange={(e)=>setFormData({...formData, gender: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white font-bold outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all appearance-none cursor-pointer">
                    <option value="Mężczyzna">Mężczyzna</option>
                    <option value="Kobieta">Kobieta</option>
                  </select>
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Krótkie Bio</label>
                  <textarea value={formData.bio} onChange={(e)=>setFormData({...formData, bio: e.target.value})} placeholder="Opisz swoją sportową podróż..." className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white font-bold outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all resize-none h-24" />
                </div>
              </div>
            </div>
          )}

          {/* TAB: PREFERENCJE (Trening i Dieta) */}
          {activeTab === 'preferences' && (
             <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-[3rem] p-8 xl:p-10 shadow-xl space-y-8 animate-in slide-in-from-left-8 duration-500">
               <HeaderZapisz title="Plan & Dieta" saveProfileData={saveProfileData} saveState={saveState} />
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Główny Cel</label>
                    <select value={formData.goal} onChange={(e)=>setFormData({...formData, goal: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white font-bold outline-none cursor-pointer">
                      <option value="Masa">Zbudowanie Masy Mięśniowej</option>
                      <option value="Redukcja">Redukcja Tkanki Tłuszczowej</option>
                      <option value="Siła">Wzrost Siły (Rekompozycja)</option>
                    </select>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Model Żywieniowy</label>
                    <select value={formData.diet} onChange={(e)=>setFormData({...formData, diet: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white font-bold outline-none cursor-pointer">
                      <option value="Zbilansowana">Zbilansowana (Standard)</option>
                      <option value="Wysokobiałkowa">Wysokobiałkowa (Pro)</option>
                      <option value="Keto">Ketogeniczna (Low Carb)</option>
                    </select>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Dostępny Sprzęt</label>
                    <select value={formData.equipment} onChange={(e)=>setFormData({...formData, equipment: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white font-bold outline-none cursor-pointer">
                      <option value="Siłownia">Pełna Siłownia</option>
                      <option value="Hantle">Tylko Hantle / Dom</option>
                      <option value="Kalistenika">Masa Ciała (Kalistenika)</option>
                    </select>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Poziom Doświadczenia</label>
                    <select value={formData.experience} onChange={(e)=>setFormData({...formData, experience: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white font-bold outline-none cursor-pointer">
                      <option value="Początkujący">Początkujący (0-1 lat)</option>
                      <option value="Średniozaawansowany">Średniozaawansowany (1-3 lat)</option>
                      <option value="Zaawansowany">Zaawansowany (3+ lat)</option>
                    </select>
                 </div>
               </div>

               <div className="space-y-4 pt-4 border-t border-slate-800">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Dni Treningowe</label>
                  <div className="flex flex-wrap gap-3">
                    {['Pon', 'Wt', 'Śr', 'Czw', 'Pią', 'Sob', 'Ndz'].map(day => (
                      <button key={day} onClick={() => toggleDay(day)} className={`px-5 py-3 rounded-xl font-black text-[11px] transition-all border-2 ${formData.trainingDays.includes(day) ? 'bg-sky-500 border-sky-500 text-slate-950 shadow-[0_0_15px_rgba(14,165,233,0.3)]' : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700 hover:text-white'}`}>
                        {day}
                      </button>
                    ))}
                  </div>
               </div>
             </div>
          )}

          {/* TAB: POMIARY */}
          {activeTab === 'measurements' && (
            <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-[3rem] p-8 xl:p-10 shadow-xl space-y-8 animate-in slide-in-from-left-8 duration-500">
              <HeaderZapisz title="Dziennik Wymiarów" saveProfileData={saveProfileData} saveState={saveState} btnColor="bg-emerald-500" />
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {['chest', 'arm', 'waist', 'thigh'].map(m => (
                  <div key={m} className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2 flex items-center gap-2" >
                      {m === 'chest' ? 'Klatka' : m === 'arm' ? 'Biceps' : m === 'waist' ? 'Talia' : 'Udo'} <span className="text-slate-700 lowercase text-[8px]">cm</span>
                    </label>
                    <input 
                      type="number" 
                      min="0"
                      value={formData.measurements?.[m] || ''} 
                      onChange={(e) => setFormData({...formData, measurements: { ...formData.measurements, [m]: e.target.value }})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white font-black text-lg text-center outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all placeholder:text-slate-800" 
                      placeholder="--"
                    />
                  </div>
                ))}
              </div>

              <div className="p-5 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 flex items-start gap-4">
                <Info size={20} className="text-emerald-500 shrink-0 mt-0.5" />
                <p className="text-xs text-slate-400 font-medium leading-relaxed">
                  Pomiary obwodów są dokładniejszym wskaźnikiem progresu niż sama waga. Aktualizuj je co 2 tygodnie, rano, przed jedzeniem.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* KOLUMNA PRAWA: AI ANALYTICS ENGINE */}
        <div className="space-y-6">
          
          <div className="bg-slate-900/80 backdrop-blur-3xl border border-slate-800 rounded-[3rem] p-8 shadow-2xl space-y-8 relative overflow-hidden">
            {/* Ozdobnik AI */}
            <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
              <Brain size={120} />
            </div>

            <h3 className="text-xs font-black uppercase text-sky-500 tracking-[0.3em] flex items-center gap-3 relative z-10">
              <PieChart size={16}/> AI Core Engine
            </h3>

            <div className="space-y-6 relative z-10">
              
              {/* Główny licznik Kalorii */}
              <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 text-center shadow-inner relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-b from-sky-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Target Kaloryczny</p>
                <div className="flex justify-center items-end gap-2">
                  <span className="text-5xl font-black text-white italic tracking-tighter">{stats.tdee}</span>
                  <span className="text-xs font-bold text-slate-500 mb-1.5 uppercase">Kcal</span>
                </div>
              </div>

              {/* Dynamiczne Paski Makroskładników */}
              <div className="space-y-5">
                <MacroBar label="Białko" grams={stats.macros.p} pct={stats.macros.pPct} color="bg-sky-500" />
                <MacroBar label="Tłuszcze" grams={stats.macros.f} pct={stats.macros.fPct} color="bg-amber-500" />
                <MacroBar label="Węglowodany" grams={stats.macros.c} pct={stats.macros.cPct} color="bg-emerald-500" />
              </div>

            </div>
          </div>

          {/* Panel Rekomendacji AI */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-[2rem] p-6 shadow-xl">
             <h4 className="text-[10px] font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
               <ShieldCheck size={14} className="text-sky-500" /> Wnioski Systemu
             </h4>
             <ul className="space-y-3 text-xs text-slate-400 font-medium">
               <li className="flex items-start gap-2">
                 <div className="w-1.5 h-1.5 rounded-full bg-sky-500 mt-1.5 shrink-0"></div>
                 Wybrano cel: <strong className="text-white ml-1">{formData.goal}</strong>. Wyliczono {formData.goal === 'Redukcja' ? 'deficyt' : 'nadwyżkę'} kaloryczną.
               </li>
               <li className="flex items-start gap-2">
                 <div className="w-1.5 h-1.5 rounded-full bg-sky-500 mt-1.5 shrink-0"></div>
                 Model żywienia: <strong className="text-white ml-1">{formData.diet}</strong> zdeterminował rozkład makro.
               </li>
               <li className="flex items-start gap-2">
                 <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0"></div>
                 Pamiętaj o nawodnieniu: <strong className="text-white ml-1">{stats.water}L</strong> dziennie.
               </li>
             </ul>
          </div>
          
        </div>
      </div>
    </div>
  );
};

// --- KOMPONENTY POMOCNICZE W CELU CZYSTOŚCI KODU ---

const HeaderZapisz = ({ title, saveProfileData, saveState, btnColor = "bg-sky-500" }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
    <h3 className="text-sm font-black uppercase text-white tracking-widest">{title}</h3>
    <button 
      onClick={saveProfileData} 
      disabled={saveState === 'saving'} 
      className={`${saveState === 'success' ? 'bg-emerald-500 text-white' : saveState === 'error' ? 'bg-rose-500 text-white' : `${btnColor} text-slate-950 hover:bg-white`} px-8 py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 shadow-lg w-full sm:w-auto disabled:opacity-70`}
    >
      {saveState === 'saving' && <Loader2 size={14} className="animate-spin" />}
      {saveState === 'success' && <CheckCircle2 size={14} />}
      {saveState === 'error' && <AlertCircle size={14} />}
      {saveState === 'idle' && <Save size={14} />}
      {saveState === 'saving' ? 'Synchronizacja...' : saveState === 'success' ? 'Zapisano' : saveState === 'error' ? 'Błąd' : 'Zapisz Konfigurację'}
    </button>
  </div>
);

const Input = ({ text, val, onChange, type = "text" }) => (
  <div className="space-y-2">
    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">{text}</label>
    <input 
      type={type} value={val} onChange={onChange} 
      className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white font-bold outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all" 
    />
  </div>
);

const MacroBar = ({ label, grams, pct, color }) => (
  <div className="space-y-2 group">
    <div className="flex justify-between items-end">
      <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{label}</span>
      <div className="text-right">
        <span className="text-base font-black text-white">{grams}g</span>
        <span className="text-[9px] font-bold text-slate-500 ml-2">({pct}%)</span>
      </div>
    </div>
    <div className="w-full h-2 bg-slate-950 border border-slate-800 rounded-full overflow-hidden flex">
      <div className={`h-full ${color} shadow-[0_0_10px_currentColor] transition-all duration-1000 ease-out`} style={{ width: `${pct}%` }}></div>
    </div>
  </div>
);

export default UserProfile;