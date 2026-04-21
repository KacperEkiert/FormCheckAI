import { useRef, useEffect, useState, useCallback } from 'react';
import { angleDeg, createSpeakFunction, clamp } from '../utils';

// Konfiguracja progów tolerancji (Magic Numbers)
const CONFIG = {
  SQUAT_PHASE_KNEE_ANGLE: 162,       // Zwiększono z 150, aby analiza zaczynała się szybciej
  BACK_ROUNDED_ANGLE: 160,           // Zmniejszono rygor z 165 na 160
  BACK_LEAN_MAX: 55,                 // Zmniejszono rygor z 50 na 55
  BACK_LEAN_WARNING: 40,
  HEEL_LIFT_THRESHOLD_Y: 0.03,       // Zmniejszono - 0.03 było zbyt "twarde"
  HEEL_LIFT_THRESHOLD_DIFF: 0.01,    // Nowy parametr: czułość relacji pięta-palce
  HEEL_LIFT_FRAMES_REQUIRED: 18,     // Zwiększono z 10 na 18 dla ekstremalnej pewności błędu
  REP_DOWN_ANGLE: 90,                // Zmniejszono z 110
  REP_UP_ANGLE: 160,                 // Zmniejszono z 165
  REP_COOLDOWN_MS: 1000,             // Zmniejszono z 1200
  DEPTH_WARNING_ANGLE: 100,          // Zmniejszono z 110
  DEPTH_PERFECT_ANGLE: 85            // Zmniejszono z 105
};

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

  const [qualityAlert, setQualityAlert] = useState(null);

  const lastSpokenRef = useRef({});
  const phaseRef = useRef("idle");
  const stageRef = useRef('idle');
  const statsRef = useRef({ kneeAngles: [], backAngles: [], shallowReps: 0, poorBackFrames: 0, heelLiftFrames: 0, totalFrames: 0 });
  const repCountRef = useRef(0);
  const calibrationFrames = useRef(0);
  const heelLiftCounter = useRef(0);
  const lastRepTime = useRef(0);
  const initialHeelToeDistL = useRef(null);
  const initialHeelToeDistR = useRef(null);
  const fpsRef = useRef(0);
  const lastFrameTime = useRef(0);

  // Smoothing refs
  const smoothKneeAngle = useRef(180);
  const smoothBackAngle = useRef(0);
  const smoothHeadBackAngle = useRef(0);

  const speak = useCallback((text, type, cooldown = 4000, cancelPrevious = false) => {
    createSpeakFunction(lastSpokenRef)(text, type, cooldown, cancelPrevious);
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
        setQualityAlert(null);
        lastFrameTime.current = Date.now();
      }, 0);
      return () => clearTimeout(timer);
    } else {
      if (mediaRecorderRef.current?.state === "recording") {
        try { mediaRecorderRef.current.stop(); } catch (e) { console.error(e); }
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
                  knee: { min: s.kneeAngles.length ? Math.min(...s.kneeAngles) : 0, avg: s.kneeAngles.length ? Math.round(s.kneeAngles.reduce((a, b) => a + b, 0) / s.kneeAngles.length) : 0 },
                  back: { max: s.backAngles.length ? Math.max(...s.backAngles) : 0, avg: s.backAngles.length ? Math.round(s.backAngles.reduce((a, b) => a + b, 0) / s.backAngles.length) : 0 },
                  faults: { heelLiftPct: Math.round((s.heelLiftFrames / total) * 100) || 0, poorBackPct: Math.round((s.poorBackFrames / total) * 100) || 0, shallowReps: s.shallowReps },
                  score: score, samples: total
                });
              };
              mediaRecorderRef.current.start();
            }
            return 0;
          }
          if (c <= 4) speak((c - 1).toString(), "countdown", 500, true);
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
      const now = Date.now();
      const delta = now - lastFrameTime.current;
      lastFrameTime.current = now;
      fpsRef.current = Math.round(1000 / delta);

      const ctx = canvasRef.current.getContext("2d");
      const { width, height } = results.image;
      if (canvasRef.current.width !== width) { canvasRef.current.width = width; canvasRef.current.height = height; }
      ctx.save(); ctx.clearRect(0, 0, width, height); ctx.drawImage(results.image, 0, 0, width, height); ctx.restore();

      if (results.poseLandmarks) {
        const lm = results.poseLandmarks;
        const aspectRatio = width / height;
        const stage = stageRef.current;

        // --- Jakosc Kamery / Widocznosc ---
        const criticalPoints = [23, 24, 25, 26, 27, 28]; // Hips, Knees, Ankles
        const avgVisibility = criticalPoints.reduce((acc, i) => acc + (lm[i]?.visibility || 0), 0) / criticalPoints.length;

        let alertMessage = null;
        if (avgVisibility < 0.65) {
          alertMessage = "SŁABA WIDOCZNOŚĆ - APLIKACJA MOŻE POPEŁNIAĆ BŁĘDY";
        } else if (fpsRef.current > 0 && fpsRef.current < 15) {
          alertMessage = "NISKA PŁYNNOŚĆ WIDEO - APLIKACJA MOŻE POPEŁNIAĆ BŁĘDY";
        }
        setQualityAlert(alertMessage);

        const required = [11, 12, 23, 24];
        const coreV = required.every(i => (lm[i]?.visibility || 0) > 0.5);
        const anklesV = (lm[27]?.visibility || 0) > 0.3 && (lm[28]?.visibility || 0) > 0.3;
        const isSide = Math.abs(lm[11].x - lm[12].x) < 0.3;

        const isLeftDominant = (lm[11].visibility || 0) + (lm[23].visibility || 0) + (lm[25].visibility || 0) > (lm[12].visibility || 0) + (lm[24].visibility || 0) + (lm[26].visibility || 0);
        const sIdx = isLeftDominant ? { s: 11, h: 23, k: 25, a: 27, heel: 29, toe: 31, ear: 7, isLeft: true } : { s: 12, h: 24, k: 26, a: 28, heel: 30, toe: 32, ear: 8, isLeft: false };

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

        // --- Wyliczanie Kątów z Wygładzaniem ---
        const currentFps = fpsRef.current || 30;
        // Zmniejszamy wygładzanie przy niskich FPS (wyższa alpha), aby system szybciej reagował na zmiany i nie przegapił powtórzenia
        const alpha = currentFps < 20 ? 0.6 : clamp(currentFps / 60, 0.3, 0.5);

        const rawKneeA = Math.round(angleDeg({ x: lm[sIdx.h].x * aspectRatio, y: lm[sIdx.h].y }, { x: lm[sIdx.k].x * aspectRatio, y: lm[sIdx.k].y }, { x: lm[sIdx.a].x * aspectRatio, y: lm[sIdx.a].y }));
        const rawBackT = Math.round(Math.abs(Math.atan2((lm[sIdx.s].x - lm[sIdx.h].x) * aspectRatio, lm[sIdx.h].y - lm[sIdx.s].y) * (180 / Math.PI)));

        // Kąt głowa-bark-biodro do wykrywania "garbienia się"
        const rawHeadBack = Math.round(angleDeg({ x: lm[sIdx.ear].x * aspectRatio, y: lm[sIdx.ear].y }, { x: lm[sIdx.s].x * aspectRatio, y: lm[sIdx.s].y }, { x: lm[sIdx.h].x * aspectRatio, y: lm[sIdx.h].y }));

        // --- Kalkulacja dystansu pięty dla aktywnej stopy ---
        const activeDist = Math.abs(lm[sIdx.heel].y - lm[sIdx.toe].y);

        // Zapisujemy dystans, gdy użytkownik stoi (tylko przy wysokiej pewności landmarków)
        if (rawKneeA > 172 && (lm[sIdx.heel].visibility || 0) > 0.8 && (lm[sIdx.toe].visibility || 0) > 0.8) {
          const currentInit = sIdx.isLeft ? initialHeelToeDistL.current : initialHeelToeDistR.current;
          
          // Jeśli nowo zmierzony dystans jest większy, aktualizujemy od razu (stopa jest bardziej płasko)
          // Jeśli jest mniejszy, aktualizujemy bardzo powoli, aby uniknąć driftu przy staniu na palcach
          if (currentInit === null || activeDist > currentInit) {
            if (sIdx.isLeft) initialHeelToeDistL.current = activeDist;
            else initialHeelToeDistR.current = activeDist;
          } else {
            // Bardzo wolna adaptacja w dół (np. gdy użytkownik oddali się od kamery)
            if (sIdx.isLeft) initialHeelToeDistL.current = initialHeelToeDistL.current * 0.99 + activeDist * 0.01;
            else initialHeelToeDistR.current = initialHeelToeDistR.current * 0.99 + activeDist * 0.01;
          }
        }

        smoothKneeAngle.current = Math.round(alpha * rawKneeA + (1 - alpha) * smoothKneeAngle.current);
        smoothBackAngle.current = Math.round(alpha * rawBackT + (1 - alpha) * smoothBackAngle.current);
        smoothHeadBackAngle.current = Math.round(alpha * rawHeadBack + (1 - alpha) * smoothHeadBackAngle.current);

        const kneeA = smoothKneeAngle.current;
        const backT = smoothBackAngle.current;
        const headBackA = smoothHeadBackAngle.current;

        const isSquattingPhase = kneeA < CONFIG.SQUAT_PHASE_KNEE_ANGLE;

        // --- Detekcja odrywania pięt (Heel-to-Toe Ratio) tylko dla stopy z przodu ---
        let isCurrentlyLifted = false;
        const activeInitDist = sIdx.isLeft ? initialHeelToeDistL.current : initialHeelToeDistR.current;
        
        // Obliczamy też surową różnicę (heel.y - toe.y). 
        // Jeśli pięta idzie w górę, jej Y maleje, więc ta różnica staje się mniejsza (bardziej ujemna).
        const currentRelY = lm[sIdx.heel].y - lm[sIdx.toe].y;

        // Błąd jeśli dystans spadł o 16% LUB wzrósł o 35% (poluzowano rygor)
        if (activeInitDist && (activeDist < activeInitDist * 0.84 || activeDist > activeInitDist * 1.35)) {
          isCurrentlyLifted = true;
        }
        // Usunięto isSquattingPhase, aby błąd był widoczny nawet przy pozycji stojącej (ułatwia testowanie)
        isCurrentlyLifted = isCurrentlyLifted && (lm[sIdx.heel].visibility || 0) > 0.5;

        if (isCurrentlyLifted) heelLiftCounter.current = Math.min(30, heelLiftCounter.current + 2); 
        else heelLiftCounter.current = Math.max(0, heelLiftCounter.current - 1);
        const isHeelLiftedActive = heelLiftCounter.current > CONFIG.HEEL_LIFT_FRAMES_REQUIRED;
        setIsHeelLifted(isHeelLiftedActive);

        const isReady = coreV && anklesV && isSide;

        if (stage === 'active') {
          if (!isReady) {
            // Użytkownik idzie do kamery wyłączyć trening lub jest poza dobrą pozycją. Wstrzymujemy detekcję błędów.
            ctx.save();
            ctx.fillStyle = "rgba(239, 68, 68, 0.9)";
            ctx.beginPath(); ctx.roundRect(20, height / 2 - 40, 260, 80, 15); ctx.fill();
            ctx.fillStyle = "white"; ctx.font = "bold 16px monospace"; ctx.textAlign = "center";
            ctx.fillText("POZA POZYCJĄ", 150, height / 2 - 5);
            ctx.font = "14px monospace";
            ctx.fillText("(WRÓĆ BOKIEM)", 150, height / 2 + 20);
            ctx.restore();

            // Prosty HUD bez detali kątów, aby interfejs nie migotał
            ctx.save(); ctx.fillStyle = "rgba(2, 6, 23, 0.9)"; ctx.beginPath(); ctx.roundRect(10, 10, 240, 150, 15); ctx.fill();
            ctx.fillStyle = "#38bdf8"; ctx.font = "bold 18px monospace"; ctx.fillText(`SQUATS: ${repCountRef.current}`, 25, 35);
            ctx.font = "11px monospace"; ctx.fillStyle = "#f59e0b"; ctx.fillText(`STATUS: ⚠ POZA POZYCJĄ`, 25, 60);
            ctx.fillStyle = alertMessage ? "#ef4444" : "#22c55e"; ctx.fillText(`CAM: ${fpsRef.current} FPS`, 25, 120);
            ctx.restore();
          } else {
            statsRef.current.totalFrames++; statsRef.current.kneeAngles.push(kneeA); statsRef.current.backAngles.push(backT);

            // --- Analiza Techniki ---
            const isBackRounded = headBackA < CONFIG.BACK_ROUNDED_ANGLE && headBackA > 10;

            if (isSquattingPhase) {
              if (backT > CONFIG.BACK_LEAN_MAX || isBackRounded) {
                statsRef.current.poorBackFrames++;
                if (isBackRounded) speak("Nie garb się", "back_round", 6000);
                else speak("Wyprostuj plecy", "back_error", 6000);
              }
              if (isHeelLiftedActive) { statsRef.current.heelLiftFrames++; speak("Przyklej pięty", "heel_error", 5000); }
            }

            const isDeep = kneeA < CONFIG.DEPTH_PERFECT_ANGLE;
            let bColor = "#22c55e"; let bStat = "STABLE";
            if (backT >= CONFIG.BACK_LEAN_WARNING || isBackRounded) { bColor = "#f59e0b"; bStat = "WARNING"; }
            if (backT > CONFIG.BACK_LEAN_MAX || (isBackRounded && headBackA < CONFIG.BACK_ROUNDED_ANGLE - 10)) { bColor = "#ef4444"; bStat = "POOR"; }

            ctx.font = "bold 14px monospace"; ctx.shadowBlur = 4; ctx.shadowColor = "black";
            ctx.fillStyle = isDeep ? "#22c55e" : "#f59e0b"; ctx.fillText(`${kneeA}° DEPTH`, lm[sIdx.k].x * width + 15, lm[sIdx.k].y * height);
            ctx.fillStyle = bColor; ctx.fillText(`${backT}° BACK ${isBackRounded ? '(ROUNDED)' : ''}`, lm[sIdx.h].x * width + 15, lm[sIdx.h].y * height);

            if (isHeelLiftedActive) { ctx.beginPath(); ctx.strokeStyle = "#ef4444"; ctx.lineWidth = 5; ctx.moveTo(lm[sIdx.heel].x * width - 20, lm[sIdx.heel].y * height + 5); ctx.lineTo(lm[sIdx.heel].x * width + 20, lm[sIdx.heel].y * height + 5); ctx.stroke(); }

            // --- Liczenie powtórzeń (Ulepszona Maszyna Stanów) ---
            if (kneeA < CONFIG.REP_DOWN_ANGLE && phaseRef.current !== "down") {
              phaseRef.current = "down";
              setPhase("down");
            }

            if (kneeA > CONFIG.REP_UP_ANGLE && phaseRef.current === "down") {
              const nowTime = Date.now();
              phaseRef.current = "up";
              setPhase("up");

              if (nowTime - lastRepTime.current > CONFIG.REP_COOLDOWN_MS) {
                const framesToLookBack = Math.min(statsRef.current.kneeAngles.length, Math.round(currentFps * 2.5));
                const recentAngles = statsRef.current.kneeAngles.slice(-framesToLookBack);
                const minKneeInRep = recentAngles.length ? Math.min(...recentAngles) : kneeA;

                if (minKneeInRep > CONFIG.DEPTH_WARNING_ANGLE) {
                  statsRef.current.shallowReps++;
                  speak("Zejdź niżej", "depth_error", 5000);
                } else {
                  setRepCount(prev => { repCountRef.current = prev + 1; return prev + 1; });
                  lastRepTime.current = nowTime;
                }
              }
            }

            ctx.save(); ctx.fillStyle = "rgba(2, 6, 23, 0.9)"; ctx.beginPath(); ctx.roundRect(10, 10, 240, 150, 15); ctx.fill();
            ctx.fillStyle = "#38bdf8"; ctx.font = "bold 18px monospace"; ctx.fillText(`SQUATS: ${repCountRef.current}`, 25, 35);
            ctx.font = "11px monospace"; ctx.fillStyle = isDeep ? "#22c55e" : "#f59e0b"; ctx.fillText(`DEPTH: ${isDeep ? '✓ PERFECT' : '⚠ GO LOWER'}`, 25, 60);
            ctx.fillStyle = bColor; ctx.fillText(`BACK: ${bStat}`, 25, 80);
            ctx.fillStyle = isHeelLiftedActive ? "#ef4444" : "#22c55e"; ctx.fillText(`FEET: ${isHeelLiftedActive ? '⚠ HEELS UP!' : '✓ GROUNDED'}`, 25, 100);
            ctx.fillStyle = alertMessage ? "#ef4444" : "#22c55e"; ctx.fillText(`CAM: ${fpsRef.current} FPS`, 25, 120);
            ctx.restore();
          }
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
    countdown,
    qualityAlert
  };
};
