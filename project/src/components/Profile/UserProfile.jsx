import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import {
  User, Settings, Camera, Trophy, Loader2, Save, Ruler, Target,
  Brain, ShieldCheck, Activity, Droplets, Dumbbell, HeartPulse, PieChart,
  CheckCircle2, AlertCircle, ShieldAlert, Medal, Lock, Award, Zap, Timer,
  Crown, Sparkles, TrendingUp, Flame, Gauge, ChevronRight, Bell, Hexagon,
  LineChart, BarChart3, Clock, Calendar, Wind, Snowflake, Sun, Moon,
  ArrowUpRight, ArrowDownRight, Minus, Cpu, Layers, Radio, Signal
} from 'lucide-react';
import { supabase } from "../../supabaseClient";

const T = {
  surface:        'bg-[hsl(222,25%,8%)]',
  surfaceElev:    'bg-[hsl(222,22%,11%)]',
  surfaceSunken:  'bg-[hsl(222,35%,4%)]',
  border:         'border-[hsl(222,20%,15%)]',
  borderStrong:   'border-[hsl(222,18%,22%)]',
  text:           'text-[hsl(210,25%,96%)]',
  textMuted:      'text-[hsl(220,10%,55%)]',
  textDim:        'text-[hsl(220,8%,40%)]',
  primary:        'text-[hsl(199,95%,58%)]',
  primaryBg:      'bg-[hsl(199,95%,58%)]',
  accent:         'text-[hsl(152,70%,50%)]',
  warning:        'text-[hsl(38,95%,60%)]',
  danger:         'text-[hsl(0,75%,60%)]',
  display:        "font-['Space_Grotesk',system-ui,sans-serif] tracking-tight",
  mono:           "font-['JetBrains_Mono',ui-monospace,monospace]",
};

/* ─── DEFAULTS ──────────────────────────────────────────────────────────── */
const DEFAULT_FORM_DATA = {
  firstName: '', lastName: '', age: '0', weight: '0', height: '0',
  gender: 'Mężczyzna', goal: 'Masa', activityLevel: 'Moderowany',
  experience: 'Początkujący', diet: 'Zbilansowana', equipment: 'Siłownia',
  trainingDays: ['Pon', 'Śr', 'Pią'], bio: '',
  measurements: { chest: '', arm: '', waist: '', thigh: '' }
};

const DEFAULT_STATS = {
  bmi: '0.0', bmr: 0, tdee: 0, water: 0, status: 'Oczekiwanie',
  macros: { p: 0, f: 0, c: 0, pPct: 0, fPct: 0, cPct: 0 }
};

const ACHIEVEMENTS_LIST = [
  { id: "001", title: "Król Przysiadów",   tier: 'Gold',     desc: "Twoja technika przysiadu osiągnęła poziom elitarny.",  req: "10 powtórzeń z kątem kolan poniżej 100°.", icon: <Zap size={20}/>,        unlocked: false,  progress: 0 },
  { id: "002", title: "Twardy jak Diament",tier: 'Platinum', desc: "Niezłomna wytrzymałość i nienaganna forma.",          req: "50 powtórzeń z oceną techniki powyżej 90%.", icon: <ShieldCheck size={20}/>, unlocked: false, progress: 0  },
  { id: "003", title: "Łamacz Desek",      tier: 'Silver',   desc: "Twój korpus jest ze stali. Izometryczna siła.",        req: "Idealna pozycja deski przez 3 minuty.",      icon: <Droplets size={20}/>,    unlocked: false, progress: 0  },
  { id: "004", title: "Cyber-Wykrok",      tier: 'Gold',     desc: "Doskonała koordynacja i balans.",                      req: "Seria wykroków bez utraty osiowości.",       icon: <Timer size={20}/>,       unlocked: false, progress: 0  },
  { id: "005", title: "Wspinaczka na Szczyt", tier: 'Diamond', desc: "Konsekwentny progres w każdym aspekcie.",            req: "Łączna ocena formy 100/100 w 5 ćwiczeniach.",icon: <Crown size={20}/>,       unlocked: false, progress: 0  },
  { id: "006", title: "Generał Barków",    tier: 'Gold',     desc: "Potężne i stabilne barki.",                            req: "Pełna seria wyciskania nad głowę.",          icon: <Activity size={20}/>,    unlocked: false, progress: 0  },
  { id: "007", title: "Stalowe Bicepsy",   tier: 'Silver',   desc: "Maksymalna izolacja i pełne napięcie.",                req: "15 powtórzeń bez cheatingu.",                icon: <ShieldCheck size={20}/>, unlocked: false, progress: 0  }
];

const TIER_STYLES = {
  Silver:   { ring: 'ring-slate-400/40',   text: 'text-slate-300',  bg: 'bg-slate-400/10',   label: 'Silver'   },
  Gold:     { ring: 'ring-amber-400/40',   text: 'text-amber-300',  bg: 'bg-amber-400/10',   label: 'Gold'     },
  Platinum: { ring: 'ring-cyan-400/40',    text: 'text-cyan-300',   bg: 'bg-cyan-400/10',    label: 'Platinum' },
  Diamond:  { ring: 'ring-fuchsia-400/40', text: 'text-fuchsia-300',bg: 'bg-fuchsia-400/10', label: 'Diamond'  },
};

/* ─── HOOKS ─────────────────────────────────────────────────────────────── */
const useAnimatedNumber = (target, duration = 900) => {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const from = 0;
    let raf;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setVal(Math.round(from + (target - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
};

const useNow = () => {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000 * 30);
    return () => clearInterval(id);
  }, []);
  return now;
};

/* ─── CALCULATION ENGINE ────────────────────────────────────────────────── */
const computeDiagnostics = (data) => {
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

  const multipliers = { Minimalny: 1.2, Niski: 1.375, Moderowany: 1.55, Wysoki: 1.725, Ekstremalny: 1.9 };
  const tdeeVal = Math.round(bmrVal * (multipliers[data.activityLevel] || 1.2));

  let targetKcal = tdeeVal;
  if (data.goal === 'Masa') targetKcal += 350;
  if (data.goal === 'Redukcja') targetKcal -= 500;

  const waterIntake = (w * 0.035 + (data.trainingDays.length * 0.1)).toFixed(1);

  let pGrams = Math.round(w * 2.2);
  let fGrams = Math.round(w * 1.0);
  let cGrams;

  if (data.diet === 'Keto') {
    pGrams = Math.round((targetKcal * 0.25) / 4);
    fGrams = Math.round((targetKcal * 0.70) / 9);
    cGrams = Math.round((targetKcal * 0.05) / 4);
  } else {
    if (data.diet === 'Wysokobiałkowa') pGrams = Math.round(w * 2.6);
    cGrams = Math.max(0, Math.round((targetKcal - pGrams * 4 - fGrams * 9) / 4));
  }

  const totalKcal = (pGrams * 4) + (fGrams * 9) + (cGrams * 4) || 1;
  return {
    bmi: bmiVal.toFixed(1), bmr: Math.round(bmrVal), tdee: targetKcal, status,
    water: waterIntake,
    macros: {
      p: pGrams, f: fGrams, c: cGrams,
      pPct: Math.round(((pGrams * 4) / totalKcal) * 100) || 0,
      fPct: Math.round(((fGrams * 9) / totalKcal) * 100) || 0,
      cPct: Math.round(((cGrams * 4) / totalKcal) * 100) || 0
    }
  };
};

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

  const now = useNow();
  const runDiagnostics = useCallback(computeDiagnostics, []);

  /* ── Achievement deep-link scroll ────────────────────────────────────── */
  useEffect(() => {
    if (!initialAchievementId || loading) return;
    setActiveTab('achievements');
    setHighlightedAch(initialAchievementId);
    const attempt = (n = 0) => {
      const el = achRefs.current[initialAchievementId];
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      else if (n < 6) setTimeout(() => attempt(n + 1), 120);
    };
    const t = setTimeout(attempt, 450);
    return () => clearTimeout(t);
  }, [initialAchievementId, loading]);

  /* ── Init ───────────────────────────────────────────────────────────── */
  useEffect(() => {
    const init = async () => {
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
          const parsed = profile?.payload || JSON.parse(localStorage.getItem(`profile_data_${user.id}`) || '{}');
          const merged = {
            ...DEFAULT_FORM_DATA, ...parsed,
            measurements: { ...DEFAULT_FORM_DATA.measurements, ...(parsed.measurements || {}) },
            trainingDays: parsed.trainingDays || DEFAULT_FORM_DATA.trainingDays,
          };
          setFormData(merged);
          setStats(runDiagnostics(merged));
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    init();
  }, [isGuest, runDiagnostics]);

  /* ── Save ───────────────────────────────────────────────────────────── */
  const saveProfileData = async () => {
    if (isGuest) return;
    setSaveState('saving');
    const cleanData = {
      ...formData,
      age:    Math.max(13,  parseInt(formData.age)    || 25 ).toString(),
      weight: Math.max(30,  parseFloat(formData.weight) || 75 ).toString(),
      height: Math.max(100, parseFloat(formData.height) || 180).toString(),
      measurements: Object.fromEntries(
        ['chest','arm','waist','thigh'].map(k => [k, formData.measurements[k] ? Math.max(0, parseFloat(formData.measurements[k])).toString() : ''])
      ),
    };
    try {
      const { error } = await supabase.from('profiles').upsert({
        id: user?.id, payload: cleanData, updated_at: new Date().toISOString()
      });
      if (error) throw error;
      localStorage.setItem(`profile_data_${user?.id}`, JSON.stringify(cleanData));
      setFormData(cleanData);
      setStats(runDiagnostics(cleanData));
      setSaveState('success');
      setTimeout(() => setSaveState('idle'), 2500);
    } catch (e) {
      console.error(e);
      setSaveState('error');
      setTimeout(() => setSaveState('idle'), 2500);
    }
  };

  const toggleDay = (day) => {
    if (isGuest) return;
    const days = formData.trainingDays.includes(day)
      ? formData.trainingDays.filter(d => d !== day)
      : [...formData.trainingDays, day];
    setFormData({ ...formData, trainingDays: days });
  };

  /* ── Derived ────────────────────────────────────────────────────────── */
  const fullName = useMemo(
    () => (formData.firstName || formData.lastName)
      ? `${formData.firstName} ${formData.lastName}`.trim()
      : 'Brak Tożsamości',
    [formData.firstName, formData.lastName]
  );

  const initials = useMemo(() => {
    const a = (formData.firstName || '').charAt(0);
    const b = (formData.lastName  || '').charAt(0);
    return (a + b).toUpperCase() || '··';
  }, [formData.firstName, formData.lastName]);

  const completionScore = useMemo(() => {
    const fields = [formData.firstName, formData.lastName, formData.bio, formData.age, formData.weight, formData.height];
    const filled = fields.filter(f => f && f !== '0').length;
    const measFilled = Object.values(formData.measurements).filter(Boolean).length;
    return Math.round(((filled + measFilled) / (fields.length + 4)) * 100);
  }, [formData]);

  const greeting = useMemo(() => {
    const h = now.getHours();
    if (h < 5)  return { word: 'Dobranoc',     icon: <Moon size={12}/> };
    if (h < 12) return { word: 'Dzień dobry',  icon: <Sun size={12}/> };
    if (h < 18) return { word: 'Witaj',        icon: <Sun size={12}/> };
    return       { word: 'Dobry wieczór',      icon: <Moon size={12}/> };
  }, [now]);

  const animatedTdee   = useAnimatedNumber(stats.tdee);
  const animatedBmr    = useAnimatedNumber(stats.bmr);
  const animatedScore  = useAnimatedNumber(completionScore);

  /* ── LOADING ────────────────────────────────────────────────────────── */
  if (loading) return (
    <div className={`flex flex-col items-center justify-center h-[60vh] gap-6 ${T.text}`}>
      <div className="relative">
        <div className={`absolute inset-0 rounded-full blur-2xl ${T.primaryBg} opacity-30 animate-pulse`} />
        <Loader2 className={`relative animate-spin ${T.primary}`} size={42} />
      </div>
      <div className="text-center space-y-1">
        <p className={`${T.mono} text-[10px] uppercase tracking-[0.4em] ${T.primary}`}>Inicjalizacja systemu</p>
        <p className={`text-xs ${T.textMuted}`}>FormCheckA1</p>
      </div>
    </div>
  );

  return (
    <div className={`relative max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6 ${T.text} font-sans`}>

      {/* ═══ TOP STATUS BAR ════════════════════════════════════════════════ */}
      <div className={`flex items-center justify-between text-[10px] ${T.mono} uppercase tracking-[0.25em] ${T.textDim} pb-1`}>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5"><Radio size={10} className={`${T.accent} animate-pulse`}/> System online</span>
          <span className="hidden sm:inline">·</span>
          <span className="hidden sm:inline">{now.toLocaleDateString('pl-PL', { weekday: 'short', day: '2-digit', month: 'short' })}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden sm:flex items-center gap-1.5"><Signal size={10}/> Sync OK</span>
          <span className="flex items-center gap-1.5"><Cpu size={10}/> FormCheckAI</span>
        </div>
      </div>

      {/* ═══ HERO HEADER ══════════════════════════════════════════════════ */}
      <section className={`relative overflow-hidden rounded-3xl border ${T.border} ${T.surface} ${isGuest ? 'blur-md grayscale pointer-events-none select-none' : ''}`}
               style={{ boxShadow: '0 30px 80px -30px hsl(222 60% 2% / 0.7), inset 0 1px 0 hsl(210 25% 96% / 0.04)' }}>
        {/* Ambient gradients */}
        <div aria-hidden className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-40 -right-32 w-[34rem] h-[34rem] rounded-full" style={{ background: 'radial-gradient(closest-side, hsl(199 95% 58% / 0.18), transparent)' }}/>
          <div className="absolute -bottom-32 -left-32 w-[26rem] h-[26rem] rounded-full" style={{ background: 'radial-gradient(closest-side, hsl(152 70% 50% / 0.10), transparent)' }}/>
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-400/40 to-transparent" />
          <svg className="absolute inset-0 h-full w-full opacity-[0.035]" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        <div className="relative p-6 sm:p-8 lg:p-10">
          {/* Greeting strip */}
          <div className="flex items-center justify-between flex-wrap gap-3 mb-7">
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${T.surfaceSunken} border ${T.border}`}>
              {greeting.icon}
              <span className={`text-[11px] ${T.textMuted} font-medium`}>
                {greeting.word}, <span className={T.text}>{formData.firstName || 'spersonalizuj profil'}</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <IconBtn icon={<Bell size={14}/>} label="Powiadomienia" />
              <IconBtn icon={<Settings size={14}/>} label="Ustawienia" onClick={() => setActiveTab('settings')} />
            </div>
          </div>

          <div className="flex flex-col xl:flex-row items-start gap-8">
            {/* Avatar */}
            <div className="relative shrink-0 mx-auto xl:mx-0">
              <div className="relative">
                <div className={`absolute -inset-1 rounded-3xl bg-gradient-to-br from-sky-400/40 via-sky-500/10 to-transparent blur opacity-60`} />
                <div className={`relative h-32 w-32 rounded-3xl border ${T.borderStrong} ${T.surfaceSunken} overflow-hidden grid place-items-center`}>
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                  ) : (
                    <span className={`${T.display} text-4xl font-semibold ${T.text}`}>{initials}</span>
                  )}
                </div>
                <button
                  onClick={() => !isGuest && fileInputRef.current?.click()}
                  className={`absolute -bottom-2 -right-2 h-10 w-10 grid place-items-center rounded-2xl ${T.primaryBg} text-slate-950 border-4 border-[hsl(222,25%,8%)] hover:scale-110 active:scale-95 transition-transform shadow-xl`}
                  aria-label="Zmień avatar"
                >
                  <Camera size={16}/>
                </button>
                <input
                  ref={fileInputRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onloadend = () => onAvatarChange(r.result); r.readAsDataURL(f); } }}
                />
              </div>
              {/* Status dot */}
              <div className={`absolute top-2 right-2 flex items-center gap-1.5 px-2 py-0.5 rounded-full ${T.surfaceSunken}/90 backdrop-blur border ${T.border}`}>
                <span className={`h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_currentColor] ${T.accent}`}/>
              </div>
            </div>

            {/* Identity */}
            <div className="flex-1 min-w-0 text-center xl:text-left space-y-4">
              <div className="flex flex-wrap justify-center xl:justify-start gap-2">
                <Tag>{formData.experience}</Tag>
                <Tag tone="muted" icon={<Hexagon size={10}/>}>{formData.equipment}</Tag>
              </div>
              <div>
                <h1 className={`${T.display} text-4xl sm:text-5xl font-semibold ${T.text}`}>{fullName}</h1>
                <p className={`mt-1 ${T.mono} text-[11px] uppercase tracking-[0.3em] ${T.textDim}`}>
                  ID · {(user?.id || 'guest-session').slice(0, 8).toUpperCase()}
                </p>
              </div>
              <p className={`${T.textMuted} leading-relaxed max-w-xl mx-auto xl:mx-0`}>
                {formData.bio || 'Uzupełnij bio w ustawieniach, aby spersonalizować profil i odblokować pełny potencjał systemu AI.'}
              </p>

              {/* Profile completion bar */}
              <div className="max-w-md mx-auto xl:mx-0 pt-2">
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-[10px] ${T.mono} uppercase tracking-[0.2em] ${T.textMuted}`}>Kompletność profilu</span>
                  <span className={`text-xs font-semibold ${T.text}`}>{animatedScore}%</span>
                </div>
                <div className={`relative h-1.5 ${T.surfaceSunken} rounded-full overflow-hidden border ${T.border}`}>
                  <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-sky-500 to-cyan-300 rounded-full transition-all duration-1000"
                       style={{ width: `${animatedScore}%` }}/>
                </div>
              </div>
            </div>

            {/* KPI cluster */}
            <div className="grid grid-cols-2 gap-3 w-full xl:w-auto shrink-0">
              <KpiTile icon={<Dumbbell size={16}/>} label="Treningi"  value={`${formData.trainingDays.length}`} unit="/tydz" trend="up"     delta="" />
              <KpiTile icon={<Droplets size={16}/>} label="Woda"      value={stats.water}                       unit="L"     trend="flat"   delta=""  />
              <KpiTile icon={<Flame size={16}/>}    label="Cel kcal"  value={animatedTdee.toLocaleString()}     unit="kcal"  trend="up"     delta=""/>
              <KpiTile icon={<Gauge size={16}/>}    label="BMI"       value={stats.bmi}                          unit={stats.status} trend={parseFloat(stats.bmi) > 25 ? 'down' : 'up'} delta="" />
            </div>
          </div>
        </div>
      </section>

      {/* ═══ TAB BAR ══════════════════════════════════════════════════════ */}
      <nav className={`flex flex-wrap justify-center gap-1 p-1 ${T.surface} border ${T.border} rounded-2xl w-fit mx-auto ${isGuest ? 'blur-md pointer-events-none' : ''}`}>
        {[
          { id: 'dashboard',    icon: Activity, label: 'Dashboard' },
          { id: 'settings',     icon: Settings, label: 'Dane' },
          { id: 'preferences',  icon: Target,   label: 'Plan' },
          { id: 'measurements', icon: Ruler,    label: 'Pomiary' },
          { id: 'achievements', icon: Medal,    label: 'Trofea' },
        ].map(tab => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-300 ${
                active ? 'text-slate-950' : `${T.textMuted} hover:${T.text} hover:bg-white/[0.03]`
              }`}
            >
              {active && (
                <span className={`absolute inset-0 rounded-xl ${T.primaryBg} shadow-[0_8px_24px_-8px_hsl(199_95%_58%_/_0.6)]`} aria-hidden />
              )}
              <span className="relative flex items-center gap-2">
                <tab.icon size={14} />
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* ═══ GUEST OVERLAY ════════════════════════════════════════════════ */}
      {isGuest && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-md bg-slate-950/40 rounded-3xl">
          <div className={`relative max-w-md w-full p-10 rounded-3xl ${T.surface} border ${T.borderStrong} shadow-2xl text-center`}>
            <div className="absolute -inset-px rounded-3xl bg-gradient-to-br from-sky-500/30 via-transparent to-transparent pointer-events-none" />
            <div className={`relative inline-flex p-4 rounded-2xl ${T.primaryBg}/15 border border-sky-500/30 mb-5`}>
              <ShieldAlert className={T.primary} size={28} />
            </div>
            <h2 className={`${T.display} text-3xl font-semibold ${T.text} mb-3`}>Profil zablokowany</h2>
            <p className={`${T.textMuted} text-sm leading-relaxed mb-7`}>
              Zaloguj się, aby odblokować zaawansowane statystyki AI, dziennik pomiarów oraz pełną personalizację treningów.
            </p>
            <button
              onClick={onLogin}
              className={`group w-full ${T.primaryBg} text-slate-950 px-6 py-4 rounded-2xl font-semibold text-sm transition-all hover:shadow-[0_20px_40px_-12px_hsl(199_95%_58%_/_0.5)] flex items-center justify-center gap-2`}
            >
              Zaloguj się teraz
              <ArrowUpRight size={16} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"/>
            </button>
          </div>
        </div>
      )}

      {/* ═══ MAIN GRID ════════════════════════════════════════════════════ */}
      <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 ${isGuest ? 'blur-md pointer-events-none select-none' : ''}`}>
        <div className="lg:col-span-2 space-y-6">

          {/* ── DASHBOARD ─────────────────────────────────────────────── */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* BMI scale */}
<Card className="overflow-hidden group">
  <CardHeader icon={<HeartPulse size={14} className={T.danger}/>} title="Stan organizmu" hint="Indeks masy ciała"/>
  
  <div className="mt-6 space-y-6">
    <div className="flex items-baseline justify-between">
      <div className="flex flex-col">
        <span className={`text-[10px] ${T.mono} uppercase tracking-[0.25em] ${T.textMuted}`}>BMI Index</span>
        {/* Mały wskaźnik tekstowy pod napisem BMI */}
        <span className={`text-[10px] font-bold ${stats.status === 'Normal' ? 'text-emerald-500' : 'text-orange-500'}`}>
          ● {stats.status.toUpperCase()}
        </span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className={`${T.display} text-5xl font-bold tracking-tighter ${T.text}`}>
          {stats.bmi}
        </span>
        <span className={`text-[10px] font-bold ${T.textMuted} uppercase`}>kg/m²</span>
      </div>
    </div>

    {/* Autorska skala BMI z animacją */}
    <div className="relative pt-2 pb-6">
      {/* Tło skali (Track) */}
      <div className="relative h-2 w-full bg-zinc-800/50 rounded-full overflow-hidden flex">
        {/* Segmenty kolorystyczne */}
        <div className="h-full w-[18.5%] bg-sky-500/30 border-r border-zinc-900/20" /> {/* Underweight */}
        <div className="h-full w-[25%] bg-emerald-500/40 border-r border-zinc-900/20" /> {/* Normal */}
        <div className="h-full w-[15%] bg-yellow-500/30 border-r border-zinc-900/20" />  {/* Overweight */}
        <div className="h-full flex-1 bg-rose-500/30" /> {/* Obese */}
      </div>

      {/* Marker (Wskaźnik) */}
      <div 
        className="absolute top-0 transition-all duration-[1500ms] cubic-bezier(0.34, 1.56, 0.64, 1)"
        style={{ 
          left: `${Math.min(Math.max((parseFloat(stats.bmi) - 15) / (40 - 15) * 100, 0), 100)}%`,
          transform: 'translateX(-50%)'
        }}
      >
        {/* Linia pionowa */}
        <div className="w-1 h-6 bg-white rounded-full shadow-[0_0_12px_rgba(255,255,255,0.5)] z-10 relative" />
        
        {/* Pulsujący punkt pod skalą */}
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
      </div>

      {/* Podpisy wartości pod skalą */}
      <div className="flex justify-between mt-4 text-[9px] font-bold text-zinc-600 font-mono">
        <span>15.0</span>
        <span className={parseFloat(stats.bmi) < 25 && parseFloat(stats.bmi) > 18.5 ? 'text-emerald-500' : ''}>18.5</span>
        <span>25.0</span>
        <span>30.0</span>
        <span>40.0</span>
      </div>
    </div>
  </div>

  {/* Dodatkowy mini-alert na dole karty */}
  <div className={`mt-2 p-2 rounded-lg border ${stats.status === 'Normal' ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-orange-500/5 border-orange-500/10'} transition-opacity duration-1000`}>
    <p className="text-[10px] text-center text-zinc-400">
      {stats.status === 'Normal' 
        ? "Świetnie! Twój wynik mieści się w optymalnym zakresie." 
        : "Zwróć uwagę na nawyki żywieniowe i skonsultuj wynik z trenerem."}
    </p>
  </div>
</Card>

                {/* Energy expenditure */}
                <Card>
                  <CardHeader icon={<Flame size={14} className={T.warning}/>} title="Bilans energetyczny" hint="BMR · TDEE"/>
                  <div className="mt-6 grid grid-cols-2 gap-4">
                    <Metric label="BMR (spoczynek)" value={animatedBmr.toLocaleString()} unit="kcal" delta="-3%" tone="muted"/>
                    <Metric label="TDEE (cel)"       value={animatedTdee.toLocaleString()} unit="kcal" delta="+5%" tone="primary"/>
                  </div>
                  <div className={`mt-5 p-4 rounded-2xl ${T.surfaceSunken} border ${T.border}`}>
                    <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.2em] font-semibold mb-2">
                      <span className={T.textMuted}>Deficyt / Nadwyżka</span>
                      <span className={T.primary}>
                        {formData.goal === 'Masa' ? '+350 kcal' : formData.goal === 'Redukcja' ? '−500 kcal' : '0 kcal'}
                      </span>
                    </div>
                    <p className={`text-xs ${T.textMuted}`}>Strategia: {formData.goal} · {formData.diet}</p>
                  </div>
                </Card>
              </div>

              {/* Weekly schedule */}
              <Card className="bg-zinc-900/50 border-zinc-800 relative overflow-hidden">
  <CardHeader 
    icon={<Calendar size={14} className="text-emerald-400"/>} 
    title="Plan treningowy" 
    hint="Harmonogram aktywności"
  />
  
  <div className="mt-8 flex justify-between items-start px-2">
    {['Pon','Wt','Śr','Czw','Pią','Sob','Ndz'].map((day, i) => {
      const active = formData.trainingDays.includes(day);
      
      return (
        // Wrapper z 'group' dla efektu hover
        <div key={day} className="flex flex-col items-center gap-4 group cursor-default">
          <div className={`relative flex items-center justify-center transition-transform duration-300 group-hover:scale-105 ${active ? 'scale-100' : 'scale-95 group-hover:scale-100'}`}>
            {/* Tło pierścienia */}
            <svg className="w-12 h-12 transform -rotate-90">
              <circle
                cx="24"
                cy="24"
                r="20"
                stroke="currentColor"
                strokeWidth="3"
                fill="transparent"
                className={`${active ? 'text-emerald-500' : 'text-zinc-800'} transition-all duration-700`}
                // Animacja rysowania się pierścienia przy wejściu (tylko dla aktywnych)
                style={active ? {
                  strokeDasharray: '126', 
                  strokeDashoffset: '0', 
                  animation: `drawCirc 1.5s ease-out ${i * 150}ms backward`
                } : {}}
              />
            </svg>
            
            {/* Wnętrze pierścienia z delikatnym pulsem */}
            <div className="absolute inset-0 flex items-center justify-center">
              {active ? (
                // animate-pulse dodany tutaj
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.6)] animate-pulse" />
              ) : (
                <div className="w-1.5 h-1.5 rounded-full bg-zinc-800 group-hover:bg-zinc-700 transition-colors" />
              )}
            </div>
          </div>

          {/* Dzień tygodnia */}
          <div className="flex flex-col items-center gap-1">
            <span className={`text-xs font-bold tracking-tight transition-colors duration-300 ${active ? 'text-emerald-400' : 'text-zinc-600 group-hover:text-zinc-300'}`}>
              {day}
            </span>
            {active && (
              <span className="text-[9px] font-medium text-emerald-500/70 uppercase tracking-tighter opacity-100 transition-opacity duration-300">Trening</span>
            )}
            {!active && (
                <span className="text-[9px] font-medium text-zinc-700 uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity duration-300">Wolne</span>
            )}
          </div>
        </div>
      );
    })}
  </div>

  {/* Statyczna sekcja info na dole */}
  <div className="mt-8 pt-5 border-t border-zinc-800/50">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
          <Target size={16} className="text-emerald-500" />
        </div>
        <div>
          <p className="text-[11px] font-bold text-zinc-200">Statystyki wkrótce</p>
          <p className="text-[10px] text-zinc-500">Wykresy pojawią się po pierwszym tygodniu</p>
        </div>
      </div>
      <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/5 border border-emerald-500/20">
         <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"/>
      </div>
    </div>
  </div>

  {/* Definicja animacji CSS */}
  <style dangerouslySetInnerHTML={{ __html: `
    @keyframes drawCirc {
      from { stroke-dashoffset: 126; }
      to { stroke-dashoffset: 0; }
    }
  `}} />
</Card>

              <Card className="relative overflow-hidden border-zinc-800/40 bg-zinc-900/20">
  <div className="absolute top-3 right-3 z-10">
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-zinc-800/80 border border-zinc-700/50 shadow-sm">
      <div className="w-1 h-1 rounded-full bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.5)]" />
      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
        Coming Soon
      </span>
    </div>
  </div>

  <div className="opacity-25 grayscale-[80%] brightness-75 pointer-events-none select-none transition-all duration-700">
    <CardHeader 
      icon={<LineChart size={14} className={T.accent}/>} 
      title="Aktywność systemu" 
      hint="Ostatnie zdarzenia"
    />
    <div className="mt-5 divide-y divide-[hsl(222,20%,10%)]">
      {[
        { icon: <CheckCircle2 size={14}/>, color: T.accent,   text: 'Zaktualizowano profil',         time: '2 min temu' },
        { icon: <TrendingUp size={14}/>,    color: T.primary,  text: 'Nowy rekord przysiadu',          time: '12 godz temu' },
        { icon: <Award size={14}/>,         color: T.warning,  text: 'Odblokowano: Król Przysiadów',   time: 'wczoraj' },
        { icon: <Brain size={14}/>,         color: T.primary,  text: 'AI dostroiło plan kaloryczny',   time: '2 dni temu' },
      ].map((row, i) => (
        <div key={i} className="flex items-center gap-4 py-3">
          <div className={`h-8 w-8 grid place-items-center rounded-lg ${T.surfaceSunken} border border-zinc-800/50 ${row.color}`}>
            {row.icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm ${T.text} opacity-50`}>{row.text}</p>
            <p className={`text-[10px] ${T.textDim}`}>{row.time}</p>
          </div>
          <ChevronRight size={12} className="opacity-20"/>
        </div>
      ))}
    </div>
  </div>

  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/20 to-transparent pointer-events-none" />
</Card>
            </div>
          )}

          {/* ── SETTINGS ──────────────────────────────────────────────── */}
          {activeTab === 'settings' && (
            <Card>
              <SectionHeader title="Dane fizyczne" subtitle="Podstawowe dane do obliczeń"
                             save={saveProfileData} state={saveState}/>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-7">
                <Field 
  label="Imię" 
  val={formData.firstName} 
  onChange={(e) => {const singleWord = e.target.value.replace(/\s/g, '').slice(0, 15);setFormData({...formData, firstName: singleWord});}}
/>
<Field label="Nazwisko" val={formData.lastName} onChange={(e) => {const singleWord = e.target.value.replace(/\s/g, '').slice(0, 15);setFormData({...formData, lastName: singleWord});
  }}
/>
                <Field 
  label="Wiek" 
  type="number" 
  suffix="lat" 
  val={formData.age} 
  onChange={(e) => {
    // Blokada: max 120 lat, brak wartości ujemnych
    const val = Math.min(120, Math.max(0, parseInt(e.target.value) || 0));
    setFormData({...formData, age: val});
  }}
/>

<Field 
  label="Waga" 
  type="number" 
  suffix="kg" 
  val={formData.weight} 
  onChange={(e) => {
    const val = Math.min(600, Math.max(0, parseFloat(e.target.value) || 0));
    setFormData({...formData, weight: val});
  }}
/>

<Field 
  label="Wzrost" 
  type="number" 
  suffix="cm" 
  val={formData.height} 
  onChange={(e) => {
    const val = Math.min(272, Math.max(0, parseInt(e.target.value) || 0));
    setFormData({...formData, height: val});
  }}
/>
                <SelectField label="Płeć"  val={formData.gender} options={['Mężczyzna','Kobieta']} onChange={(e)=>setFormData({...formData, gender: e.target.value})}/>
                <div className="sm:col-span-2 space-y-2">
                  <FieldLabel>Bio</FieldLabel>
                  <textarea
                    value={formData.bio}
                    onChange={(e)=>setFormData({...formData, bio: e.target.value})}
                    placeholder="Opowiedz krótko o swoim podejściu do treningu..."
                    className={`w-full ${T.surfaceSunken} border ${T.border} rounded-2xl px-4 py-3 ${T.text} placeholder:${T.textDim} outline-none resize-none h-28 focus:border-sky-500/60 focus:ring-2 focus:ring-sky-500/20 transition-all`}
                  />
                  <div className={`text-[10px] ${T.mono} ${T.textDim} text-right`}>{formData.bio.length} / 280</div>
                </div>
              </div>
            </Card>
          )}

          {/* ── PREFERENCES ───────────────────────────────────────────── */}
          {activeTab === 'preferences' && (
            <Card>
              <SectionHeader title="Plan & dieta" subtitle="Cel, dieta i harmonogram"
                             save={saveProfileData} state={saveState}/>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-7">
                {[
                  { v: 'Masa',      icon: <TrendingUp size={16}/>, desc: '+350 kcal' },
                  { v: 'Redukcja',  icon: <ArrowDownRight size={16}/>, desc: '−500 kcal' },
                  { v: 'Siła',      icon: <Dumbbell size={16}/>,    desc: 'utrzymanie' },
                ].map(opt => {
                  const active = formData.goal === opt.v;
                  return (
                    <button key={opt.v} onClick={() => setFormData({ ...formData, goal: opt.v })}
                      className={`group p-4 rounded-2xl border text-left transition-all ${
                        active
                          ? 'bg-sky-500/10 border-sky-500/50 shadow-[inset_0_0_0_1px_hsl(199_95%_58%_/_0.3)]'
                          : `${T.surfaceSunken} ${T.border} hover:border-[hsl(222,18%,22%)]`
                      }`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className={`p-2 rounded-lg ${active ? 'bg-sky-500/20 text-sky-300' : `${T.surface} ${T.textMuted}`}`}>
                          {opt.icon}
                        </div>
                        {active && <CheckCircle2 size={16} className={T.primary}/>}
                      </div>
                      <p className={`font-semibold ${T.text}`}>{opt.v}</p>
                      <p className={`text-[11px] ${T.textMuted} mt-0.5`}>{opt.desc}</p>
                    </button>
                  );
                })}
              </div>

              <div className="mt-7 grid grid-cols-1 sm:grid-cols-2 gap-5">
                <SelectField label="Dieta"           val={formData.diet}          options={['Zbilansowana','Wysokobiałkowa','Keto']}                                  onChange={(e)=>setFormData({...formData, diet: e.target.value})}/>
                <SelectField label="Aktywność"       val={formData.activityLevel} options={['Minimalny','Niski','Moderowany','Wysoki','Ekstremalny']}                  onChange={(e)=>setFormData({...formData, activityLevel: e.target.value})}/>
                <SelectField label="Doświadczenie"   val={formData.experience}    options={['Początkujący','Średniozaawansowany','Zaawansowany','Elite']}             onChange={(e)=>setFormData({...formData, experience: e.target.value})}/>
                <SelectField label="Wyposażenie"     val={formData.equipment}     options={['Siłownia','Dom','Calisthenics','Strefa CrossFit']}                       onChange={(e)=>setFormData({...formData, equipment: e.target.value})}/>
              </div>

              <div className="mt-8 pt-6 border-t border-[hsl(222,20%,15%)]">
                <div className="flex items-center justify-between mb-3">
                  <FieldLabel>Dni treningowe</FieldLabel>
                  <span className={`text-[10px] ${T.mono} ${T.textMuted}`}>{formData.trainingDays.length} z 7</span>
                </div>
                <div className="grid grid-cols-7 gap-1.5">
                  {['Pon','Wt','Śr','Czw','Pią','Sob','Ndz'].map(day => {
                    const active = formData.trainingDays.includes(day);
                    return (
                      <button key={day} onClick={() => toggleDay(day)}
                        className={`py-3 rounded-xl font-semibold text-xs transition-all border ${
                          active
                            ? 'bg-sky-500 border-sky-500 text-slate-950 shadow-[0_8px_20px_-8px_hsl(199_95%_58%_/_0.6)]'
                            : `${T.surfaceSunken} ${T.border} ${T.textMuted} hover:${T.text} hover:border-[hsl(222,18%,22%)]`
                        }`}>
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>
            </Card>
          )}

          {activeTab === 'measurements' && (
            <Card>
              <SectionHeader title="Pomiary ciała" subtitle="Aktualne obwody w cm"
                             save={saveProfileData} state={saveState}/>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-7">
                {[
                  { k: 'chest', label: 'Klatka',  icon: <Layers size={14}/> },
                  { k: 'arm',   label: 'Biceps',  icon: <Dumbbell size={14}/> },
                  { k: 'waist', label: 'Talia',   icon: <Minus size={14}/> },
                  { k: 'thigh', label: 'Udo',     icon: <Activity size={14}/> },
                ].map(m => (
                  <div key={m.k} className={`p-5 rounded-2xl ${T.surfaceSunken} border ${T.border} text-center`}>
                    <div className={`inline-flex p-2 rounded-lg ${T.surface} ${T.primary} mb-3`}>{m.icon}</div>
                    <FieldLabel className="block mb-2">{m.label}</FieldLabel>
                    <div className="relative">
                      <input
                        type="number"
                        value={formData.measurements?.[m.k] || ''}
                        onChange={(e)=>setFormData({...formData, measurements: { ...formData.measurements, [m.k]: e.target.value }})}
                        placeholder="—"
                        className={`w-full bg-transparent ${T.text} ${T.display} text-3xl font-semibold text-center outline-none placeholder:${T.textDim}`}
                      />
                    </div>
                    <div className={`mt-1 text-[10px] ${T.mono} ${T.textDim} uppercase tracking-wider`}>centymetry</div>
                  </div>
                ))}
              </div>

              <div className={`mt-6 p-4 rounded-2xl ${T.surfaceSunken} border ${T.border} flex items-start gap-3`}>
                <div className={`p-2 rounded-lg bg-sky-500/10 ${T.primary} shrink-0`}><Brain size={14}/></div>
                <div>
                  <p className={`text-xs ${T.text} font-semibold`}>Wskazówka AI</p>
                  <p className={`text-xs ${T.textMuted} mt-0.5`}>Mierz obwody w tej samej porze dnia (rano, na czczo) dla najwyższej spójności danych.</p>
                </div>
              </div>
            </Card>
          )}

          {activeTab === 'achievements' && (
            <Card>
              <div className="flex items-start justify-between gap-4 pb-6 border-b border-[hsl(222,20%,15%)]">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-2xl bg-amber-400/10 border border-amber-400/20">
                    <Award className="text-amber-300" size={22}/>
                  </div>
                  <div>
                    <h3 className={`${T.display} text-2xl font-semibold ${T.text}`}>Księga wyzwań</h3>
                    <p className={`text-xs ${T.textMuted} mt-0.5`}>Odblokuj nagrody przez trening i dyscyplinę</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`${T.display} text-2xl font-semibold ${T.text}`}>
                    {ACHIEVEMENTS_LIST.filter(a => a.unlocked).length}
                    <span className={`${T.textDim} text-sm`}>/{ACHIEVEMENTS_LIST.length}</span>
                  </p>
                  <p className={`text-[10px] ${T.mono} uppercase tracking-[0.2em] ${T.textMuted}`}>Zdobyte</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 mt-6">
                {ACHIEVEMENTS_LIST.map(ach => {
                  const tier = TIER_STYLES[ach.tier];
                  const isHL = highlightedAch === ach.id;
                  return (
                    <div
                      key={ach.id}
                      ref={el => { if (el) achRefs.current[ach.id] = el; }}
                      className={`group relative p-5 rounded-2xl border transition-all duration-500 overflow-hidden ${
                        isHL
                          ? 'border-sky-500/50 bg-sky-500/[0.08] ring-2 ring-sky-500/20'
                          : `${T.surfaceSunken} ${T.border} hover:border-[hsl(222,18%,22%)]`
                      } ${!ach.unlocked && 'opacity-75'}`}
                    >
                      {/* Tier glow */}
                      {ach.unlocked && (
                        <div className={`absolute -top-12 -right-12 h-32 w-32 rounded-full ${tier.bg} blur-2xl opacity-50 pointer-events-none`}/>
                      )}

                      <div className="relative flex items-start gap-4">
                        <div className={`shrink-0 grid place-items-center h-14 w-14 rounded-2xl border ring-1 ${
                          ach.unlocked ? `${tier.bg} ${tier.text} border-transparent ${tier.ring}` : `${T.surface} ${T.textDim} ${T.border} ring-transparent`
                        }`}>
                          {ach.unlocked ? ach.icon : <Lock size={18}/>}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-3 mb-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className={`${T.display} text-lg font-semibold ${ach.unlocked ? T.text : T.textMuted}`}>
                                {ach.title}
                              </h4>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-semibold uppercase tracking-wider ${tier.bg} ${tier.text}`}>
                                {tier.label}
                              </span>
                            </div>
                            {ach.unlocked && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[10px] font-semibold whitespace-nowrap">
                                <CheckCircle2 size={10}/> Zdobyte
                              </span>
                            )}
                          </div>

                          <p className={`text-sm ${T.textMuted} leading-relaxed mb-3`}>{ach.desc}</p>
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-[10px] uppercase tracking-wider font-semibold">
                              <span className={T.textMuted}>Postęp</span>
                              <span className={`${T.mono} ${ach.unlocked ? T.accent : T.text}`}>{ach.progress}%</span>
                            </div>
                            <div className={`h-1 ${T.surface} rounded-full overflow-hidden`}>
                              <div className={`h-full rounded-full transition-all duration-1000 ${
                                ach.unlocked ? 'bg-gradient-to-r from-emerald-400 to-emerald-300' : 'bg-gradient-to-r from-sky-500 to-sky-400'
                              }`} style={{ width: `${ach.progress}%` }}/>
                            </div>
                          </div>

                          <div className={`mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ${T.surface} border ${T.border}`}>
                            <Target size={11} className={T.primary}/>
                            <span className={`text-[10px] font-semibold ${T.textMuted} uppercase tracking-[0.15em]`}>Cel:</span>
                            <span className={`text-xs ${T.text}`}>{ach.req}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>

        <aside className="space-y-6">

          {/* AI Core */}
          <Card className="relative overflow-hidden">
            <div aria-hidden className="absolute -top-10 -right-10 opacity-[0.04] pointer-events-none">
              <Brain size={160}/>
            </div>
            <div className="flex items-center justify-between">
              <div className={`flex items-center gap-2 ${T.primary}`}>
                <PieChart size={14}/>
                <h3 className={`${T.mono} text-[10px] uppercase tracking-[0.3em] font-semibold`}>AI Core Engine</h3>
              </div>
              <span className="flex items-center gap-1.5 text-[10px] text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"/>
                Live
              </span>
            </div>

            <div className={`mt-5 p-5 rounded-2xl ${T.surfaceSunken} border ${T.border} text-center relative overflow-hidden`}>
              <div className="absolute inset-0 bg-gradient-to-br from-sky-500/5 to-transparent pointer-events-none"/>
              <p className={`relative text-[10px] ${T.mono} uppercase tracking-[0.25em] ${T.textMuted} mb-1`}>Target kaloryczny</p>
              <div className="relative flex items-baseline justify-center gap-1.5">
                <span className={`${T.display} text-5xl font-semibold ${T.text}`}>{animatedTdee.toLocaleString()}</span>
                <span className={`text-xs font-semibold ${T.textMuted} uppercase`}>kcal</span>
              </div>
            </div>

            <div className="space-y-4 mt-6">
              <MacroBar label="Białko"      grams={stats.macros.p} pct={stats.macros.pPct} color="from-sky-400 to-sky-500"/>
              <MacroBar label="Tłuszcze"    grams={stats.macros.f} pct={stats.macros.fPct} color="from-amber-400 to-amber-500"/>
              <MacroBar label="Węglowodany" grams={stats.macros.c} pct={stats.macros.cPct} color="from-emerald-400 to-emerald-500"/>
            </div>
          </Card>

          <Card>
            <CardHeader icon={<Droplets size={14} className={T.primary}/>} title="Hydratacja" hint="Dzienny cel"/>
            <div className="mt-5 flex items-center gap-5">
              <HydrationRing value={Math.min(100, (parseFloat(stats.water) / 4) * 100)}/>
              <div className="flex-1">
                <p className={`${T.display} text-3xl font-semibold ${T.text}`}>{stats.water}<span className={`text-base ${T.textMuted}`}> L</span></p>
                <p className={`text-xs ${T.textMuted}`}>Cel zalecany przez AI</p>
                <div className="mt-3 flex gap-1">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className={`h-2 flex-1 rounded-sm ${i < Math.floor(parseFloat(stats.water) * 2) ? 'bg-sky-500' : T.surfaceSunken}`}/>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader icon={<ShieldCheck size={14} className={T.accent}/>} title="Wnioski systemu" hint="Auto-analiza"/>
            <ul className="mt-4 space-y-3">
              <Insight icon={<Droplets size={12}/>} tone="primary" text={`Nawodnienie: ${stats.water} L / doba`}/>
              <Insight icon={<Target size={12}/>}   tone="accent"  text={`Cel: ${formData.goal} (skorygowano makro)`}/>
              <Insight icon={<Flame size={12}/>}    tone="warning" text={`BMR: ${stats.bmr} kcal w spoczynku`}/>
              <Insight icon={<Calendar size={12}/>} tone="muted"   text={`Trening: ${formData.trainingDays.length}× w tygodniu`}/>
            </ul>
          </Card>

          <div className={`p-5 rounded-2xl ${T.surfaceSunken} border ${T.border} text-center`}>
            <div className={`${T.mono} text-[10px] uppercase tracking-[0.3em] ${T.textDim}`}>Powered by</div>
            <div className={`${T.display} text-lg font-semibold ${T.text} mt-1`}>FormCheckAI</div>
          </div>
        </aside>
      </div>
    </div>
  );
};

const Card = ({ children, className = '' }) => (
  <div className={`relative ${T.surface} border ${T.border} rounded-3xl p-6 sm:p-7 ${className}`}
       style={{ boxShadow: '0 20px 50px -30px hsl(222 60% 2% / 0.6), inset 0 1px 0 hsl(210 25% 96% / 0.03)' }}>
    {children}
  </div>
);

const CardHeader = ({ icon, title, hint }) => (
  <div className="flex items-center justify-between gap-4">
    <div className="flex items-center gap-2.5">
      {icon}
      <h4 className={`text-[11px] font-semibold ${T.text} uppercase tracking-[0.22em]`}>{title}</h4>
    </div>
    {hint && <span className={`text-[10px] ${T.mono} ${T.textMuted}`}>{hint}</span>}
  </div>
);

const SectionHeader = ({ title, subtitle, save, state }) => {
  const cfg = {
    idle:    { icon: <Save size={13}/>,           label: 'Zapisz',       cls: `${T.primaryBg} text-slate-950 hover:brightness-110` },
    saving:  { icon: <Loader2 size={13} className="animate-spin"/>, label: 'Zapisywanie',  cls: `${T.primaryBg}/70 text-slate-950` },
    success: { icon: <CheckCircle2 size={13}/>,   label: 'Zapisano',     cls: 'bg-emerald-500 text-slate-950' },
    error:   { icon: <AlertCircle size={13}/>,    label: 'Błąd',         cls: 'bg-rose-500 text-white' },
  }[state] || {};
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-[hsl(222,20%,15%)]">
      <div>
        <h3 className={`${T.display} text-xl font-semibold ${T.text}`}>{title}</h3>
        {subtitle && <p className={`text-xs ${T.textMuted} mt-0.5`}>{subtitle}</p>}
      </div>
      <button onClick={save} disabled={state === 'saving'}
        className={`px-5 py-2.5 rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-2 disabled:cursor-not-allowed shadow-lg ${cfg.cls}`}>
        {cfg.icon} {cfg.label}
      </button>
    </div>
  );
};

const FieldLabel = ({ children, className = '' }) => (
  <label className={`text-[10px] font-semibold ${T.textMuted} uppercase tracking-[0.2em] ${className}`}>{children}</label>
);

const Field = ({ label, val, onChange, type = 'text', suffix }) => (
  <div className="space-y-2">
    <FieldLabel>{label}</FieldLabel>
    <div className="relative">
      <input
        type={type} value={val} onChange={onChange}
        className={`w-full ${T.surfaceSunken} border ${T.border} rounded-xl ${suffix ? 'pr-12' : 'pr-4'} pl-4 py-3 ${T.text} font-medium outline-none focus:border-sky-500/60 focus:ring-2 focus:ring-sky-500/20 transition-all`}
      />
      {suffix && (
        <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold ${T.textDim} uppercase tracking-wider`}>{suffix}</span>
      )}
    </div>
  </div>
);

const SelectField = ({ label, val, options, onChange }) => (
  <div className="space-y-2">
    <FieldLabel>{label}</FieldLabel>
    <select
      value={val} onChange={onChange}
      className={`w-full ${T.surfaceSunken} border ${T.border} rounded-xl px-4 py-3 ${T.text} font-medium outline-none cursor-pointer focus:border-sky-500/60 focus:ring-2 focus:ring-sky-500/20 transition-all`}>
      {options.map(o => <option key={o} value={o} className="bg-slate-950">{o}</option>)}
    </select>
  </div>
);

const Tag = ({ children, tone = 'default', icon }) => {
  const styles = {
    default: `${T.surfaceSunken} ${T.textMuted} border ${T.border}`,
    primary: 'bg-sky-500/15 text-sky-300 border border-sky-500/30',
    muted:   `${T.surfaceSunken} ${T.textDim} border ${T.border}`,
  }[tone];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-semibold uppercase tracking-[0.15em] ${styles}`}>
      {icon}{children}
    </span>
  );
};

const IconBtn = ({ icon, label, onClick }) => (
  <button onClick={onClick} aria-label={label}
    className={`h-9 w-9 grid place-items-center rounded-xl ${T.surfaceSunken} border ${T.border} ${T.textMuted} hover:${T.text} hover:border-[hsl(222,18%,22%)] transition-all`}>
    {icon}
  </button>
);

const KpiTile = ({ icon, label, value, unit, trend, delta }) => {
  const trendCls = trend === 'up' ? T.accent : trend === 'down' ? T.danger : T.textMuted;
  const TrendIcon = trend === 'up' ? ArrowUpRight : trend === 'down' ? ArrowDownRight : Minus;
  return (
    <div className={`relative p-4 rounded-2xl ${T.surfaceSunken} border ${T.border} overflow-hidden`}>
      <div className="flex items-center justify-between">
        <div className={`p-1.5 rounded-lg ${T.surface} ${T.primary}`}>{icon}</div>
        {delta && (
          <span className={`flex items-center gap-0.5 text-[10px] font-semibold ${trendCls}`}>
            <TrendIcon size={10}/> {delta}
          </span>
        )}
      </div>
      <div className="mt-3">
        <div className="flex items-baseline gap-1">
          <span className={`${T.display} text-2xl font-semibold ${T.text}`}>{value}</span>
          <span className={`text-[10px] ${T.textMuted} font-semibold uppercase`}>{unit}</span>
        </div>
        <p className={`text-[10px] ${T.mono} ${T.textDim} uppercase tracking-wider mt-0.5`}>{label}</p>
      </div>
    </div>
  );
};

const Metric = ({ label, value, unit, delta, tone = 'muted' }) => {
  const valTone = tone === 'primary' ? T.primary : T.text;
  return (
    <div className={`p-4 rounded-2xl ${T.surfaceSunken} border ${T.border}`}>
      <p className={`text-[10px] ${T.mono} uppercase tracking-[0.2em] ${T.textMuted} mb-1.5`}>{label}</p>
      <div className="flex items-baseline gap-1">
        <span className={`${T.display} text-2xl font-semibold ${valTone}`}>{value}</span>
        <span className={`text-[10px] ${T.textMuted}`}>{unit}</span>
      </div>
      {delta && <p className={`text-[10px] mt-0.5 ${T.textDim}`}>{delta} vs poprzedni</p>}
    </div>
  );
};

const BmiScale = ({ bmi, status }) => {
  const segments = [
    { w: 18.5, color: 'bg-sky-500/70',     label: 'Niedowaga' },
    { w: 6.5,  color: 'bg-emerald-500/70', label: 'Norma' },
    { w: 5,    color: 'bg-amber-500/70',   label: 'Nadwaga' },
    { w: 70,   color: 'bg-rose-500/70',    label: 'Otyłość' },
  ];
  const pct = Math.min(100, (bmi / 40) * 100);
  return (
    <div>
      <div className={`relative h-2 ${T.surfaceSunken} rounded-full overflow-hidden flex border ${T.border}`}>
        {segments.map((s, i) => <div key={i} className={`h-full ${s.color}`} style={{ width: `${s.w}%` }}/>)}
        <div className="absolute inset-y-[-4px] w-0.5 bg-white shadow-[0_0_12px_white] transition-all duration-700"
             style={{ left: `${pct}%` }}/>
      </div>
      <div className="mt-2 grid grid-cols-4 gap-1 text-center">
        {segments.map((s, i) => (
          <div key={i} className={`text-[9px] ${T.mono} uppercase tracking-wider ${s.label === status ? T.text : T.textDim}`}>
            {s.label}
          </div>
        ))}
      </div>
    </div>
  );
};

const MacroBar = ({ label, grams, pct, color }) => (
  <div className="space-y-2">
    <div className="flex justify-between items-baseline">
      <span className={`text-[10px] font-semibold uppercase ${T.textMuted} tracking-[0.18em]`}>{label}</span>
      <div className={T.mono}>
        <span className={`text-base font-semibold ${T.text}`}>{grams}</span>
        <span className={`text-[10px] ${T.textMuted}`}>g · {pct}%</span>
      </div>
    </div>
    <div className={`relative h-1.5 ${T.surfaceSunken} rounded-full overflow-hidden border ${T.border}`}>
      <div className={`h-full bg-gradient-to-r ${color} rounded-full transition-all duration-1000`} style={{ width: `${pct}%` }}/>
    </div>
  </div>
);

const HydrationRing = ({ value }) => {
  const r = 28, c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  return (
    <div className="relative h-20 w-20 shrink-0">
      <svg viewBox="0 0 64 64" className="h-full w-full -rotate-90">
        <circle cx="32" cy="32" r={r} stroke="hsl(222,35%,4%)" strokeWidth="6" fill="none"/>
        <circle cx="32" cy="32" r={r} stroke="hsl(199,95%,58%)" strokeWidth="6" fill="none"
                strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset}
                style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.22, 1, 0.36, 1)' }}/>
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <span className={`${T.display} text-sm font-semibold ${T.text}`}>{Math.round(value)}%</span>
      </div>
    </div>
  );
};

const Insight = ({ icon, tone = 'muted', text }) => {
  const tones = {
    primary: { dot: 'bg-sky-500',     icon: T.primary },
    accent:  { dot: 'bg-emerald-500', icon: T.accent },
    warning: { dot: 'bg-amber-500',   icon: T.warning },
    muted:   { dot: 'bg-slate-500',   icon: T.textMuted },
  }[tone];
  return (
    <li className="flex items-start gap-3">
      <div className={`mt-0.5 h-6 w-6 rounded-lg ${T.surfaceSunken} border ${T.border} grid place-items-center ${tones.icon} shrink-0`}>
        {icon}
      </div>
      <span className={`text-sm ${T.textMuted} leading-relaxed flex-1`}>{text}</span>
    </li>
  );
};

export default UserProfile;