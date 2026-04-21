import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

const DEFAULT_FORM_DATA = {
  firstName: '', lastName: '', age: '25', weight: '75', height: '180',
  gender: 'Mężczyzna', goal: 'Masa', activityLevel: 'Moderowany',
  experience: 'Początkujący', diet: 'Zbilansowana', equipment: 'Siłownia',
  trainingDays: ['Pon', 'Śr', 'Pią'], bio: '',
  measurements: { chest: '', arm: '', waist: '', thigh: '' }
};

const DEFAULT_STATS = {
  bmi: '0.0', bmr: 0, tdee: 0, water: 0, status: 'Oczekiwanie', 
  macros: { p: 0, f: 0, c: 0, pPct: 0, fPct: 0, cPct: 0 }
};

export const useProfile = (isGuest) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState(DEFAULT_FORM_DATA);
  const [stats, setStats] = useState(DEFAULT_STATS);
  const [saveState, setSaveState] = useState('idle');

  const runDiagnostics = useCallback((data) => {
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
    const multipliers = { 'Minimalny': 1.2, 'Niski': 1.375, 'Moderowany': 1.55, 'Wysoki': 1.725, 'Ekstremalny': 1.9 };
    const tdeeVal = Math.round(bmrVal * (multipliers[data.activityLevel] || 1.2));
    let targetKcal = tdeeVal;
    if (data.goal === 'Masa') targetKcal += 350;
    if (data.goal === 'Redukcja') targetKcal -= 500;
    const waterIntake = (w * 0.035 + (data.trainingDays.length * 0.1)).toFixed(1);

    let pGrams = Math.round(w * 2.2);
    let fGrams = Math.round(w * 1.0);
    
    if (data.diet === 'Keto') {
      let targetKcalKeto = targetKcal;
      pGrams = Math.round((targetKcalKeto * 0.25) / 4);
      fGrams = Math.round((targetKcalKeto * 0.70) / 9);
      let cGrams = Math.round((targetKcalKeto * 0.05) / 4);
      return returnStatsObj(bmiVal, bmrVal, targetKcalKeto, status, waterIntake, pGrams, fGrams, cGrams);
    } 
    
    if (data.diet === 'Wysokobiałkowa') pGrams = Math.round(w * 2.6);
    
    const pKcal = pGrams * 4;
    const fKcal = fGrams * 9;
    let cKcal = targetKcal - pKcal - fKcal;
    let cGrams = Math.max(0, Math.round(cKcal / 4));

    return returnStatsObj(bmiVal, bmrVal, targetKcal, status, waterIntake, pGrams, fGrams, cGrams);
  }, []);

  const returnStatsObj = (bmi, bmr, tdee, status, water, p, f, c) => {
    const totalKcal = (p * 4) + (f * 9) + (c * 4);
    return {
      bmi: bmi.toFixed(1), bmr: Math.round(bmr), tdee: tdee, status, water: water,
      macros: { 
        p: p, f: f, c: c, 
        pPct: Math.round(((p * 4) / totalKcal) * 100) || 0,
        fPct: Math.round(((f * 9) / totalKcal) * 100) || 0,
        cPct: Math.round(((c * 4) / totalKcal) * 100) || 0 
      }
    };
  };

  useEffect(() => {
    const initSystem = async () => {
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
          let parsedData = profile?.payload || JSON.parse(localStorage.getItem(`profile_data_${user.id}`) || '{}');
          const merged = {
            ...DEFAULT_FORM_DATA,
            ...parsedData,
            measurements: { ...DEFAULT_FORM_DATA.measurements, ...(parsedData.measurements || {}) },
            trainingDays: parsedData.trainingDays || DEFAULT_FORM_DATA.trainingDays
          };
          setFormData(merged);
          setStats(runDiagnostics(merged));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    initSystem();
  }, [isGuest, runDiagnostics]);

  const saveProfileData = async () => {
    if (isGuest) return;
    setSaveState('saving');
    const cleanData = {
      ...formData,
      age: Math.max(13, parseInt(formData.age) || 25).toString(),
      weight: Math.max(30, parseFloat(formData.weight) || 75).toString(),
      height: Math.max(100, parseFloat(formData.height) || 180).toString(),
      measurements: {
        chest: formData.measurements.chest ? Math.max(0, parseFloat(formData.measurements.chest)).toString() : '',
        arm: formData.measurements.arm ? Math.max(0, parseFloat(formData.measurements.arm)).toString() : '',
        waist: formData.measurements.waist ? Math.max(0, parseFloat(formData.measurements.waist)).toString() : '',
        thigh: formData.measurements.thigh ? Math.max(0, parseFloat(formData.measurements.thigh)).toString() : '',
      }
    };

    try {
      const { error } = await supabase.from('profiles').upsert({ id: user?.id, payload: cleanData, updated_at: new Date().toISOString() });
      if (error) throw error;
      localStorage.setItem(`profile_data_${user?.id}`, JSON.stringify(cleanData));
      setFormData(cleanData);
      setStats(runDiagnostics(cleanData));
      setSaveState('success');
      setTimeout(() => setSaveState('idle'), 3000);
    } catch (e) {
      console.error(e);
      setSaveState('error');
      setTimeout(() => setSaveState('idle'), 3000);
    }
  };

  const toggleDay = (day) => {
    if (isGuest) return;
    const days = formData.trainingDays.includes(day) ? formData.trainingDays.filter(d => d !== day) : [...formData.trainingDays, day];
    setFormData({...formData, trainingDays: days});
  };

  return {
    user,
    loading,
    formData,
    setFormData,
    stats,
    saveState,
    saveProfileData,
    toggleDay
  };
};
