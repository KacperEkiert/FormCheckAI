import React, { useMemo, useRef, useEffect, useState } from 'react';
import Webcam from "react-webcam";
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import "@tensorflow/tfjs-backend-webgl";
import * as tf from "@tensorflow/tfjs-core";
import { 
  BrainCircuit, Footprints, LayoutGrid, Activity as ActivityIcon, 
  Play, Square, LogOut, Menu, ChevronLeft, Settings, User, History
} from 'lucide-react';

// Zakładam, że te komponenty są w osobnych plikach
import GymActivitiesList from './GymActivitiesList';
import InteractiveModel from './InteractiveModel';
import FeedbackPage from './FeedbackPage';
import { supabase } from './supabaseClient';

// --- LOGIKA ANALIZY KĄTÓW (Bez zmian) ---
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const angleDeg = (a, b, c) => {
  const abx = a.x - b.x; const aby = a.y - b.y;
  const cbx = c.x - b.x; const cby = c.y - b.y;
  const dot = abx * cbx + aby * cby;
  const magAB = Math.hypot(abx, aby); const magCB = Math.hypot(cbx, cby);
  if (magAB === 0 || magCB === 0) return 0;
  return (Math.acos(clamp(dot / (magAB * magCB), -1, 1)) * 180) / Math.PI;
};

const CameraView = ({ isActive, selectedExercise, onWorkoutFinish }) => {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const cameraRef = useRef(null);
  const poseRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const [repCount, setRepCount] = useState(0);
  const [phase, setPhase] = useState("idle");
  const repCountRef = useRef(0);

  useEffect(() => { repCountRef.current = repCount; }, [repCount]);

  useEffect(() => {
    if (isActive) {
      setRepCount(0);
      chunksRef.current = [];
      const stream = webcamRef.current.video.captureStream ? 
                     webcamRef.current.video.captureStream() : 
                     webcamRef.current.video.srcObject;
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'video/webm' });
      mediaRecorderRef.current.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const videoURL = URL.createObjectURL(blob);
        onWorkoutFinish(repCountRef.current, videoURL);
      };
      mediaRecorderRef.current.start();
    } else if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }, [isActive]);

  const onResults = (results) => {
    if (!canvasRef.current || !webcamRef.current?.video) return;
    const ctx = canvasRef.current.getContext("2d");
    const { videoWidth, videoHeight } = webcamRef.current.video;
    canvasRef.current.width = videoWidth;
    canvasRef.current.height = videoHeight;
    ctx.save();
    ctx.clearRect(0, 0, videoWidth, videoHeight);
    ctx.drawImage(results.image, 0, 0, videoWidth, videoHeight);
    if (results.poseLandmarks) {
      if (window.drawConnectors) {
        window.drawConnectors(ctx, results.poseLandmarks, window.POSE_CONNECTIONS, { color: "#38bdf8", lineWidth: 4 });
        window.drawLandmarks(ctx, results.poseLandmarks, { color: "#ffffff", fillColor: "#0ea5e9", lineWidth: 2, radius: 3 });
      }
      const lm = results.poseLandmarks;
      const angle = angleDeg(lm[23], lm[25], lm[27]);
      if (angle < 115 && phase !== "down") setPhase("down");
      if (angle > 160 && phase === "down") { setRepCount(prev => prev + 1); setPhase("up"); }
      ctx.save(); ctx.scale(-1, 1);
      ctx.fillStyle = "rgba(2,6,23,0.8)"; ctx.fillRect(-videoWidth + 10, 10, 180, 50);
      ctx.fillStyle = "#38bdf8"; ctx.font = "bold 24px monospace";
      ctx.fillText(`REPS: ${repCount}`, -videoWidth + 25, 45);
      ctx.restore();
    }
    ctx.restore();
  };

  useEffect(() => {
    const initPose = async () => {
      poseRef.current = new window.Pose({ locateFile: (f) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${f}` });
      poseRef.current.setOptions({ modelComplexity: 1, minDetectionConfidence: 0.5 });
      poseRef.current.onResults(onResults);
      cameraRef.current = new window.Camera(webcamRef.current.video, {
        onFrame: async () => { if(poseRef.current) await poseRef.current.send({ image: webcamRef.current.video }); },
        width: 1280, height: 720
      });
      cameraRef.current.start();
    };
    initPose();
    return () => { cameraRef.current?.stop(); poseRef.current?.close(); };
  }, []);

  return (
    <div className="relative w-full h-full bg-slate-950 rounded-[2rem] border border-slate-800 overflow-hidden shadow-2xl">
      <Webcam audio={false} ref={webcamRef} className="hidden" muted />
      <canvas ref={canvasRef} className="w-full h-full object-cover scale-x-[-1]" />
    </div>
  );
};

export default function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [currentView, setCurrentView] = useState('list'); // 'list', 'model', 'feedback'
  const [muscleFilter, setMuscleFilter] = useState('Wszystkie');
  const [selectedEx, setSelectedEx] = useState({ name: "Brak wyboru", id: "000", category: "Wszystkie" });
  const [active, setActive] = useState(false);
  const [lastWorkout, setLastWorkout] = useState(null);

  const handleWorkoutFinish = (reps, videoURL) => {
    setLastWorkout({
      name: selectedEx.name, category: selectedEx.category,
      reps: reps, videoUrl: videoURL,
      score: 85 + Math.floor(Math.random() * 10), date: new Date().toLocaleTimeString()
    });
    setCurrentView('feedback'); // Automatyczne przejście do feedbacku wewnątrz dashboardu
    setActive(false);
  };

  return (
    <div className="h-screen w-screen bg-slate-950 text-blue-100 flex overflow-hidden relative">
      
      {/* --- SIDEBAR --- */}
      <aside className={`bg-slate-900 border-r border-slate-800 flex flex-col transition-all duration-500 ease-in-out z-50 ${isSidebarOpen ? 'w-80' : 'w-20'}`}>
        <div className={`p-6 flex transition-all duration-500 ${isSidebarOpen ? 'flex-row items-center justify-between' : 'flex-col items-center gap-8'}`}>
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`p-1.5 hover:bg-slate-800 rounded-lg text-slate-500 transition-colors shrink-0 ${!isSidebarOpen ? 'order-first' : 'order-last'}`}
          >
            {isSidebarOpen ? <ChevronLeft size={20}/> : <Menu size={20}/>}
          </button>

          <div className="flex items-center gap-3 min-w-0">
            <div className="bg-sky-500 p-2 rounded-xl shrink-0 shadow-[0_0_15px_rgba(14,165,233,0.4)]">
              <BrainCircuit className="h-6 w-6 text-slate-950" />
            </div>
            <h1 className={`text-xl font-black tracking-tighter uppercase italic whitespace-nowrap transition-all duration-500 overflow-hidden ${isSidebarOpen ? 'opacity-100 max-w-[200px] ml-1' : 'opacity-0 max-w-0 ml-0'}`}>
              FormCheck<span className="text-sky-400">AI</span>
            </h1>
          </div>
        </div>

        <nav className="flex-grow px-3 mt-4 space-y-2 custom-scrollbar overflow-y-auto">
          {/* Klasa scrollbar-custom powinna być też dodana tutaj w nawigacji, jeśli jest długa */}
          <button onClick={() => setCurrentView('list')} className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all ${currentView === 'list' ? 'bg-sky-500 text-slate-950 shadow-[0_0_20px_rgba(14,165,233,0.3)]' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            <LayoutGrid size={22} className="shrink-0" />
            <span className={`font-bold text-sm uppercase tracking-widest whitespace-nowrap transition-all duration-500 overflow-hidden ${isSidebarOpen ? 'opacity-100 max-w-[150px]' : 'opacity-0 max-w-0'}`}>Biblioteka</span>
          </button>

          <button onClick={() => setCurrentView('model')} className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all ${currentView === 'model' ? 'bg-sky-500 text-slate-950 shadow-[0_0_20px_rgba(14,165,233,0.3)]' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            <ActivityIcon size={22} className="shrink-0" />
            <span className={`font-bold text-sm uppercase tracking-widest whitespace-nowrap transition-all duration-500 overflow-hidden ${isSidebarOpen ? 'opacity-100 max-w-[150px]' : 'opacity-0 max-w-0'}`}>Trening</span>
          </button>

          <button onClick={() => lastWorkout && setCurrentView('feedback')} disabled={!lastWorkout} className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all ${currentView === 'feedback' ? 'bg-sky-500 text-slate-950 shadow-[0_0_20px_rgba(14,165,233,0.3)]' : !lastWorkout ? 'opacity-20 cursor-not-allowed' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            <History size={22} className="shrink-0" />
            <span className={`font-bold text-sm uppercase tracking-widest whitespace-nowrap transition-all duration-500 overflow-hidden ${isSidebarOpen ? 'opacity-100 max-w-[150px]' : 'opacity-0 max-w-0'}`}>Ostatni trening</span>
          </button>

          <div className="pt-4 border-t border-slate-800/50 my-4"></div>
          
          <button className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-slate-400 hover:bg-slate-800 hover:text-white transition-all">
            <User size={22} className="shrink-0" />
            <span className={`font-bold text-sm uppercase tracking-widest whitespace-nowrap transition-all duration-500 overflow-hidden ${isSidebarOpen ? 'opacity-100 max-w-[150px]' : 'opacity-0 max-w-0'}`}>Profil</span>
          </button>
        </nav>

        <div className="p-3 mb-4">
          <button onClick={() => supabase.auth.signOut()} className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-red-500 hover:bg-red-500/10 transition-all">
            <LogOut size={22} className="shrink-0" />
            <span className={`font-bold text-sm uppercase tracking-widest whitespace-nowrap transition-all duration-500 overflow-hidden ${isSidebarOpen ? 'opacity-100 max-w-[150px]' : 'opacity-0 max-w-0'}`}>Wyloguj</span>
          </button>
        </div>
      </aside>

      {/* --- MAIN CONTENT --- */}
      {/* NAPRAWA SCROLLA W APP:
          Dodano klasy: overflow-y-auto, scrollbar-custom, pr-4
          Dzięki temu główny dashboard ma dopasowany scrollbar i odstęp od kart.
      */}
      <main className="flex-grow flex flex-col p-4 lg:p-8 overflow-y-auto scrollbar-custom pr-4">
        <header className="flex justify-between items-center mb-6 shrink-0">
          <div>
            <h2 className="text-sm font-black uppercase tracking-[0.3em] text-slate-500">System Dashboard</h2>
            <p className="text-2xl font-black uppercase italic tracking-tight text-white">
              {currentView === 'list' ? 'Eksploruj ' : currentView === 'feedback' ? 'Analiza ' : 'Twoja '} 
              <span className="text-sky-400">
                {currentView === 'list' ? 'Bibliotekę' : currentView === 'feedback' ? 'Treningu' : 'Sesja AI'}
              </span>
            </p>
          </div>
          <div className="h-10 w-10 bg-slate-800 rounded-full border border-slate-700 flex items-center justify-center">
             <Settings size={20} className="text-slate-400" />
          </div>
        </header>

        {/* Dynamiczny Render Widoków */}
        <div className="flex-grow min-h-0">
          {currentView === 'feedback' ? (
            <FeedbackPage 
              workoutData={lastWorkout} 
              onBack={() => setCurrentView('list')} 
              onSelectNewExercise={(ex) => { setSelectedEx(ex); setCurrentView('model'); }}
            />
          ) : (
            <div className="h-full grid grid-cols-1 lg:grid-cols-2 gap-6">
              <section className="flex flex-col gap-4 min-h-0">
                <div className="flex-grow bg-slate-900/40 rounded-[2.5rem] border border-slate-800 overflow-hidden shadow-inner relative">
                  {currentView === 'model' ? (
                    <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center">
                       <Footprints size={120} className="text-sky-900 opacity-20 absolute" />
                       <div className="z-10 bg-slate-950/50 p-6 rounded-3xl border border-slate-800/50 backdrop-blur-sm">
                         <p className="text-sm font-black uppercase text-sky-500 tracking-[0.2em] italic mb-2">Trening w toku</p>
                         <h3 className="text-2xl font-black uppercase tracking-tighter mb-4">{selectedEx.name}</h3>
                         <p className="text-[10px] text-slate-400 uppercase font-bold max-w-xs mx-auto leading-relaxed italic border-t border-slate-800 pt-4">
                            Ustaw kamerę stabilnie. AI automatycznie zliczy powtórzenia.
                         </p>
                       </div>
                    </div>
                  ) : (
                    <GymActivitiesList 
                      onSelectActivity={(a) => { setSelectedEx(a); setCurrentView('model'); }} 
                      filter={muscleFilter} setFilter={setMuscleFilter} 
                    />
                  )}
                </div>
              </section>

              <section className="flex flex-col gap-4 min-h-0">
                <div className="flex-grow rounded-[2.5rem] border border-slate-800 overflow-hidden relative shadow-2xl bg-slate-950">
                  {currentView === 'list' ? (
                    <InteractiveModel 
                      onSelect={(c) => setMuscleFilter(c.charAt(0).toUpperCase() + c.slice(1).toLowerCase())} 
                      currentCategory={muscleFilter.toUpperCase()} 
                    />
                  ) : (
                    <CameraView isActive={active} selectedExercise={selectedEx.name} onWorkoutFinish={handleWorkoutFinish} />
                  )}
                </div>
                
                <div className="bg-slate-900/80 backdrop-blur-md h-[72px] rounded-2xl border border-slate-800 flex items-center justify-between px-6 shrink-0 shadow-xl">
                  <div className="flex items-center gap-3">
                    <div className={`h-3 w-3 rounded-full transition-all duration-300 ${active ? 'bg-green-500 animate-pulse shadow-[0_0_15px_#22c55e]' : 'bg-red-500'}`} />
                    <p className="text-[10px] text-slate-400 font-black tracking-widest uppercase">{active ? 'Live Analysis' : 'Engine Standby'}</p>
                  </div>

                  {currentView === 'model' && (
                    <button 
                      onClick={() => setActive(!active)} 
                      className={`flex items-center gap-3 px-10 h-[48px] rounded-2xl border transition-all duration-300 font-black uppercase tracking-widest text-[10px] 
                        ${active ? 'bg-red-500 border-red-400 text-white' : 'bg-sky-500 border-sky-400 text-slate-950'}`}
                    >
                      {active ? <Square size={14} fill="white" /> : <Play size={14} fill="black" />}
                      {active ? 'Zatrzymaj' : 'Uruchom AI'}
                    </button>
                  )}
                </div>
              </section>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}