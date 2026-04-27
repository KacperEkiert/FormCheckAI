import React, { useState, useEffect } from 'react';
import { ExerciseModel } from '../../ml/ExerciseModel';
import { supabase } from '../../supabaseClient';
import { Database, CloudUpload, CloudDownload, Trash2 } from 'lucide-react';

export default function ModelTrainer({ onBack }) {
  const [model] = useState(() => new ExerciseModel());
  const [status, setStatus] = useState("Idle");
  const [datasetFiles, setDatasetFiles] = useState([]);
  const [isTraining, setIsTraining] = useState(false);
  const [progress, setProgress] = useState(0);

  // Helper to handle both File objects and cloud content
  const getFileText = async (file) => {
    if (file.content) return JSON.stringify(file.content);
    return await file.text();
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    setDatasetFiles(prev => [...prev, ...files]);
  };

  const startTraining = async () => {
    if (datasetFiles.length === 0) {
      alert("Proszę wgrać przynajmniej jeden plik JSON z danymi.");
      return;
    }

    setIsTraining(true);
    setStatus("Parsowanie danych...");

    try {
      let fullDataset = [];
      for (let file of datasetFiles) {
        const text = await getFileText(file);
        const json = JSON.parse(text);
        if (json.frames && json.frames.length > 0) {
          // Walidacja spójności cech wewnątrz pliku
          const firstFrameFeatures = json.frames[0]?.features?.length;
          if (json.frames.some(f => !f.features || f.features.length !== firstFrameFeatures)) {
             throw new Error(`Plik ${file.name || 'z chmury'} posiada uszkodzone lub niejednolite dane (różna liczba cech w klatkach).`);
          }
          fullDataset = fullDataset.concat(json.frames);
        }
      }

      if (fullDataset.length === 0) {
        throw new Error("Brak danych do treningu. Upewnij się, że wgrane pliki JSON zawierają tablicę 'frames'.");
      }

      // Walidacja spójności między wszystkimi plikami
      const globalInputSize = fullDataset[0].features.length;
      if (fullDataset.some(f => f.features.length !== globalInputSize)) {
        throw new Error(`Wykryto niespójność danych. Niektóre pliki mają ${globalInputSize} cech, a inne inną liczbę. Nie mieszaj starych nagrań z nowymi.`);
      }

      // Analiza balansu danych
      const stats = { correct: 0, heels_up: 0, lean: 0, shallow: 0, valgus: 0 };
      fullDataset.forEach(f => {
        let hasError = false;
        Object.keys(f.labels).forEach(l => {
          if (f.labels[l]) { stats[l]++; hasError = true; }
        });
        if (!hasError) stats.correct++;
      });

      if (stats.correct === 0 || Object.values(stats).some(v => v === 0)) {
        if (!confirm("OSTRZEŻENIE: Twój zbiór danych jest niepełny. Model musi widzieć zarówno poprawne powtórzenia, jak i błędy, aby ich nie mylić. Kontynuować?")) {
           setIsTraining(false); setStatus("Przerwano ze względu na brak balansu danych."); return;
        }
      }

      const inputSize = fullDataset[0]?.features?.length || 0;
      setStatus(`Rozpoczęto trening na ${fullDataset.length} próbkach (Cechy: ${inputSize})...`);
      const exerciseId = JSON.parse(await getFileText(datasetFiles[0])).exerciseId || 'squat';

      await model.train(fullDataset, (epoch, logs) => {
        setProgress(Math.round(((epoch + 1) / 50) * 100));
        setStatus(`Epoka ${epoch + 1}/50 | Strata: ${logs.loss.toFixed(4)} | Cechy: ${inputSize}`);
      });

      setStatus("Trening zakończony pomyślnie. Zapisywanie...");
      await model.save(`localstorage://${exerciseId}-model`);
      setStatus(`Model ${exerciseId} zapisany. Możesz teraz wrócić do aplikacji.`);

    } catch (err) {
      console.error(err);
      setStatus(`Błąd: ${err.message}`);
    } finally {
      setIsTraining(false);
    }
  };

  const loadFromSupabase = async () => {
    setStatus("Pobieranie danych z Supabase...");
    try {
      const { data, error } = await supabase.from('training_data').select('payload');
      if (error) {
        console.error("Błąd zapytania Supabase:", error);
        throw new Error(`Błąd bazy: ${error.message}. Sprawdź czy tabela 'training_data' istnieje i ma wyłączone RLS lub dodane polityki.`);
      }
      
      if (!data || data.length === 0) {
        setStatus("Baza danych jest pusta (tabela 'training_data').");
        alert("Brak danych w chmurze. Najpierw nagraj trening lub wyślij pliki lokalne.");
        return;
      }
      
      const files = data.map((item, idx) => ({
        name: `Cloud_Entry_${idx + 1}`,
        content: item.payload
      }));
      
      setDatasetFiles(prev => [...prev, ...files]);
      setStatus(`Pobrano ${data.length} zestawów danych z chmury.`);
    } catch (err) {
      console.error(err);
      setStatus(`Błąd pobierania: ${err.message}`);
    }
  };

  const uploadLocalToSupabase = async () => {
    if (datasetFiles.length === 0) return;
    setStatus("Wysyłanie plików lokalnych do bazy...");
    let successCount = 0;
    let lastError = null;
    
    try {
      for (let file of datasetFiles) {
        if (file.content) continue; 
        
        const text = await file.text();
        const json = JSON.parse(text);
        
        const { error } = await supabase.from('training_data').insert({
          payload: json,
          created_at: new Date().toISOString()
        });
        
        if (!error) {
          successCount++;
        } else {
          console.error("Błąd zapisu pliku:", error);
          lastError = error.message;
        }
      }
      
      if (successCount > 0) {
        setStatus(`Pomyślnie wysłano ${successCount} plików do bazy danych.`);
        alert(`Zsynchronizowano ${successCount} plików z chmurą!`);
      } else if (lastError) {
        setStatus(`Błąd bazy: ${lastError}`);
        alert(`Nie udało się wysłać plików. Błąd Supabase: ${lastError}`);
      } else {
        setStatus("Nie znaleziono nowych plików lokalnych do wysłania.");
      }
    } catch (err) {
      console.error(err);
      setStatus(`Błąd krytyczny: ${err.message}`);
    }
  };

  const saveToSupabaseStorage = async () => {
    if (!model.model) return;
    setStatus("Przygotowywanie plików modelu...");
    
    try {
      // 1. Zapisujemy etykiety
      const labelsBlob = new Blob([JSON.stringify(model.labels)], { type: 'application/json' });
      await supabase.storage.from('models').upload('labels.json', labelsBlob, { upsert: true });

      // 2. Wykorzystujemy IOHandler do przechwycenia plików modelu
      await model.model.save({
        save: async (artifacts) => {
          // model.json
          const modelJson = JSON.stringify({
            modelTopology: artifacts.modelTopology,
            format: artifacts.format,
            generatedBy: artifacts.generatedBy,
            convertedBy: artifacts.convertedBy,
            weightsManifest: artifacts.weightsManifest
          });
          const modelBlob = new Blob([modelJson], { type: 'application/json' });
          await supabase.storage.from('models').upload('model.json', modelBlob, { upsert: true });

          // weights.bin
          const weightsBlob = new Blob([artifacts.weightData], { type: 'application/octet-stream' });
          await supabase.storage.from('models').upload('weights.bin', weightsBlob, { upsert: true });

          return { modelArtifactsInfo: { dateSaved: new Date(), modelTopologyType: 'JSON' } };
        }
      });

      setStatus("Model został pomyślnie WYSŁANY do Supabase Storage!");
    } catch (err) {
      console.error(err);
      setStatus(`Błąd wysyłania: ${err.message}`);
    }
  };

  const trainOnServer = async () => {
    // Pozostawiamy dla osób z serwerem Node.js
    if (datasetFiles.length === 0) {
      alert("Proszę wgrać przynajmniej jeden plik JSON z danymi.");
      return;
    }
    // ... reszta kodu trainOnServer (bez zmian)

    setIsTraining(true);
    setStatus("Wysyłanie danych na serwer...");

    try {
      let fullDataset = [];
      for (let file of datasetFiles) {
        const text = await getFileText(file);
        const json = JSON.parse(text);
        if (json.frames) fullDataset = fullDataset.concat(json.frames);
      }

      const response = await fetch('/api/train', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataset: fullDataset })
      });

      const result = await response.json();
      if (result.success) {
        setStatus("Model wytrenowany, zapisany i ZARCHIWIZOWANY na serwerze.");
      } else {
        throw new Error(result.error || "Błąd serwera");
      }
    } catch (err) {
      console.error(err);
      setStatus(`Błąd serwera: ${err.message}`);
    } finally {
      setIsTraining(false);
    }
  };

  const resetModel = async () => {
    if (!confirm("Czy na pewno chcesz usunąć WSZYSTKIE wytrenowane modele? Tej operacji nie da się cofnąć.")) return;

    try {
      // 1. Czyścimy LocalStorage dla wszystkich znanych ćwiczeń
      const exercises = ['squat', 'pushup', 'lunge', 'jumping_jacks'];
      exercises.forEach(ex => {
        localStorage.removeItem(`localstorage://${ex}-model`);
        localStorage.removeItem(`localstorage://${ex}-model-labels`);
      });
      
      // Fallback dla starego klucza
      localStorage.removeItem('localstorage://exercise-model');
      localStorage.removeItem('localstorage://exercise-model-labels');

      // 2. Czyścimy Serwer
      await fetch('/api/reset-model', { method: 'POST' });

      setStatus("Wszystkie modele zostały usunięte. Możesz trenować od nowa.");
      setDatasetFiles([]);
    } catch (err) {
      setStatus(`Błąd podczas usuwania: ${err.message}`);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-8 bg-slate-900 rounded-[2rem] border border-slate-800 text-blue-100 max-w-2xl mx-auto mt-10">
      <div>
        <h2 className="text-3xl font-black text-white uppercase mb-2">Trenuj Model AI</h2>
        <p className="text-slate-400">
          Wgraj pliki JSON wygenerowane przez aplikację i dostosuj sztuczną inteligencję do analizy błędów. 
          Model użyje powiększania danych, aby poradzić sobie ze słabą jakością kamery.
        </p>
      </div>

      <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800">
        <label className="block mb-2 font-bold uppercase text-xs tracking-wider text-sky-400">Wgraj zbiory danych (.json)</label>
        <input 
          type="file" 
          multiple 
          accept=".json" 
          onChange={handleFileUpload} 
          className="block w-full text-sm text-slate-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-full file:border-0
            file:text-sm file:font-bold file:uppercase
            file:bg-sky-500 file:text-slate-950
            hover:file:bg-sky-400 cursor-pointer"
        />
        {datasetFiles.length > 0 && (
          <p className="mt-3 text-sm text-slate-300">
            Wgrano plików: {datasetFiles.length}
          </p>
        )}
      </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button 
            onClick={startTraining}
            disabled={isTraining || datasetFiles.length === 0}
            className={`py-4 rounded-xl font-black uppercase tracking-widest transition-all ${
              isTraining || datasetFiles.length === 0 
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-green-500 hover:bg-green-400 text-slate-950 shadow-[0_0_20px_rgba(34,197,94,0.3)]'
            }`}
          >
            {isTraining ? 'Trening...' : '1. Trenuj Lokalnie'}
          </button>

          <button 
            onClick={saveToSupabaseStorage}
            disabled={isTraining || !model.model}
            className={`py-4 rounded-xl font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
              isTraining || !model.model
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-sky-500 hover:bg-sky-400 text-slate-950 shadow-[0_0_20px_rgba(14,165,233,0.3)]'
            }`}
          >
            <CloudUpload size={18} /> 2. Wyślij do Chmury
          </button>
        </div>

        <div className="h-px bg-slate-800 my-2"></div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button 
            onClick={loadFromSupabase}
            className="py-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 border border-slate-700"
          >
            <CloudDownload size={14} /> Pobierz z bazy
          </button>
          <button 
            onClick={uploadLocalToSupabase}
            disabled={datasetFiles.length === 0}
            className="py-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-400 font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 border border-slate-700 disabled:opacity-50"
          >
            <Database size={14} /> Wyślij lokalne do bazy
          </button>
        </div>

        {isTraining && (
          <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
            <div className="bg-sky-500 h-2.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
          </div>
        )}

        <div className="text-sm font-mono p-4 bg-slate-950 rounded-xl border border-slate-800 text-sky-400">
          STATUS: {status}
        </div>

      <button 
        onClick={resetModel}
        className="mt-8 text-red-500 hover:text-red-400 uppercase text-[10px] font-black tracking-[0.2em] border border-red-500/20 px-4 py-2 rounded-xl transition-all hover:bg-red-500/10"
      >
        DANGER: Resetuj Model (Usuń wszystko)
      </button>

      <button 
        onClick={onBack}
        className="mt-4 text-slate-400 hover:text-white uppercase text-xs font-bold tracking-widest text-center"
      >
        Wróć do aplikacji
      </button>
    </div>
  );
}
