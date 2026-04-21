import React from 'react';
import { Zap, Dumbbell, Timer, Trophy, Flame } from 'lucide-react';

export const ACTIVITIES = [
  { id: "001", name: 'Przysiady Klasyczne', category: 'Nogi', time: '15m', icon: <Zap size={16} className="text-amber-400"/>, achievement: "Król Przysiadów" },
  { id: "002", name: 'Pompki Diamentowe', category: 'Klatka', time: '10m', icon: <Dumbbell size={16} className="text-sky-400"/>, achievement: "Twardy jak Diament" },
  { id: "003", name: 'Plank (Deska)', category: 'Core', time: '5m', icon: <Timer size={16} className="text-emerald-400"/>, achievement: "Łamacz Desek" },
  { id: "004", name: 'Wykroki AI', category: 'Nogi', time: '20m', icon: <Zap size={16} className="text-amber-400"/>, achievement: "Cyber-Wykrok" },
  { id: "005", name: 'Podciąganie', category: 'Plecy', time: '15m', icon: <Trophy size={16} className="text-emerald-400"/>, achievement: "Wspinaczka na Szczyt" },
  { id: "006", name: 'Wyciskanie Żołnierskie', category: 'Barki', time: '12m', icon: <Zap size={16} className="text-amber-400"/>, achievement: "Generał Barków" },
  { id: "007", name: 'Uginanie ramion', category: 'Biceps', time: '10m', icon: <Dumbbell size={16} className="text-sky-400"/>, achievement: "Stalowe Bicepsy" },
  { id: "008", name: 'Dipy (Pompki tyłem)', category: 'Triceps', time: '12m', icon: <Dumbbell size={16} className="text-sky-400"/>, achievement: "Mistrz Tricepsu" },
  { id: "009", name: 'Burpees', category: 'Kardio', time: '10m', icon: <Flame size={16} className="text-red-500"/>, achievement: "Piekielna Kondycja" },
  { id: "010", name: 'Dead Bug', category: 'Core', time: '8m', icon: <Timer size={16} className="text-emerald-400"/>, achievement: "Pogromca Robaka" },
  { id: "011", name: 'Wiosłowanie', category: 'Plecy', time: '15m', icon: <Trophy size={16} className="text-emerald-400"/>, achievement: "Galernik Mocy" },
  { id: "012", name: 'Wspięcia na palce', category: 'Nogi', time: '10m', icon: <Dumbbell size={16} className="text-sky-400"/>, achievement: "Lekka Stopa" },
  { id: "013", name: 'Uginanie nadgarstków z hantlami', category: 'Przedramie', time: '10m', icon: <Dumbbell size={16} className="text-sky-400"/>, achievement: "Uścisk Imadła" },
];
