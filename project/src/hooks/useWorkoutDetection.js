import { useRef, useEffect, useState, useCallback } from 'react';
import { angleDeg, createSpeakFunction } from '../utils';

export const useWorkoutDetection = (isActive, isGuest, onWorkoutFinish) => {
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
  const phaseRef = useRef("idle");
  const stageRef = useRef('idle');
  const statsRef = useRef({ kneeAngles: [], backAngles: [], shallowReps: 0, poorBackFrames: 0, heelLiftFrames: 0, totalFrames: 0 });
  const repCountRef = useRef(0);
  const calibrationFrames = useRef(0);
  const heelLiftCounter = useRef(0);

  const speak = useCallback((text, type, cooldown = 4000) => {
    createSpeakFunction(lastSpokenRef)(text, type, cooldown);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      const handleVoicesChanged = () => window.speechSynthesis.getVoices();
      window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);
      return () => window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
    }
  }, []);
  
  useEffect(() => { stageRef.current = workoutStage; }, [workoutStage]);

  useEffect(() => {
    if (isActive) {
      statsRef.current = { kneeAngles: [], backAngles: [], shallowReps: 0, poorBackFrames: 0, heelLiftFrames: 0, totalFrames: 0 };
      const timer = setTimeout(() => {
        setWorkoutStage('calibrating');
        setRepCount(0); repCountRef.current = 0;
        calibrationFrames.current = 0; setCalibProgress(0);
        setTimeLeft(isGuest ? 60 : 300);
        setCountdown(isGuest ? 10 : 5);
        phaseRef.current = "idle";
        setPhase("idle");
      }, 0);
      return () => clearTimeout(timer);
    } else {
      if (mediaRecorderRef.current?.state === "recording") {
        try { mediaRecorderRef.current.stop(); } catch(e) { console.error(e); }
      }
      const timer = setTimeout(() => setWorkoutStage('idle'), 0);
      return () => clearTimeout(timer);
    }
  }, [isActive, isGuest]);

  useEffect(() => {
    let timer;
    if (workoutStage === 'starting') {
      timer = setInterval(() => {
        setCountdown(c => {
          if (c <= 1) {
            clearInterval(timer);
            setWorkoutStage('active');
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
            return 0;
          }
          if (c <= 4) speak((c-1).toString(), "countdown", 900);
          return c - 1;
        });
      }, 1000);
    } else if (workoutStage === 'active') {
      timer = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) {
            clearInterval(timer);
            if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
            setWorkoutStage('idle');
            return 0;
          }
          if (t === 11) speak("Ostatnie 10 sekund!", "time_warning", 1000);
          return t - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [workoutStage, onWorkoutFinish, speak]);

  useEffect(() => {
    if (!videoRef.current || !isActive) return;

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
          
          if (kneeA < 110 && phaseRef.current !== "down") {
            phaseRef.current = "down";
            setPhase("down");
          }
          if (kneeA > 160 && phaseRef.current === "down") { 
            const minKnee = Math.min(...statsRef.current.kneeAngles.slice(-30));
            if (minKnee > 105) { statsRef.current.shallowReps++; speak("Zejdź niżej", "depth_error", 5000); }
            setRepCount(prev => { repCountRef.current = prev + 1; return prev + 1; }); 
            phaseRef.current = "up";
            setPhase("up"); 
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

    let isDestroyed = false;
    const init = async () => {
      try {
        if (!window.Pose) return;
        poseRef.current = new window.Pose({ locateFile: (f) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${f}` });
        poseRef.current.setOptions({ modelComplexity: 1, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
        poseRef.current.onResults(onResults);
        cameraRef.current = new window.Camera(videoRef.current, { 
          onFrame: async () => { 
            if (videoRef.current && poseRef.current && !isDestroyed) {
              await poseRef.current.send({ image: videoRef.current }); 
            }
          }, 
          width: 1280, height: 720 
        });
        await cameraRef.current.start();
      } catch (err) { 
        if (!isDestroyed) {
          console.error(err); setSetupHint("Błąd kamery"); 
        }
      }
    };
    init();
    return () => { 
      isDestroyed = true;
      cameraRef.current?.stop(); 
      poseRef.current?.close(); 
    };
  }, [isActive, speak]);

  return {
    videoRef,
    canvasRef,
    workoutStage,
    repCount,
    phase,
    setupHint,
    calibProgress,
    isHeelLifted,
    timeLeft,
    countdown
  };
};
