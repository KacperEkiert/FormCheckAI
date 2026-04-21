import { useState, useCallback } from 'react';

export const useAppState = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showAchievements, setShowAchievements] = useState(false);
  const [currentView, setCurrentView] = useState('list'); 
  const [muscleFilter, setMuscleFilter] = useState('Wszystkie');
  const [selectedEx, setSelectedEx] = useState({ name: "Przysiady Klasyczne", id: "001", category: "Nogi" });
  const [active, setActive] = useState(false);
  const [workoutHistory, setWorkoutHistory] = useState([]);
  const [currentWorkoutIndex, setCurrentWorkoutIndex] = useState(0);
  const [avatarUrl, setAvatarUrl] = useState(localStorage.getItem('userAvatar') || null);
  const [selectedAchievementId, setSelectedAchievementId] = useState(null);

  const handleWorkoutFinish = useCallback((reps, videoURL, debugInfo) => {
    setWorkoutHistory(prev => {
      const newWorkout = { 
        name: selectedEx.name, 
        category: selectedEx.category, 
        reps, 
        videoUrl: videoURL, 
        debug: debugInfo, 
        score: debugInfo.score, 
        date: new Date().toLocaleTimeString() 
      };
      const updated = [...prev, newWorkout];
      setCurrentWorkoutIndex(updated.length - 1);
      return updated;
    });
    
    setCurrentView('feedback'); 
    setActive(false);
  }, [selectedEx.name, selectedEx.category]);

  const handleAchievementClick = useCallback((id, setView, setAchievements) => {
    setSelectedAchievementId(id);
    setView('profile');
    setAchievements(false);
    setTimeout(() => setSelectedAchievementId(null), 1000);
  }, []);

  return {
    isSidebarOpen, setIsSidebarOpen,
    showAchievements, setShowAchievements,
    currentView, setCurrentView,
    muscleFilter, setMuscleFilter,
    selectedEx, setSelectedEx,
    active, setActive,
    workoutHistory,
    currentWorkoutIndex, setCurrentWorkoutIndex,
    avatarUrl, setAvatarUrl,
    selectedAchievementId,
    handleWorkoutFinish,
    handleAchievementClick
  };
};
