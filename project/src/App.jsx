import React, { useMemo, useRef, useEffect, useState } from 'react';
import Webcam from "react-webcam";
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import "@tensorflow/tfjs-backend-webgl";
import "@tensorflow/tfjs-backend-cpu";
import * as tf from "@tensorflow/tfjs-core";
import { 
  BrainCircuit, Footprints, AlertTriangle, 
  CameraOff, LayoutGrid, Activity as ActivityIcon, Play, Square,
  LogOut 
} from 'lucide-react';

import GymActivitiesList from './GymActivitiesList';
import { supabase } from './supabaseClient';

// Ogranicza wartość do zadanego zakresu.
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error("Błąd wylogowania:", error.message);
  };

const angleDeg = (a, b, c) => {
  // Liczy kąt ABC w stopniach na bazie iloczynu skalarnego.
  const abx = a.x - b.x;
  const aby = a.y - b.y;
  const cbx = c.x - b.x;
  const cby = c.y - b.y;
  const dot = abx * cbx + aby * cby;
  const magAB = Math.hypot(abx, aby);
  const magCB = Math.hypot(cbx, cby);
  if (magAB === 0 || magCB === 0) return 0;
  const cos = clamp(dot / (magAB * magCB), -1, 1);
  return (Math.acos(cos) * 180) / Math.PI;
};

const midpoint = (p1, p2) => ({ x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2, z: ((p1.z ?? 0) + (p2.z ?? 0)) / 2 });

const pickSide = (l, r) => {
  // Wybiera stronę ciała lepiej widoczną dla kamery.
  const lv = l?.visibility ?? 0;
  const rv = r?.visibility ?? 0;
  return rv > lv ? "right" : "left";
};

const normalizeLandmark = (p, hipCenter, scale) => ({
  x: (p.x - hipCenter.x) / scale,
  y: (p.y - hipCenter.y) / scale,
  z: (p.z ?? 0) / scale,
  v: p.visibility ?? 0,
});

const CameraView = ({ isActive, feedback, selectedExercise }) => {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const cameraRef = useRef(null);
  const poseRef = useRef(null);

  const [liveFeedback, setLiveFeedback] = useState(null);
  const [repCount, setRepCount] = useState(0);
  // Faza repa: idle -> up -> down -> up (zaliczenie powtórzenia)
  const [phase, setPhase] = useState("idle"); // idle | up | down
  const [kneeAngle, setKneeAngle] = useState(null);
  const [depthScore, setDepthScore] = useState(null); // 0..100 (rough)
  const [qualityFlags, setQualityFlags] = useState({ valgus: false, lean: false, shallow: false, toes: false });
  const [activeIssues, setActiveIssues] = useState([]);
  const minKneeAngleRef = useRef(999);
  const lastRepAtRef = useRef(0);
  const issueStreakRef = useRef({ valgus: 0, lean: 0, shallow: 0, toes: 0 });
  const feedbackLockUntilRef = useRef(0);
  const lastFeedbackKeyRef = useRef(null);
  const toeLiftEmaRef = useRef(0);
  const [datasetRecording, setDatasetRecording] = useState(false);
  const [datasetSamples, setDatasetSamples] = useState(0);
  const [dogGreeting, setDogGreeting] = useState(null);
  const [dogStatus, setDogStatus] = useState("OFF");
  const datasetFramesRef = useRef([]);
  const datasetStartedAtRef = useRef(0);
  const lastDatasetSampleAtRef = useRef(0);
  const dogModelRef = useRef(null);
  const dogIntervalRef = useRef(null);
  const dogCooldownUntilRef = useRef(0);
  const dogDetectBusyRef = useRef(false);

  const exportDataset = () => {
    if (!datasetFramesRef.current.length) return;
    const payload = {
      app: "FormCheckAI",
      exercise: selectedExercise,
      createdAt: new Date().toISOString(),
      samples: datasetFramesRef.current.length,
      fpsApprox: 10,
      schemaVersion: 1,
      frames: datasetFramesRef.current,
    };
    const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const a = document.createElement("a");
    a.href = url;
    a.download = `formcheckai-${selectedExercise?.replace(/\s+/g, "_") || "exercise"}-${ts}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearDataset = () => {
    datasetFramesRef.current = [];
    setDatasetSamples(0);
  };

  const stopDogWatcher = () => {
    if (dogIntervalRef.current) {
      clearInterval(dogIntervalRef.current);
      dogIntervalRef.current = null;
    }
    setDogGreeting(null);
    setDogStatus("OFF");
  };

  const startDogWatcher = async () => {
    if (dogIntervalRef.current) return;
    setDogStatus("INIT");
    try {
      await tf.setBackend("webgl");
      await tf.ready();
    } catch {
      await tf.setBackend("cpu");
      await tf.ready();
    }
    if (!dogModelRef.current) {
      dogModelRef.current = await cocoSsd.load();
    }
    setDogStatus("ON");
    dogIntervalRef.current = setInterval(async () => {
      if (dogDetectBusyRef.current) return;
      try {
        dogDetectBusyRef.current = true;
        const videoEl = webcamRef.current?.video;
        if (!videoEl || videoEl.readyState < 2 || videoEl.videoWidth < 32 || !dogModelRef.current) return;
        const predictions = await dogModelRef.current.detect(videoEl, 10);
        const dog = predictions.find((p) => p.class === "dog" && p.score > 0.35);
        if (dog && Date.now() >= dogCooldownUntilRef.current) {
          dogCooldownUntilRef.current = Date.now() + 7000;
          setDogGreeting("Hej piesku! Witaj, piesku miłości! 🐶💙");
          window.setTimeout(() => setDogGreeting(null), 4500);
        }
      } catch {
        setDogStatus("ERR");
        stopDogWatcher();
      } finally {
        dogDetectBusyRef.current = false;
      }
    }, 1200);
  };

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
    if (results.poseLandmarks) {
      // 1) Rysowanie szkieletu na podglądzie live.
      if (window.drawConnectors && window.drawLandmarks && window.POSE_CONNECTIONS) {
        window.drawConnectors(canvasCtx, results.poseLandmarks, window.POSE_CONNECTIONS, { color: "#38bdf8", lineWidth: 4 });
        window.drawLandmarks(canvasCtx, results.poseLandmarks, { color: "#ffffff", fillColor: "#0ea5e9", lineWidth: 2, radius: 3 });
      }

      // 2) Analiza przysiadu 2D (heurystyki na landmarkach Pose).
      const lm = results.poseLandmarks;
      const L = {
        shoulder: lm[11],
        hip: lm[23],
        knee: lm[25],
        ankle: lm[27],
      };
      const R = {
        shoulder: lm[12],
        hip: lm[24],
        knee: lm[26],
        ankle: lm[28],
      };
      const side = pickSide(L.hip, R.hip);
      const S = side === "right" ? R : L;

      // Jeśli jedna strona jest słabo widoczna, fallback do punktu środkowego.
      const hip = S.hip ?? midpoint(L.hip, R.hip);
      const knee = S.knee ?? midpoint(L.knee, R.knee);
      const ankle = S.ankle ?? midpoint(L.ankle, R.ankle);
      const shoulder = S.shoulder ?? midpoint(L.shoulder, R.shoulder);
      const hipCenter = midpoint(L.hip, R.hip);

      // Minimalna jakość detekcji wymaganej do generowania feedbacku.
      const visOk =
        (hip?.visibility ?? 1) > 0.4 &&
        (knee?.visibility ?? 1) > 0.4 &&
        (ankle?.visibility ?? 1) > 0.4 &&
        (shoulder?.visibility ?? 1) > 0.4;

      if (!visOk) {
        setLiveFeedback("Ustaw się w kadrze (pełne nogi i tułów).");
        setPhase((p) => (p === "idle" ? "idle" : p));
        canvasCtx.restore();
        return;
      }

      // Kąt kolana jest głównym sygnałem głębokości i fazy ruchu.
      const kAngle = angleDeg(hip, knee, ankle);
      setKneeAngle(kAngle);
      minKneeAngleRef.current = Math.min(minKneeAngleRef.current, kAngle);

      // Depth score: 180 (standing) -> 0, 80 (deep) -> 100
      const depth = clamp(((180 - minKneeAngleRef.current) / (180 - 80)) * 100, 0, 100);
      setDepthScore(depth);

      // Knee valgus heuristic: knee drifting inside relative to hip/ankle line
      const kneeInward = Math.abs(knee.x - ((hip.x + ankle.x) / 2)) > 0.06 && (knee.x - ((hip.x + ankle.x) / 2)) * (ankle.x - hip.x) < 0;

      // Torso lean: compare shoulder-hip vector to vertical
      const torsoDx = shoulder.x - hip.x;
      const torsoDy = shoulder.y - hip.y;
      const torsoAngleFromVertical = Math.abs(Math.atan2(torsoDx, -torsoDy) * (180 / Math.PI)); // 0 = upright
      const tooMuchLean = torsoAngleFromVertical > 25;

      // Wykrywanie "stania na palcach" przy ujęciu bocznym:
      // łączymy kilka sygnałów: unoszenie pięty, kąt stawu skokowego i fazę ruchu.
      const heel = side === "right" ? lm[30] : lm[29];
      const footIdx = side === "right" ? lm[32] : lm[31];
      const footVisible =
        (heel?.visibility ?? 0) > 0.55 &&
        (footIdx?.visibility ?? 0) > 0.55 &&
        (ankle?.visibility ?? 0) > 0.55;
      const heelLiftRaw = footVisible ? (footIdx.y - heel.y) : 0;
      // EMA redukuje drgania punktów stopy między klatkami.
      toeLiftEmaRef.current = toeLiftEmaRef.current * 0.7 + heelLiftRaw * 0.3;
      const heelLift = toeLiftEmaRef.current;

      const ankleAngle = footVisible ? angleDeg(knee, ankle, footIdx) : 180;
      const inLoadPhase = kAngle < 150; // alarm tylko gdy użytkownik realnie pracuje w przysiadzie
      const onToes = footVisible && inLoadPhase && heelLift > 0.045 && ankleAngle < 115;

      // Maszyna stanów przysiadu + anti-bounce (>=600 ms między repami).
      const now = Date.now();
      const upThresh = 160;
      const downThresh = 115;

      setPhase((prev) => {
        if (prev === "idle") {
          if (kAngle > upThresh) return "up";
          return "idle";
        }
        if (prev === "up") {
          if (kAngle < downThresh) return "down";
          return "up";
        }
        // prev === "down"
        if (kAngle > upThresh) {
          // completed rep
          if (now - lastRepAtRef.current > 600) {
            lastRepAtRef.current = now;
            setRepCount((c) => c + 1);
          }
          // reset min angle for next rep
          minKneeAngleRef.current = 999;
          return "up";
        }
        return "down";
      });

      const shallow = minKneeAngleRef.current > 105; // not reaching decent depth
      const flagsRaw = { valgus: !!kneeInward, lean: !!tooMuchLean, shallow, toes: !!onToes };

      // Stabilizacja flag, żeby pojedyncza klatka nie generowała fałszywego alarmu.
      const updateStreak = (key, active) => {
        const current = issueStreakRef.current[key];
        issueStreakRef.current[key] = active ? Math.min(current + 1, 12) : Math.max(current - 1, 0);
      };
      updateStreak("valgus", flagsRaw.valgus);
      updateStreak("lean", flagsRaw.lean);
      updateStreak("shallow", flagsRaw.shallow && phase === "down");
      updateStreak("toes", flagsRaw.toes);

      const flags = {
        valgus: issueStreakRef.current.valgus >= 3,
        lean: issueStreakRef.current.lean >= 3,
        shallow: issueStreakRef.current.shallow >= 3,
        toes: issueStreakRef.current.toes >= 4,
      };
      setQualityFlags(flags);

      const issues = [];
      if (flags.toes) issues.push("Oderwana pięta (stanie na palcach)");
      if (flags.valgus) issues.push("Kolana uciekają do środka");
      if (flags.lean) issues.push("Za duży pochył tułowia");
      if (flags.shallow) issues.push("Za płytki przysiad");
      setActiveIssues(issues);

      // Priorytety komunikatów: bezpieczeństwo (kolana/tułów) > technika > motywacja.
      let msg = null;
      let msgKey = "neutral";
      if (flags.toes) {
        msg = "Stoisz na palcach — dociśnij pięty do podłoża.";
        msgKey = "toes";
      } else if (flags.valgus) {
        msg = "Kolana uciekają do środka — wypychaj je na zewnątrz.";
        msgKey = "valgus";
      }
      else if (flags.lean) msg = "Za duży pochył tułowia — napnij brzuch i trzymaj klatkę wyżej.";
      else if (phase === "down" && flags.shallow) msg = "Zejdź trochę niżej — kontroluj głębokość.";
      else if (phase === "up" && kAngle > 170) msg = "Super — pełny wyprost na górze.";
      else msg = "Utrzymuj tempo i stabilne kolana.";

      if (flags.lean && msgKey === "neutral") msgKey = "lean";
      if (phase === "down" && flags.shallow && msgKey === "neutral") msgKey = "shallow";

      // Blokada zmiany komunikatu przez krótki czas, żeby użytkownik zdążył przeczytać.
      if (now >= feedbackLockUntilRef.current || msgKey !== lastFeedbackKeyRef.current) {
        setLiveFeedback(msg);
        lastFeedbackKeyRef.current = msgKey;
        feedbackLockUntilRef.current = now + 2200;
      }

      if (datasetRecording) {
        if (!datasetStartedAtRef.current) datasetStartedAtRef.current = now;
        if (now - lastDatasetSampleAtRef.current >= 100) {
          lastDatasetSampleAtRef.current = now;
          const bodyScale = Math.max(Math.abs(shoulder.y - hip.y), 0.001);
          const points = {
            lHip: normalizeLandmark(lm[23], hipCenter, bodyScale),
            rHip: normalizeLandmark(lm[24], hipCenter, bodyScale),
            lKnee: normalizeLandmark(lm[25], hipCenter, bodyScale),
            rKnee: normalizeLandmark(lm[26], hipCenter, bodyScale),
            lAnkle: normalizeLandmark(lm[27], hipCenter, bodyScale),
            rAnkle: normalizeLandmark(lm[28], hipCenter, bodyScale),
            lHeel: normalizeLandmark(lm[29], hipCenter, bodyScale),
            rHeel: normalizeLandmark(lm[30], hipCenter, bodyScale),
            lFoot: normalizeLandmark(lm[31], hipCenter, bodyScale),
            rFoot: normalizeLandmark(lm[32], hipCenter, bodyScale),
            lShoulder: normalizeLandmark(lm[11], hipCenter, bodyScale),
            rShoulder: normalizeLandmark(lm[12], hipCenter, bodyScale),
          };
          datasetFramesRef.current.push({
            t: now - datasetStartedAtRef.current,
            side,
            phase,
            features: {
              kneeAngle: Number(kAngle.toFixed(3)),
              ankleAngle: Number(ankleAngle.toFixed(3)),
              torsoAngleFromVertical: Number(torsoAngleFromVertical.toFixed(3)),
              depth: Number(depth.toFixed(3)),
              heelLift: Number(heelLift.toFixed(5)),
            },
            labels: flags,
            points,
          });
          setDatasetSamples(datasetFramesRef.current.length);
        }
      }

      // 3) Lekki HUD diagnostyczny bezpośrednio na canvasie.
      canvasCtx.save();
      canvasCtx.scale(-1, 1); // mirror text with mirrored canvas
      canvasCtx.font = "700 18px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";
      canvasCtx.fillStyle = "rgba(2,6,23,0.65)";
      canvasCtx.fillRect(-videoWidth + 16, 16, 360, 96);
      canvasCtx.fillStyle = "#e2e8f0";
      canvasCtx.fillText(`REPS: ${repCount}`, -videoWidth + 28, 44);
      canvasCtx.fillText(`KNEE: ${Math.round(kAngle)}°`, -videoWidth + 28, 70);
      canvasCtx.fillText(`PHASE: ${phase.toUpperCase()}`, -videoWidth + 28, 96);
      canvasCtx.restore();
    }
    canvasCtx.restore();
  };

  const poseOptions = useMemo(
    () => ({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      smoothSegmentation: false,
      minDetectionConfidence: 0.55,
      minTrackingConfidence: 0.55,
    }),
    []
  );

  useEffect(() => {
    const initPose = async () => {
      if (!isActive) return;

      // Reset stanu po starcie nowej sesji.
      setRepCount(0);
      setPhase("idle");
      setKneeAngle(null);
      setDepthScore(null);
      setQualityFlags({ valgus: false, lean: false, shallow: false, toes: false });
      setActiveIssues([]);
      setDatasetSamples(datasetFramesRef.current.length);
      minKneeAngleRef.current = 999;
      lastRepAtRef.current = 0;
      toeLiftEmaRef.current = 0;
      issueStreakRef.current = { valgus: 0, lean: 0, shallow: 0, toes: 0 };
      feedbackLockUntilRef.current = 0;
      lastFeedbackKeyRef.current = null;
      setLiveFeedback("Kalibracja... ustaw się bokiem lub lekko po skosie do kamery.");

      if (!window.Pose || !window.Camera) {
        setLiveFeedback("Ładowanie modeli MediaPipe... odśwież stronę jeśli problem nie znika.");
        return;
      }

      // Inicjalizacja modelu Pose (CDN) i rejestracja callbacku wyników.
      poseRef.current = new window.Pose({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
      });
      poseRef.current.setOptions(poseOptions);
      poseRef.current.onResults(onResults);

      const videoEl = webcamRef.current?.video;
      if (!videoEl) return;

      // Pętla klatek: każda klatka wideo jest wysyłana do modelu.
      cameraRef.current = new window.Camera(videoEl, {
        onFrame: async () => {
          if (poseRef.current && webcamRef.current?.video) {
            await poseRef.current.send({ image: webcamRef.current.video });
          }
        },
        width: 1280,
        height: 720,
      });
      await cameraRef.current.start();
      await startDogWatcher();
    };
    initPose();
    return () => {
      // Zamyka zasoby kamery i modelu przy zatrzymaniu treningu / unmount.
      if (cameraRef.current) cameraRef.current.stop();
      cameraRef.current = null;
      if (poseRef.current) poseRef.current.close();
      poseRef.current = null;
      datasetStartedAtRef.current = 0;
      lastDatasetSampleAtRef.current = 0;
      stopDogWatcher();
    };
  }, [datasetRecording, isActive, poseOptions, selectedExercise]);

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
      {(liveFeedback || feedback) && isActive && (
        <div className="absolute top-4 right-4 left-4 bg-slate-900/95 p-4 rounded-xl border-l-4 border-amber-400 flex items-center gap-4 shadow-2xl z-50">
          <AlertTriangle className="text-amber-400 h-8 w-8 shrink-0" />
          <div>
            <h4 className="text-amber-300 font-bold text-xs uppercase tracking-wider">Korekta AI (LIVE)</h4>
            <p className="text-blue-50 font-medium text-lg leading-tight">{liveFeedback || feedback}</p>
            <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-mono uppercase tracking-widest">
              <span className="px-2 py-1 rounded bg-slate-950/70 border border-slate-800">Reps: <span className="text-sky-400 font-bold">{repCount}</span></span>
              <span className="px-2 py-1 rounded bg-slate-950/70 border border-slate-800">Knee: <span className="text-sky-400 font-bold">{kneeAngle == null ? "--" : `${Math.round(kneeAngle)}°`}</span></span>
              <span className="px-2 py-1 rounded bg-slate-950/70 border border-slate-800">Depth: <span className="text-sky-400 font-bold">{depthScore == null ? "--" : `${Math.round(depthScore)}%`}</span></span>
              <span className={`px-2 py-1 rounded bg-slate-950/70 border ${qualityFlags.toes ? "border-amber-500 text-amber-300" : "border-slate-800 text-slate-400"}`}>Heels</span>
              <span className={`px-2 py-1 rounded bg-slate-950/70 border ${qualityFlags.valgus ? "border-amber-500 text-amber-300" : "border-slate-800 text-slate-400"}`}>Knees</span>
              <span className={`px-2 py-1 rounded bg-slate-950/70 border ${qualityFlags.lean ? "border-amber-500 text-amber-300" : "border-slate-800 text-slate-400"}`}>Torso</span>
              <span className={`px-2 py-1 rounded bg-slate-950/70 border ${qualityFlags.shallow ? "border-amber-500 text-amber-300" : "border-slate-800 text-slate-400"}`}>Depth</span>
            </div>
            <div className="mt-2 text-[11px]">
              {activeIssues.length > 0 ? (
                <p className="text-amber-200">Aktywne błędy: {activeIssues.join(" | ")}</p>
              ) : (
                <p className="text-emerald-300">Brak krytycznych błędów techniki.</p>
              )}
            </div>
            <div className="mt-1 text-[10px] text-slate-300 font-mono uppercase">
              Dog detector: <span className={dogStatus === "ON" ? "text-emerald-300" : dogStatus === "ERR" ? "text-red-300" : "text-slate-400"}>{dogStatus}</span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px]">
              <button
                onClick={() => setDatasetRecording((v) => !v)}
                className={`px-3 py-1 rounded border uppercase tracking-widest font-bold ${datasetRecording ? "border-red-500 text-red-300 bg-red-500/10" : "border-sky-500 text-sky-300 bg-sky-500/10"}`}
              >
                {datasetRecording ? "Stop Dataset" : "Start Dataset"}
              </button>
              <button
                onClick={exportDataset}
                disabled={datasetSamples === 0}
                className={`px-3 py-1 rounded border uppercase tracking-widest font-bold ${datasetSamples === 0 ? "border-slate-700 text-slate-500 cursor-not-allowed" : "border-emerald-500 text-emerald-300 bg-emerald-500/10"}`}
              >
                Export JSON
              </button>
              <button
                onClick={clearDataset}
                disabled={datasetSamples === 0}
                className={`px-3 py-1 rounded border uppercase tracking-widest font-bold ${datasetSamples === 0 ? "border-slate-700 text-slate-500 cursor-not-allowed" : "border-amber-500 text-amber-300 bg-amber-500/10"}`}
              >
                Wyczyść
              </button>
              <span className="px-2 py-1 rounded border border-slate-700 text-slate-300 font-mono">
                Próbki: {datasetSamples}
              </span>
            </div>
          </div>
        </div>
      )}
      {dogGreeting && isActive && (
        <div className="absolute bottom-4 left-4 right-4 bg-pink-500/20 border border-pink-300/60 rounded-xl px-4 py-3 text-center shadow-xl">
          <p className="text-pink-100 font-black uppercase tracking-widest text-xs">Easter Egg</p>
          <p className="text-white font-bold text-lg">{dogGreeting}</p>
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
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-500/30 text-red-500 hover:bg-red-500/10 transition-all text-[10px] font-black uppercase tracking-widest"
            title="Wyloguj"
          >
            <LogOut size={14} />
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
          <div className="flex-grow min-h-[450px]"><CameraView isActive={trainingActive} feedback={trainingActive ? "System kalibruje..." : null} selectedExercise={selectedMuscle.name} /></div>
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