import React, { useState, useRef, useEffect } from 'react';
import Webcam from "react-webcam";
import { 
  BrainCircuit, Footprints, AlertTriangle, 
  CameraOff, LayoutGrid, Activity as ActivityIcon, Play, Square 
} from 'lucide-react';

import GymActivitiesList from './GymActivitiesList';

const CameraView = ({ isActive, feedback }) => {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const cameraRef = useRef(null);

  const onResults = (results) => {
    if (!canvasRef.current || !webcamRef.current?.video) return;
    const canvasCtx = canvasRef.current.getContext("2d");
    const videoWidth = webcamRef.current.video.videoWidth;
    const videoHeight = webcamRef.current.video.videoHeight;
    canvasRef.current.width = videoWidth;
    canvasRef.current.height = videoHeight;
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, videoWidth, videoHeight);
    canvasCtx.drawImage(results.image, 0, 0, videoWidth, videoHeight);
    if (results.poseLandmarks && window.drawConnectors) {
      window.drawConnectors(canvasCtx, results.poseLandmarks, window.POSE_CONNECTIONS, { color: "#38bdf8", lineWidth: 4 });
      window.drawLandmarks(canvasCtx, results.poseLandmarks, { color: "#ffffff", fillColor: "#0ea5e9", lineWidth: 2, radius: 4 });
    }
    canvasCtx.restore();
  };

  useEffect(() => {
    let pose = null;
    const initPose = async () => {
      if (isActive && window.Pose) {
        pose = new window.Pose({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}` });
        pose.setOptions({ modelComplexity: 1, smoothLandmarks: true, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
        pose.onResults(onResults);
        if (webcamRef.current?.video && window.Camera) {
          cameraRef.current = new window.Camera(webcamRef.current.video, {
            onFrame: async () => { if (webcamRef.current?.video) await pose.send({ image: webcamRef.current.video }); },
            width: 1280, height: 720,
          });
          cameraRef.current.start();
        }
      }
    };
    initPose();
    return () => { if (cameraRef.current) cameraRef.current.stop(); if (pose) pose.close(); };
  }, [isActive]);

  return (
    <div className="relative w-full h-full bg-slate-950 rounded-2xl border-4 border-slate-700 overflow-hidden shadow-2xl flex items-center justify-center">
      {isActive ? (
        <>
          <Webcam audio={false} ref={webcamRef} className="hidden" />
          <canvas ref={canvasRef} className="w-full h-full object-cover scale-x-[-1]" />
        </>
      ) : (
        <div className="flex flex-col items-center gap-4 text-slate-700">
          <CameraOff size={64} className="opacity-20" />
          <p className="text-sm font-mono tracking-widest uppercase opacity-40">Kamera nieaktywna</p>
        </div>
      )}
      {feedback && isActive && (
        <div className="absolute top-4 right-4 left-4 bg-slate-900/95 p-4 rounded-xl border-l-4 border-amber-400 flex items-center gap-4 shadow-2xl animate-bounce z-50">
          <AlertTriangle className="text-amber-400 h-8 w-8 shrink-0" />
          <div><h4 className="text-amber-300 font-bold text-xs uppercase tracking-wider">Korekta AI</h4><p className="text-blue-50 font-medium text-lg leading-tight">{feedback}</p></div>
        </div>
      )}
    </div>
  );
};

const Placeholder3DModel = ({ onBodyPartClick, activePart }) => (
  <div className="relative w-full h-full bg-slate-900 rounded-2xl border border-slate-700 p-6 flex flex-col items-center justify-center group overflow-hidden">
    <Footprints size={120} className="text-blue-950 absolute scale-150 rotate-12 opacity-50" />
    <div className="text-center z-10">
      <p className="text-xl font-black text-blue-100 uppercase tracking-widest italic leading-tight">Interaktywny<br/>Model 3D</p>
      <p className="text-[10px] text-slate-500 mt-2 font-mono uppercase italic tracking-tighter">Skeleton Mode</p>
    </div>
    <div onClick={() => onBodyPartClick('Nogi - Przysiad')} className="absolute inset-0 cursor-pointer z-20" />
  </div>
);

export default function App() {
  const [selectedMuscle, setSelectedMuscle] = useState({ name: "Brak wyboru", id: "000" });
  const [trainingActive, setTrainingActive] = useState(false);
  const [currentView, setCurrentView] = useState('model');

  const handleActivitySelect = (activity) => {
    setSelectedMuscle({ name: activity.name, id: activity.id < 10 ? `00${activity.id}` : `0${activity.id}` });
    setCurrentView('model');
  };

  const handleModelClick = (name) => { setSelectedMuscle({ name: name, id: "M-01" }); };

  return (
    <div className="min-h-screen bg-slate-950 text-blue-100 p-4 md:p-8 flex flex-col gap-6">
      <header className="flex flex-col md:flex-row items-center justify-between p-5 bg-slate-900 rounded-2xl shadow-xl border border-slate-800 gap-4">
        <div className="flex items-center gap-4">
          <BrainCircuit className="h-10 w-10 text-sky-400" />
          <h1 className="text-2xl md:text-3xl font-black tracking-tighter uppercase italic text-blue-50">
            Form<span className="text-sky-400">Check</span><span className="text-slate-600 font-light ml-1 text-sm italic">AI</span>
          </h1>
        </div>
        <nav className="flex gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800">
          <button onClick={() => setCurrentView('model')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${currentView === 'model' ? 'bg-sky-500 text-slate-950' : 'text-slate-500 hover:text-sky-400'}`}>
            <ActivityIcon size={14} /> Trening
          </button>
          <button onClick={() => setCurrentView('list')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${currentView === 'list' ? 'bg-sky-500 text-slate-950' : 'text-slate-500 hover:text-sky-400'}`}>
            <LayoutGrid size={14} /> Biblioteka
          </button>
        </nav>
      </header>

      <main className="flex-grow grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-10">
        <section className="flex flex-col gap-4">
          <div className="flex-grow min-h-[450px]">
            {currentView === 'model' ? <Placeholder3DModel onBodyPartClick={handleModelClick} activePart={selectedMuscle.name} /> : <GymActivitiesList onSelectActivity={handleActivitySelect} />}
          </div>
          {currentView === 'model' && (
            <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex items-center justify-between shadow-lg h-[64px]">
              <p className="text-[10px] text-slate-600 font-mono tracking-widest uppercase px-2">Wybrane: <span className="text-sky-400 font-bold">{selectedMuscle.name}</span></p>
              <div className="px-2"><span className="text-[9px] text-sky-500 font-black uppercase tracking-tighter bg-sky-500/10 border border-sky-500/20 px-2 py-1 rounded">#{selectedMuscle.id}</span></div>
            </div>
          )}
        </section>

        <section className="flex flex-col gap-4">
          <div className="flex-grow min-h-[450px]"><CameraView isActive={trainingActive} feedback={trainingActive ? "System kalibruje..." : null} /></div>
          <div className="bg-slate-900 p-2 pl-6 rounded-2xl border border-slate-800 flex items-center justify-between shadow-lg h-[64px]">
            <div className="flex items-center gap-3">
              <div className={`h-2.5 w-2.5 rounded-full transition-all duration-500 ${!trainingActive ? 'bg-red-500' : (trainingActive && !window.drawConnectors) ? 'bg-amber-500 animate-pulse' : 'bg-green-500'}`}></div>
              <p className="text-[10px] text-slate-400 font-mono tracking-widest uppercase">Status: <span className={`font-bold ${!trainingActive ? "text-red-500" : (trainingActive && !window.drawConnectors) ? "text-amber-500" : "text-green-500"}`}>{selectedMuscle.id === "000" ? 'Oczekiwanie na wybór' : !trainingActive ? 'System wstrzymany' : 'Analiza AI Live'}</span></p>
            </div>
            <button onClick={() => setTrainingActive(!trainingActive)} disabled={selectedMuscle.id === "000" && !trainingActive} className={`flex items-center gap-3 px-8 h-full rounded-xl border transition-all duration-300 font-black uppercase tracking-[0.2em] text-[10px] ${trainingActive ? 'bg-red-500/10 border-red-500 text-red-500' : (selectedMuscle.id === "000") ? 'bg-slate-800 border-slate-700 text-slate-600 cursor-not-allowed' : 'bg-sky-500/10 border-sky-500 text-sky-500 hover:bg-sky-500 hover:text-slate-950'}`}>
              {trainingActive ? <Square size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}{trainingActive ? 'Zatrzymaj' : (selectedMuscle.id === "000" ? 'Wybierz ćwiczenie' : 'Uruchom AI')}
            </button>
          </div>
        </section>
      </main>

      {/* PRZYWRÓCONA STOPKA */}
      <footer className="text-center text-[10px] text-slate-800 font-mono tracking-[0.4em] uppercase py-4 border-t border-slate-900/50 relative z-0">
        FormCheck AI | Sprint 1 Prototype | Build 0426
      </footer>
    </div>
  );
}