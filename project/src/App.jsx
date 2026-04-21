import React, { useRef, useEffect, useState } from 'react';
import "@tensorflow/tfjs-backend-webgl";
import { 
  BrainCircuit, Footprints, LayoutGrid, Activity as ActivityIcon, 
  Play, Square, LogOut, ChevronLeft, User, History, 
  Medal, Award, X, Trophy, Target, Clock, Timer
} from 'lucide-react';

import GymActivitiesList from './GymActivitiesList';
import { ACTIVITIES } from './constants';
import InteractiveModel from './InteractiveModel';
import FeedbackPage from './FeedbackPage';
import UserProfile from './UserProfile'; 
import { supabase } from './supabaseClient';

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const angleDeg = (a, b, c) => {
  const abx = a.x - b.x; const aby = a.y - b.y;
  const cbx = c.x - b.x; const cby = c.y - b.y;
  const dot = abx * cbx + aby * cby;
  const magAB = Math.hypot(abx, aby); const magCB = Math.hypot(cbx, cby);
  if (magAB === 0 || magCB === 0) return 0;
  return (Math.acos(clamp(dot / (magAB * magCB), -1, 1)) * 180) / Math.PI;
};

// --- CAMERA VIEW COMPONENT ---
const CameraView = ({ isActive, isGuest, onWorkoutFinish }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const poseRef = useRef(null);
  const cameraRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  
  const [workoutStage, setWorkoutStage] = useState('idle');
  const [repCount, setRepCount] = useState(0);
  const [phase, setPhase] = useState("idle");
  const [setupHint, setSetupHint] = useState("Inicjalizacja...");
  const [calibProgress, setCalibProgress] = useState(0);
  const [isHeelLifted, setIsHeelLifted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(isGuest ? 60 : 300);
  const [countdown, setCountdown] = useState(isGuest ? 10 : 5);
  
  const lastSpokenRef = useRef({});
  
  const getBestPolishVoice = () => {
    const voices = window.speechSynthesis.getVoices();
    return voices.find(v => v.lang === 'pl-PL' && v.name.includes('Google')) || 
           voices.find(v => v.lang === 'pl-PL' && v.name.includes('Natural')) ||
           voices.find(v => v.lang === 'pl-PL') ||
           null;
  };

  const speak = React.useCallback((text, type, cooldown = 4000) => {
    if (!window.speechSynthesis) return;
    const now = Date.now();
    if (window.speechSynthesis.speaking) return;
    if (lastSpokenRef.current[type] && now - lastSpokenRef.current[type] < cooldown) return;

    const utterance = new SpeechSynthesisUtterance(text);
    const bestVoice = getBestPolishVoice();
    if (bestVoice) utterance.voice = bestVoice;
    utterance.lang = 'pl-PL';
    utterance.rate = 1.0;
    utterance.pitch = 0.95;
    
    lastSpokenRef.current[type] = now;
    window.speechSynthesis.speak(utterance);
  }, []);

  useEffect(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      const handleVoicesChanged = () => window.speechSynthesis.getVoices();
      window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);
      return () => window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
    }
  }, []);
  
  const stageRef = useRef('idle');
  const statsRef = useRef({ kneeAngles: [], backAngles: [], shallowReps: 0, poorBackFrames: 0, heelLiftFrames: 0, totalFrames: 0 });
  const repCountRef = useRef(0);
  const calibrationFrames = useRef(0);
  const heelLiftCounter = useRef(0);

  useEffect(() => { stageRef.current = workoutStage; }, [workoutStage]);

  useEffect(() => {
    if (isActive) {
      statsRef.current = { kneeAngles: [], backAngles: [], shallowReps: 0, poorBackFrames: 0, heelLiftFrames: 0, totalFrames: 0 };
      setTimeout(() => {
        setWorkoutStage('calibrating');
        setRepCount(0); repCountRef.current = 0;
        calibrationFrames.current = 0; setCalibProgress(0);
        setTimeLeft(isGuest ? 60 : 300);
        setCountdown(isGuest ? 10 : 5);
      }, 0);
    } else {
      if (mediaRecorderRef.current?.state === "recording") {
        try { mediaRecorderRef.current.stop(); } catch(e) { console.error(e); }
      }
      setTimeout(() => setWorkoutStage('idle'), 0);
    }
  }, [isActive, isGuest]);

  useEffect(() => {
    let timer;
    if (workoutStage === 'starting') {
      if (countdown > 0) {
        timer = setInterval(() => setCountdown(c => c - 1), 1000);
        if (countdown <= 3) speak(countdown.toString(), "countdown", 900);
      } else {
        setTimeout(() => setWorkoutStage('active'), 0);
        speak("Zaczynamy!", "start", 1000);
        if (videoRef.current?.srcObject) {
          chunksRef.current = [];
          const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm';
          mediaRecorderRef.current = new MediaRecorder(videoRef.current.srcObject, { mimeType });
          mediaRecorderRef.current.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
          mediaRecorderRef.current.onstop = () => {
            const blob = new Blob(chunksRef.current, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);
            const s = statsRef.current;
            const total = s.totalFrames || 1;
            let score = 100;
            const hPen = (s.heelLiftFrames / total) * 150;
            const bPen = (s.poorBackFrames / total) * 200;
            const dPen = (s.shallowReps / (repCountRef.current || 1)) * 30;
            score = Math.max(0, Math.round(score - hPen - bPen - dPen));
            if (isNaN(score)) score = 0;
            speak(`Koniec treningu. Wykonałeś ${repCountRef.current} powtórzeń.`, "finish", 1000);
            onWorkoutFinish(repCountRef.current, url, {
              knee: { min: s.kneeAngles.length ? Math.min(...s.kneeAngles) : 0, avg: s.kneeAngles.length ? Math.round(s.kneeAngles.reduce((a,b)=>a+b,0)/s.kneeAngles.length) : 0 },
              back: { max: s.backAngles.length ? Math.max(...s.backAngles) : 0, avg: s.backAngles.length ? Math.round(s.backAngles.reduce((a,b)=>a+b,0)/s.backAngles.length) : 0 },
              faults: { heelLiftPct: Math.round((s.heelLiftFrames / total) * 100) || 0, poorBackPct: Math.round((s.poorBackFrames / total) * 100) || 0, shallowReps: s.shallowReps },
              score: score, samples: total
            });
          };
          mediaRecorderRef.current.start();
        }
      }
    } else if (workoutStage === 'active') {
      if (timeLeft > 0) {
        timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
        if (timeLeft === 10) speak("Ostatnie 10 sekund!", "time_warning", 1000);
      } else {
        if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
        setTimeout(() => setWorkoutStage('idle'), 0);
      }
    }
    return () => clearInterval(timer);
  }, [workoutStage, countdown, timeLeft, onWorkoutFinish, speak]);

  useEffect(() => {
    if (!videoRef.current) return;
    const onResults = (results) => {
      if (!canvasRef.current || !results.image) return;
      const ctx = canvasRef.current.getContext("2d");
      const { width, height } = results.image;
      if (canvasRef.current.width !== width) { canvasRef.current.width = width; canvasRef.current.height = height; }
      ctx.save(); ctx.clearRect(0, 0, width, height); ctx.drawImage(results.image, 0, 0, width, height); ctx.restore();
      if (results.poseLandmarks) {
        const lm = results.poseLandmarks;
        const aspectRatio = width / height;
        const stage = stageRef.current;
        const required = [11, 12, 23, 24]; 
        const coreV = required.every(i => (lm[i]?.visibility || 0) > 0.5);
        const anklesV = (lm[27]?.visibility || 0) > 0.2 || (lm[28]?.visibility || 0) > 0.2;
        const isSide = Math.abs(lm[11].x - lm[12].x) < 0.22; 
        if (stage === 'calibrating') {
          if (!coreV) setSetupHint("Pokaż sylwetkę");
          else if (!anklesV) setSetupHint("AI nie widzi stóp");
          else if (!isSide) setSetupHint("Stań bokiem");
          else {
            setSetupHint("STÓJ NIERUCHOMO...");
            calibrationFrames.current++;
            setCalibProgress(Math.min(100, (calibrationFrames.current / 30) * 100));
            if (calibrationFrames.current > 30) setWorkoutStage('starting');
          }
        }
        const leftV = (lm[11].visibility || 0) + (lm[23].visibility || 0) + (lm[25].visibility || 0);
        const rightV = (lm[12].visibility || 0) + (lm[24].visibility || 0) + (lm[26].visibility || 0);
        const sIdx = leftV > rightV ? { s: 11, h: 23, k: 25, a: 27, heel: 29, toe: 31 } : { s: 12, h: 24, k: 26, a: 28, heel: 30, toe: 32 };
        const kneeA = Math.round(angleDeg({ x: lm[sIdx.h].x * aspectRatio, y: lm[sIdx.h].y }, { x: lm[sIdx.k].x * aspectRatio, y: lm[sIdx.k].y }, { x: lm[sIdx.a].x * aspectRatio, y: lm[sIdx.a].y }));
        const backT = Math.round(Math.abs(Math.atan2((lm[sIdx.s].x - lm[sIdx.h].x) * aspectRatio, lm[sIdx.h].y - lm[sIdx.s].y) * (180 / Math.PI)));
        const heelDiff = lm[sIdx.toe].y - lm[sIdx.heel].y;
        const rawLifted = heelDiff > 0.07 && (lm[sIdx.heel].visibility || 0) > 0.6;
        if (rawLifted) heelLiftCounter.current = Math.min(10, heelLiftCounter.current + 1); else heelLiftCounter.current = Math.max(0, heelLiftCounter.current - 1);
        const lifted = heelLiftCounter.current > 5; setIsHeelLifted(lifted);
        if (stage === 'active') {
          statsRef.current.totalFrames++; statsRef.current.kneeAngles.push(kneeA); statsRef.current.backAngles.push(backT);
          if (backT > 45) { statsRef.current.poorBackFrames++; speak("Wyprostuj plecy", "back_error", 6000); }
          if (lifted) { statsRef.current.heelLiftFrames++; speak("Przyklej pięty", "heel_error", 5000); }
          const isDeep = kneeA < 105;
          let bColor = "#22c55e"; let bStat = "STABLE";
          if (backT >= 35 && backT <= 45) { bColor = "#f59e0b"; bStat = "WARNING"; } else if (backT > 45) { bColor = "#ef4444"; bStat = "POOR"; }
          ctx.font = "bold 14px monospace"; ctx.shadowBlur = 4; ctx.shadowColor = "black";
          ctx.fillStyle = isDeep ? "#22c55e" : "#f59e0b"; ctx.fillText(`${kneeA}° DEPTH`, lm[sIdx.k].x * width + 15, lm[sIdx.k].y * height);
          ctx.fillStyle = bColor; ctx.fillText(`${backT}° BACK`, lm[sIdx.h].x * width + 15, lm[sIdx.h].y * height);
          if (lifted) { ctx.beginPath(); ctx.strokeStyle = "#ef4444"; ctx.lineWidth = 5; ctx.moveTo(lm[sIdx.heel].x * width - 20, lm[sIdx.heel].y * height + 5); ctx.lineTo(lm[sIdx.heel].x * width + 20, lm[sIdx.heel].y * height + 5); ctx.stroke(); }
          if (kneeA < 110 && phase !== "down") setPhase("down");
          if (kneeA > 160 && phase === "down") { 
            const minKnee = Math.min(...statsRef.current.kneeAngles.slice(-30));
            if (minKnee > 105) { statsRef.current.shallowReps++; speak("Zejdź niżej", "depth_error", 5000); }
            setRepCount(prev => { repCountRef.current = prev + 1; return prev + 1; }); setPhase("up"); 
          }
          ctx.save(); ctx.fillStyle = "rgba(2, 6, 23, 0.9)"; ctx.beginPath(); ctx.roundRect(10, 10, 220, 130, 15); ctx.fill();
          ctx.fillStyle = "#38bdf8"; ctx.font = "bold 18px monospace"; ctx.fillText(`SQUATS: ${repCountRef.current}`, 25, 35);
          ctx.font = "11px monospace"; ctx.fillStyle = isDeep ? "#22c55e" : "#f59e0b"; ctx.fillText(`DEPTH: ${isDeep ? '✓ PERFECT' : '⚠ GO LOWER'}`, 25, 60);
          ctx.fillStyle = bColor; ctx.fillText(`BACK: ${bStat}`, 25, 80);
          ctx.fillStyle = lifted ? "#ef4444" : "#22c55e"; ctx.fillText(`FEET: ${lifted ? '⚠ HEELS UP!' : '✓ GROUNDED'}`, 25, 100); ctx.restore();
        }
        if (window.drawConnectors) window.drawConnectors(ctx, lm, window.POSE_CONNECTIONS, { color: stage === 'active' ? "rgba(56, 189, 248, 0.5)" : "rgba(255, 255, 255, 0.1)", lineWidth: 2 });
      }
    };
    const init = async () => {
      try {
        poseRef.current = new window.Pose({ locateFile: (f) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${f}` });
        poseRef.current.setOptions({ modelComplexity: 1, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
        poseRef.current.onResults(onResults);
        cameraRef.current = new window.Camera(videoRef.current, { 
          onFrame: async () => { if (videoRef.current) await poseRef.current.send({ image: videoRef.current }); }, 
          width: 1280, height: 720 
        });
        await cameraRef.current.start();
      } catch (err) { console.error(err); setSetupHint("Błąd kamery"); }
    };
    init();
    return () => { cameraRef.current?.stop(); poseRef.current?.close(); };
  }, [phase, speak]);

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

// --- MAIN APP COMPONENT ---
export default function App({ onGoToLanding, onGoToLogin, isGuest }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showAchievements, setShowAchievements] = useState(false);
  const [currentView, setCurrentView] = useState('list'); 
  const [muscleFilter, setMuscleFilter] = useState('Wszystkie');
  const [selectedEx, setSelectedEx] = useState({ name: "Przysiady Klasyczne", id: "001", category: "Nogi" });
  const [active, setActive] = useState(false);
  
  // Zaktualizowany stan dla historii treningów
  const [workoutHistory, setWorkoutHistory] = useState([]);
  const [currentWorkoutIndex, setCurrentWorkoutIndex] = useState(0);
  
  const [avatarUrl, setAvatarUrl] = useState(localStorage.getItem('userAvatar') || null);
  const [selectedAchievementId, setSelectedAchievementId] = useState(null);

  const handleWorkoutFinish = (reps, videoURL, debugInfo) => {
    const newWorkout = { 
      name: selectedEx.name, 
      category: selectedEx.category, 
      reps, 
      videoUrl: videoURL, 
      debug: debugInfo, 
      score: debugInfo.score, 
      date: new Date().toLocaleTimeString() 
    };
    
    setWorkoutHistory(prev => {
      const updated = [...prev, newWorkout];
      setCurrentWorkoutIndex(updated.length - 1);
      return updated;
    });
    
    setCurrentView('feedback'); 
    setActive(false);
  };

  const handleAchievementClick = (id) => {
    setSelectedAchievementId(id);
    setCurrentView('profile');
    setShowAchievements(false);
    setTimeout(() => setSelectedAchievementId(null), 1000);
  };

  return (
    <div className="h-[100dvh] w-screen bg-slate-950 text-blue-100 flex overflow-hidden relative font-sans">
      
      {isSidebarOpen && <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] md:hidden" onClick={() => setIsSidebarOpen(false)} />}
      
      <aside className={`bg-slate-900 border-r border-slate-800 flex flex-col transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] z-[110] 
        ${isSidebarOpen ? 'w-80 translate-x-0' : 'w-24 -translate-x-full md:translate-x-0'} 
        fixed md:relative h-full shadow-2xl`}>
        
        <div className="p-6 flex items-center justify-between relative">
          <div className="flex items-center gap-3 min-w-0 cursor-pointer group/logo" onClick={onGoToLanding}>
            <div className="bg-sky-500 p-2.5 rounded-2xl shadow-[0_0_20px_rgba(14,165,233,0.4)] shrink-0 group-hover/logo:scale-110 transition-transform">
              <BrainCircuit className="h-6 w-6 text-slate-950" />
            </div>
            <h1 className={`text-xl font-black uppercase italic tracking-tighter transition-all duration-500 ${isSidebarOpen ? 'opacity-100 max-w-[200px] ml-1' : 'opacity-0 max-w-0 overflow-hidden'}`}>
              FormCheck<span className="text-sky-400">AI</span>
            </h1>
          </div>
          
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className={`group p-2.5 rounded-xl border border-slate-800 bg-slate-950/50 text-slate-400 transition-all duration-300 hover:border-sky-500/50 hover:text-sky-400 hover:shadow-[0_0_15px_rgba(14,165,233,0.2)] ${!isSidebarOpen ? 'md:flex hidden absolute -right-5 top-7 z-50 bg-slate-900 border-slate-700' : ''}`}>
            <ChevronLeft size={18} className={`transition-transform duration-500 ${!isSidebarOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        <nav className="flex-grow px-4 mt-4 space-y-2 overflow-y-auto">
          {[
            { view: 'list', icon: <LayoutGrid size={22} />, label: 'Biblioteka' },
            { view: 'model', icon: <ActivityIcon size={22} />, label: 'Trening' },
            { view: 'feedback', icon: <History size={22} />, label: 'Raport', disabled: workoutHistory.length === 0 },
            { view: 'profile', icon: avatarUrl ? <img src={avatarUrl} alt="avatar" className="w-6 h-6 rounded-full object-cover border border-sky-400" /> : <User size={22} />, label: 'Profil' }
          ].map((item) => (
            <button key={item.view} disabled={item.disabled} onClick={() => { setCurrentView(item.view); if(window.innerWidth < 768) setIsSidebarOpen(false); }} className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all duration-300 group ${item.disabled ? 'opacity-20 cursor-not-allowed' : ''} ${currentView === item.view ? 'bg-sky-500 text-slate-950 shadow-[0_0_25px_rgba(14,165,233,0.3)]' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
              <div className={`shrink-0 transition-transform duration-300 ${currentView === item.view ? 'scale-110' : 'group-hover:scale-110'}`}>{item.icon}</div>
              <span className={`font-black text-xs uppercase tracking-[0.2em] transition-all duration-500 whitespace-nowrap ${isSidebarOpen ? 'opacity-100 max-w-[150px]' : 'opacity-0 max-w-0 overflow-hidden'}`}>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 mb-4">
          <button onClick={() => supabase.auth.signOut()} className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-red-500 hover:bg-red-500/10 transition-all duration-300 group">
            <LogOut size={22} className="shrink-0 group-hover:translate-x-1 transition-transform" />
            <span className={`font-black text-xs uppercase tracking-widest transition-all duration-500 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 max-w-0 overflow-hidden'}`}>Wyloguj</span>
          </button>
        </div>
      </aside>

      <main className="flex-grow flex flex-col p-4 md:p-8 overflow-y-auto relative text-blue-100">
        <header className="flex justify-between items-center mb-6 gap-4">
          <div className="flex items-center gap-4">
            <p className="text-xl md:text-2xl font-black uppercase italic tracking-tight text-white">
              {currentView === 'list' ? 'Eksploruj Bibliotekę' : currentView === 'profile' ? 'Twój Profil' : 'Twoja Sesja AI'}
            </p>
          </div>
          
          <button 
            onClick={() => setShowAchievements(true)}
            className="p-2 bg-slate-900 border border-slate-800 rounded-xl hover:border-amber-500 transition-all group shadow-lg"
          >
            <Medal size={22} className="text-amber-500 group-hover:scale-110 transition-transform" />
          </button>
        </header>

        <div className="flex-grow">
          {currentView === 'feedback' ? (
            <FeedbackPage 
              workouts={workoutHistory} 
              currentIndex={currentWorkoutIndex}
              onNavigate={setCurrentWorkoutIndex}
              isGuest={isGuest} 
              onBack={() => setCurrentView('list')} 
              onSelectNewExercise={(ex) => { setSelectedEx(ex); setCurrentView('model'); }} 
              onLogin={onGoToLogin} 
            />
          ) : currentView === 'profile' ? (
            <UserProfile 
              avatarUrl={avatarUrl} 
              isGuest={isGuest}
              onLogin={onGoToLogin}
              onAvatarChange={(newUrl) => {
                setAvatarUrl(newUrl);
                localStorage.setItem('userAvatar', newUrl);
              }} 
              initialAchievementId={selectedAchievementId}
            />
          ) : (
            <div className="h-full flex flex-col xl:grid xl:grid-cols-2 gap-6">
              <section className="flex flex-col gap-4 min-h-[400px] order-2 xl:order-1">
                <div className="flex-grow bg-slate-900/40 rounded-[2rem] border border-slate-800 overflow-hidden relative shadow-inner">
                  {currentView === 'model' ? (
                    <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center">
                      <Footprints size={120} className="text-sky-900 opacity-20 absolute" />
                      <div className="z-10 bg-slate-950/50 p-6 rounded-3xl border border-slate-800/50 backdrop-blur-sm">
                        <p className="text-sm font-black uppercase text-sky-500 tracking-[0.2em] italic mb-2">Wybrane ćwiczenie</p>
                        <h3 className="text-2xl font-black uppercase mb-4">{selectedEx.name}</h3>
                        <p className="text-[10px] text-slate-400 uppercase font-bold max-w-xs leading-relaxed italic border-t border-slate-800 pt-4">Uruchom AI i ustaw się w polu widzenia, aby rozpocząć analizę.</p>
                      </div>
                    </div>
                  ) : (
                    <GymActivitiesList onSelectActivity={(a) => { setSelectedEx(a); setCurrentView('model'); }} filter={muscleFilter} setFilter={setMuscleFilter} />
                  )}
                </div>
              </section>
              <section className="flex flex-col gap-4 min-h-[450px] order-1 xl:order-2">
                <div className="flex-grow rounded-[2rem] border border-slate-800 overflow-hidden relative shadow-2xl bg-slate-950">
                  {currentView === 'list' ? (
                    <InteractiveModel onSelect={(c) => setMuscleFilter(c.charAt(0).toUpperCase() + c.slice(1).toLowerCase())} currentCategory={muscleFilter.toUpperCase()} />
                  ) : (
                    <CameraView isActive={active} isGuest={isGuest} onWorkoutFinish={handleWorkoutFinish} />
                  )}
                </div>
                <div className="bg-slate-900/80 backdrop-blur-md h-[72px] rounded-2xl border border-slate-800 flex items-center justify-between px-6 shadow-xl">
                  <div className="flex items-center gap-3">
                    <div className={`h-3 w-3 rounded-full ${active ? 'bg-green-500 animate-pulse shadow-[0_0_15px_#22c55e]' : 'bg-red-500'}`} />
                    <p className="hidden xs:block text-[10px] text-slate-400 font-black uppercase tracking-widest uppercase">{active ? 'System Active' : 'System Standby'}</p>
                  </div>
                  {currentView === 'model' && (
                    <button onClick={() => setActive(!active)} className={`flex items-center gap-3 px-10 h-[48px] rounded-2xl border transition-all duration-300 font-black uppercase tracking-widest text-[10px] ${active ? 'bg-red-500 border-red-400 text-white shadow-[0_0_20px_rgba(239,68,68,0.3)]' : 'bg-sky-500 border-sky-400 text-slate-950 shadow-[0_0_20px_rgba(14,165,233,0.4)]'}`}>
                      {active ? <Square size={14} fill="white" /> : <Play size={14} fill="black" />}
                      <span>{active ? 'Zatrzymaj' : 'Uruchom AI'}</span>
                    </button>
                  )}
                </div>
              </section>
            </div>
          )}
        </div>
      </main>

      {/* --- PRAWY SIDEBAR: OSIĄGNIĘCIA --- */}
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
                <h4 className="text-[11px] font-black uppercase italic text-white leading-none mb-1 group-hover:text-amber-500 transition-colors">{a.achievement || 'Mistrz Formy'}</h4>
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
    </div>
  );
};