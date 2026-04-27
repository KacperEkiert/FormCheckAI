import { useRef, useEffect, useState, useCallback } from 'react';
import { angleDeg, createSpeakFunction, clamp } from '../utils';
import { ExerciseModel } from '../ml/ExerciseModel';
import { supabase } from '../supabaseClient';
import { DETECTION_PARAMS } from '../config/detectionParams';

export const useWorkoutDetection = (isActive, isGuest, onWorkoutFinish, exerciseId = 'squat') => {
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
  const [kneeAngle, setKneeAngle] = useState(180);
  const [backAngle, setBackAngle] = useState(0);
  const [elbowAngle, setElbowAngle] = useState(180);
  const [jackArmAngle, setJackArmAngle] = useState(0);
  const [isBackPoor, setIsBackPoor] = useState(false);
  const [isShallow, setIsShallow] = useState(false);

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
  const smoothElbowAngle = useRef(180);
  const smoothJackArmAngle = useRef(0);
  const smoothBackAngle = useRef(0);
  const smoothHeadBackAngle = useRef(0);
  const lastPredictionsRef = useRef({ lean: 0, valgus: 0, heels_up: 0, shallow: 0 });

  // ML Model
  const mlModelRef = useRef(new ExerciseModel());
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const isModelLoadedRef = useRef(false);

  // Dataset Collection
  const [isRecordingDataset, setIsRecordingDataset] = useState(false);
  const isRecordingDatasetRef = useRef(false);
  const datasetFrames = useRef([]);
  const datasetLabels = useRef({});

  const speak = useCallback((text, type, cooldown = 4000, cancelPrevious = false) => {
    createSpeakFunction(lastSpokenRef)(text, type, cooldown, cancelPrevious);
  }, []);

  const startDataset = useCallback((labels, selectedExerciseId = exerciseId) => {
    datasetLabels.current = labels;
    datasetFrames.current = [];
    isRecordingDatasetRef.current = true;
    setIsRecordingDataset(true);
    speak(`Rozpoczęto nagrywanie danych dla ${selectedExerciseId}`, "info", 1000);
  }, [speak, exerciseId]);

  const stopAndExportDataset = useCallback(async (selectedExerciseId = exerciseId) => {
    isRecordingDatasetRef.current = false;
    setIsRecordingDataset(false);
    if (datasetFrames.current.length === 0) {
      speak("Brak zebranych danych", "error", 1000);
      return;
    }

    // 1. Zapis lokalny (Download)
    const payload = { exercise: selectedExerciseId, frames: datasetFrames.current };
    const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trening_${selectedExerciseId}_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // 2. Synchronizacja z chmurą (Supabase)
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('training_data').insert({
        payload: payload,
        user_id: user?.id || 'guest',
        exercise_id: selectedExerciseId,
        created_at: new Date().toISOString()
      });
      if (error) throw error;
      speak("Zapisano i zsynchronizowano dane", "info", 1000);
    } catch (err) {
      console.error("Błąd synchronizacji z Supabase:", err);
      speak("Zapisano lokalnie (błąd chmury)", "warning", 1000);
    }

    datasetFrames.current = [];
  }, [speak, exerciseId]);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      const handleVoicesChanged = () => window.speechSynthesis.getVoices();
      window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);
      return () => window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
    }
  }, []);

  // Load ML Model
  useEffect(() => {
    const loadModel = async () => {
      console.log(`Inicjalizacja ładowania modelu dla ćwiczenia: ${exerciseId}...`);
      setIsModelLoaded(false);
      isModelLoadedRef.current = false;

      const modelFilename = exerciseId === 'squat' ? 'model.json' : `${exerciseId}_model.json`;
      const localStorePath = `localstorage://${exerciseId}-model`;
      const oldLocalStorePath = 'localstorage://exercise-model';

      // 1. Próba załadowania z Supabase Storage (Najnowszy wspólny model)
      const storageUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/models/${modelFilename}`;

      try {
        // Ciche sprawdzenie czy plik istnieje w Supabase Storage
        const checkRes = await fetch(storageUrl, { method: 'HEAD' });
        if (checkRes.ok) {
          const loaded = await mlModelRef.current.load(storageUrl);
          if (loaded) {
            console.log(`✅ SUKCES: Załadowano model ${exerciseId} z Supabase Storage`);
            setIsModelLoaded(true);
            isModelLoadedRef.current = true;
            return;
          }
        }
      } catch (e) {
        // Ignorujemy błędy sieciowe przy sprawdzaniu chmury
      }

      // 2. Próba załadowania z serwera lokalnego (folder /public/models)
      try {
        const checkServer = await fetch(`/models/${modelFilename}`, { method: 'HEAD' });
        if (checkServer.ok) {
          const serverLoaded = await mlModelRef.current.load(`/models/${modelFilename}`);
          if (serverLoaded) {
            console.log(`✅ Załadowano model ${exerciseId} z serwera`);
            setIsModelLoaded(true);
            isModelLoadedRef.current = true;
            return;
          }
        }
      } catch (e) { /* cicho */ }

      // 3. Sprawdź localstorage (jeśli użytkownik trenował coś u siebie)
      let localLoaded = false;
      const hasNewModel = localStorage.getItem(`${localStorePath}-labels`);
      if (hasNewModel) {
        localLoaded = await mlModelRef.current.load(localStorePath);
      }

      // Fallback dla starych modeli przysiadów przed migracją na multi-model
      if (!localLoaded && exerciseId === 'squat') {
        const hasOldModel = localStorage.getItem(`${oldLocalStorePath}-labels`);
        if (hasOldModel) {
          localLoaded = await mlModelRef.current.load(oldLocalStorePath);
          if (localLoaded) console.log("✅ Załadowano model przysiadów ze starej pamięci (fallback)");
        }
      }

      if (localLoaded) {
        const inputSize = mlModelRef.current.model?.layers[0]?.batchInputShape[1];
        console.log(`✅ Załadowano model ${exerciseId} z LocalStorage. Wejścia (features): ${inputSize}`);
        if (inputSize && inputSize !== 14) {
          console.warn(`⚠️ OSTRZEŻENIE: Model ma ${inputSize} cech, a aktualna wersja oczekuje 14. Zalecany ponowny trening!`);
        }
        setIsModelLoaded(true);
        isModelLoadedRef.current = true;
      } else {
        console.log(`ℹ️ Tryb Heurystyczny: ${exerciseId} (brak modelu AI - nagraj dane, aby go stworzyć)`);
      }
    };
    loadModel();
  }, [exerciseId]);

  useEffect(() => { stageRef.current = workoutStage; }, [workoutStage]);

  useEffect(() => {
    if (isActive) {
      // Przeładuj model przy każdym rozpoczęciu treningu, aby uwzględnić nowe zmiany
      const modelFilename = exerciseId === 'squat' ? 'model.json' : `${exerciseId}_model.json`;
      const localStorePath = `localstorage://${exerciseId}-model`;

      mlModelRef.current.load(`/models/${modelFilename}`).then(loaded => {
        if (loaded) {
          setIsModelLoaded(true);
          isModelLoadedRef.current = true;
        } else {
          mlModelRef.current.load(localStorePath).then(l => {
            setIsModelLoaded(l);
            isModelLoadedRef.current = l;
          });
        }
      });

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
        if (!lm || lm.length < 33) {
          ctx.restore(); // Przywracamy kontekst przed wyjściem
          return;
        }
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
        const sIdx = isLeftDominant
          ? { s: 11, h: 23, k: 25, a: 27, heel: 29, toe: 31, ear: 7, e: 13, w: 15, isLeft: true }
          : { s: 12, h: 24, k: 26, a: 28, heel: 30, toe: 32, ear: 8, e: 14, w: 16, isLeft: false };

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

        // Kąt w łokciu dla pompek
        const rawElbowA = Math.round(angleDeg({ x: lm[sIdx.s].x * aspectRatio, y: lm[sIdx.s].y }, { x: lm[sIdx.e].x * aspectRatio, y: lm[sIdx.e].y }, { x: lm[sIdx.w].x * aspectRatio, y: lm[sIdx.w].y }));

        // Kąt dla pajacyków (ramiona wzgledem tułowia)
        const rawJackArmA = Math.round(angleDeg({ x: lm[sIdx.h].x * aspectRatio, y: lm[sIdx.h].y }, { x: lm[sIdx.s].x * aspectRatio, y: lm[sIdx.s].y }, { x: lm[sIdx.w].x * aspectRatio, y: lm[sIdx.w].y }));

        // Logika re-kalibracji została przeniesiona do sekcji Precyzyjnej Detekcji 3D poniżej.

        smoothKneeAngle.current = Math.round(alpha * rawKneeA + (1 - alpha) * smoothKneeAngle.current);
        smoothElbowAngle.current = Math.round(alpha * rawElbowA + (1 - alpha) * smoothElbowAngle.current);
        smoothJackArmAngle.current = Math.round(alpha * rawJackArmA + (1 - alpha) * smoothJackArmAngle.current);
        smoothBackAngle.current = Math.round(alpha * rawBackT + (1 - alpha) * smoothBackAngle.current);
        smoothHeadBackAngle.current = Math.round(alpha * rawHeadBack + (1 - alpha) * smoothHeadBackAngle.current);

        const kneeA = smoothKneeAngle.current;
        const elbowA = smoothElbowAngle.current;
        const jackArmA = smoothJackArmAngle.current;
        const backT = smoothBackAngle.current;
        const headBackA = smoothHeadBackAngle.current;

        setKneeAngle(kneeA);
        setElbowAngle(elbowA);
        setJackArmAngle(jackArmA);
        setBackAngle(backT);

        const isActivePhase = (() => {
          if (exerciseId === 'pushup') return elbowA < 140;
          if (exerciseId === 'jumping_jacks') return jackArmA > 60;
          return kneeA < DETECTION_PARAMS.SQUAT.PHASE_KNEE_ANGLE;
        })();

        // --- Precyzyjna Detekcja Odrywania Pięt (3D Vertical Displacement) ---
        const worldLm = results.poseWorldLandmarks || lm;
        const heelIdx = sIdx.isLeft ? 27 : 28; // Kostka (Ankle)
        const toeIdx = sIdx.isLeft ? 31 : 32; // Palce (Foot Index)

        const activeDist = Math.abs(worldLm[heelIdx].y - worldLm[toeIdx].y);
        const activeInitDist = sIdx.isLeft ? initialHeelToeDistL.current : initialHeelToeDistR.current;

        // Warunek gotowości do kalibracji stóp (użytkownik stoi prosto i stabilnie)
        const isReadyForSquat = coreV && anklesV && (rawKneeA > 170) && isSide;

        // Inicjalizacja "Poziomu Zero" dla stopy przy starcie
        if (!activeInitDist && isReadyForSquat) {
          if (sIdx.isLeft) initialHeelToeDistL.current = activeDist;
          else initialHeelToeDistR.current = activeDist;
        }

        const isReady = coreV && anklesV && (exerciseId === 'jumping_jacks' ? true : isSide);

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

            // --- Inteligentne Bramkowanie Danych (Smart Gating) ---

            if (isRecordingDatasetRef.current && isReady) {
              const features = ExerciseModel.extractFeatures(worldLm);
              if (features) {
                // Jeśli użytkownik stoi prosto, zapisujemy to jako "Poprawne" (wszystkie błędy false)
                // Nawet jeśli wybrał tag błędu, bo błąd techniczny dzieje się tylko w ruchu.
                const effectiveLabels = isActivePhase
                  ? datasetLabels.current
                  : { valgus: false, lean: false, shallow: false, heels_up: false };

                datasetFrames.current.push({
                  features: features,
                  labels: effectiveLabels
                });
              }
            }

            // --- Analiza Techniki (PURE ML) ---
            const preds = lastPredictionsRef.current;

            // Logowanie predykcji do konsoli (ułatwia debugowanie)
            if (statsRef.current.totalFrames % 30 === 0) {
              console.log("ML Predictions:", preds);
            }

            // Obliczamy czy plecy są za bardzo pochylone (Heurystyka + ML)
            // Dodajemy wagę dla 3D torso lean, jeśli ML go wykryje
            let isBackBad = (preds.lean > 0.28 || backT > DETECTION_PARAMS.SQUAT.BACK_LEAN_MAX);

            // Valgus: Ignorujemy jeśli użytkownik stoi bokiem (zbyt mały hipDist w X), bo detekcja 3D w Z jest mało wiarygodna
            const hipDistX = Math.abs(lm[11].x - lm[12].x);
            const isFacingCamera = hipDistX > 0.4;
            let currentValgus = isFacingCamera ? (preds.valgus > 0.5) : false;

            let currentIsHeelLifted = (preds.heels_up > 0.65) || (activeInitDist && (activeDist > activeInitDist + DETECTION_PARAMS.SQUAT.HEEL_LIFT_SENSITIVITY));

            let currentIsShallow = preds.shallow > 0.35;

            // Pobierz nową predykcję dla następnej klatki
            if (isModelLoadedRef.current && !mlModelRef.current.isTraining) {
              mlModelRef.current.predict(worldLm).then(p => {
                if (p) {
                  lastPredictionsRef.current = p;
                }
              }).catch((e) => { console.error("ML Predict Error:", e); });
            } else if (!mlModelRef.current.isTraining) {
              // Rezerwowy endpoint serwerowy
              fetch('/api/predict', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ landmarks: worldLm, exerciseId })
              })
                .then(res => res.json())
                .then(p => {
                  if (p && !p.error) lastPredictionsRef.current = p;
                }).catch(() => { });
            }

            setIsBackPoor(isBackBad && isActivePhase);
            setIsHeelLifted(currentIsHeelLifted);

            if (isActivePhase && exerciseId === 'squat') {
              if (isBackBad) {
                statsRef.current.poorBackFrames++;
                speak("Wyprostuj plecy", "back_error", 6000);
              }
              if (currentIsHeelLifted) {
                statsRef.current.heelLiftFrames++;
                speak("Przyklej pięty", "heel_error", 5000);
              }
            }

            const isDeep = (() => {
              if (exerciseId === 'pushup') return elbowA < DETECTION_PARAMS.PUSHUP.DEEP_ANGLE;
              if (exerciseId === 'jumping_jacks') return jackArmA > DETECTION_PARAMS.JUMPING_JACKS.DEEP_ANGLE;
              if (exerciseId === 'lunge') return kneeA < DETECTION_PARAMS.LUNGE.DEEP_ANGLE;
              return kneeA < DETECTION_PARAMS.SQUAT.DEPTH_PERFECT_ANGLE;
            })();

            let bColor = isBackBad ? "#ef4444" : "#22c55e";
            let bStat = isBackBad ? "POOR" : "STABLE";

            ctx.font = "bold 14px monospace"; ctx.shadowBlur = 4; ctx.shadowColor = "black";
            if (exerciseId === 'pushup') {
              ctx.fillStyle = isDeep ? "#22c55e" : "#f59e0b"; ctx.fillText(`${elbowA}° ELBOW`, lm[sIdx.e].x * width + 15, lm[sIdx.e].y * height);
            } else if (exerciseId === 'jumping_jacks') {
              ctx.fillStyle = isDeep ? "#22c55e" : "#f59e0b"; ctx.fillText(`${jackArmA}° ARMS`, lm[sIdx.w].x * width + 15, lm[sIdx.w].y * height);
            } else {
              ctx.fillStyle = isDeep ? "#22c55e" : "#f59e0b"; ctx.fillText(`${kneeA}° DEPTH`, lm[sIdx.k].x * width + 15, lm[sIdx.k].y * height);
            }
            ctx.fillStyle = bColor; ctx.fillText(`${backT}° BACK`, lm[sIdx.h].x * width + 15, lm[sIdx.h].y * height);

            if (currentIsHeelLifted) { ctx.beginPath(); ctx.strokeStyle = "#ef4444"; ctx.lineWidth = 5; ctx.moveTo(lm[sIdx.heel].x * width - 20, lm[sIdx.heel].y * height + 5); ctx.lineTo(lm[sIdx.heel].x * width + 20, lm[sIdx.heel].y * height + 5); ctx.stroke(); }

            // --- Liczenie powtórzeń (Dynamiczna Maszyna Stanów) ---
            const repConfig = {
              pushup: { angle: elbowA, down: DETECTION_PARAMS.PUSHUP.DOWN_ANGLE, up: DETECTION_PARAMS.PUSHUP.UP_ANGLE },
              lunge: { angle: kneeA, down: DETECTION_PARAMS.LUNGE.DOWN_ANGLE, up: DETECTION_PARAMS.LUNGE.UP_ANGLE },
              jumping_jacks: { angle: jackArmA, down: DETECTION_PARAMS.JUMPING_JACKS.DOWN_ANGLE, up: DETECTION_PARAMS.JUMPING_JACKS.UP_ANGLE },
              squat: { angle: kneeA, down: DETECTION_PARAMS.SQUAT.REP_DOWN_ANGLE, up: DETECTION_PARAMS.SQUAT.REP_UP_ANGLE }
            };

            const currentCfg = repConfig[exerciseId] || repConfig.squat;
            const currentA = currentCfg.angle;

            // --- Próba użycia AI do detekcji fazy (jeśli model jest gotowy) ---
            const mlUp = preds.up || preds.góra || 0;
            const mlDown = preds.down || preds.dół || 0;
            const useMLForPhases = (mlUp > 0.5 || mlDown > 0.5);

            if (useMLForPhases) {
              // AI decyduje o fazie
              if (mlDown > 0.85 && phaseRef.current !== "down") {
                phaseRef.current = "down";
                setPhase("down");
                setIsShallow(false);
              }
              if (mlUp > 0.85 && phaseRef.current === "down") {
                const nowTime = Date.now();
                phaseRef.current = "up";
                setPhase("up");
                if (nowTime - lastRepTime.current > DETECTION_PARAMS.REP_COOLDOWN_MS) {
                  setRepCount(prev => { repCountRef.current = prev + 1; return prev + 1; });
                  lastRepTime.current = nowTime;
                }
              }
            } else {
              // Klasyczne liczenie na podstawie kątów
              if (currentA < currentCfg.down && phaseRef.current !== "down") {
                phaseRef.current = "down";
                setPhase("down");
                setIsShallow(false);
              }

              if (currentA > currentCfg.up && phaseRef.current === "down") {
                const nowTime = Date.now();
                phaseRef.current = "up";
                setPhase("up");

                if (nowTime - lastRepTime.current > DETECTION_PARAMS.REP_COOLDOWN_MS) {
                  if (exerciseId === 'squat') {
                    const framesToLookBack = Math.min(statsRef.current.kneeAngles.length, Math.round(currentFps * 2.5));
                    const recentAngles = statsRef.current.kneeAngles.slice(-framesToLookBack);
                    const minKneeInRep = recentAngles.length ? Math.min(...recentAngles) : kneeA;

                    if (minKneeInRep > DETECTION_PARAMS.SQUAT.DEPTH_WARNING_ANGLE || currentIsShallow) {
                      statsRef.current.shallowReps++;
                      speak("Zejdź niżej", "depth_error", 5000);
                      setIsShallow(true);
                      setTimeout(() => setIsShallow(false), 3000);
                    } else {
                      setRepCount(prev => { repCountRef.current = prev + 1; return prev + 1; });
                      lastRepTime.current = nowTime;
                      setIsShallow(false);
                    }
                  } else {
                    setRepCount(prev => { repCountRef.current = prev + 1; return prev + 1; });
                    lastRepTime.current = nowTime;
                  }
                }
              }
            }

            const exerciseName = exerciseId.toUpperCase().replace('_', ' ');
            ctx.save(); ctx.fillStyle = "rgba(2, 6, 23, 0.9)"; ctx.beginPath(); ctx.roundRect(10, 10, 240, exerciseId === 'squat' ? 150 : 80, 15); ctx.fill();
            ctx.fillStyle = "#38bdf8"; ctx.font = "bold 18px monospace"; ctx.fillText(`${exerciseName}: ${repCountRef.current}`, 25, 35);
            if (exerciseId === 'squat') {
              ctx.font = "11px monospace"; ctx.fillStyle = isDeep ? "#22c55e" : "#f59e0b"; ctx.fillText(`DEPTH: ${isDeep ? '✓ PERFECT' : '⚠ GO LOWER'}`, 25, 60);
              ctx.fillStyle = bColor; ctx.fillText(`BACK: ${bStat}`, 25, 80);
              ctx.fillStyle = currentIsHeelLifted ? "#ef4444" : "#22c55e"; ctx.fillText(`FEET: ${currentIsHeelLifted ? '⚠ HEELS UP!' : '✓ GROUNDED'}`, 25, 100);
            }
            ctx.fillStyle = alertMessage ? "#ef4444" : "#22c55e"; ctx.fillText(`CAM: ${fpsRef.current} FPS`, 25, exerciseId === 'squat' ? 120 : 60);
            if (exerciseId === 'squat') {
              ctx.fillStyle = isModelLoaded ? "#a855f7" : "#64748b"; ctx.fillText(`AI MODEL: ${isModelLoaded ? 'ACTIVE' : 'HEURISTICS'}`, 25, 140);
            }
            ctx.restore();
          }
        }
        if (window.drawConnectors) window.drawConnectors(ctx, lm, window.POSE_CONNECTIONS, { color: stage === 'active' ? "rgba(56, 189, 248, 0.5)" : "rgba(255, 255, 255, 0.1)", lineWidth: 2 });

      }
    };

    let isDestroyed = false;
    const init = async () => {
      try {
        console.log("Inicjalizacja kamery i AI...");
        if (!window.Pose || !window.Camera) {
          console.error("Biblioteki MediaPipe nie są jeszcze załadowane.");
          return;
        }

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

        console.log("Próba uruchomienia strumienia wideo...");
        await cameraRef.current.start();
        console.log("Kamera aktywna.");
      } catch (err) {
        if (!isDestroyed) {
          console.error("Błąd startu kamery:", err);
          setSetupHint("Błąd kamery - sprawdź uprawnienia");
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
    qualityAlert,
    kneeAngle,
    backAngle,
    isBackPoor,
    isShallow,
    isRecordingDataset,
    startDataset,
    stopAndExportDataset
  };
};
