import React from 'react';
import "@tensorflow/tfjs-backend-webgl";
import { Play, Square, BrainCircuit } from 'lucide-react';

// Custom Hooks for state and logic
import { useAppState } from './hooks';

// Layout Components
import { 
  Sidebar, 
  Header, 
  AchievementsPanel 
} from './components/Layout';

// Workout & Analysis Components
import { 
  CameraView, 
  GymActivitiesList, 
  InteractiveModel,
  ExerciseModelViewer
} from './components/Workout';

// Feature Views
import FeedbackPage from './components/Feedback';
import UserProfile from './components/Profile';
import ModelTrainer from './components/Trainer';
import { HomeView } from './components/Home';

/**
 * App Component
 * Core container managing application layout, routing between views, 
 * and orchestrating workout analysis state.
 */
export default function App({ onGoToLanding, onGoToLogin, isGuest, session }) {
  // Extract state management to a specialized hook to keep UI clean
  const {
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
  } = useAppState();

  // Helper to determine if we are in the workout/camera mode
  const isWorkoutView = currentView === 'model';

  return (
    <div className="h-[100dvh] w-screen bg-slate-950 text-blue-100 flex overflow-hidden relative font-sans">
      
      {/* 1. Sidebar Navigation - Hidden on Home View */}
      {currentView !== 'home' && (
        <div className="relative z-[1000]">
          <Sidebar 
            isSidebarOpen={isSidebarOpen}
            setIsSidebarOpen={setIsSidebarOpen}
            currentView={currentView}
            setCurrentView={setCurrentView}
            workoutHistory={workoutHistory}
            avatarUrl={avatarUrl}
            onGoToLanding={onGoToLanding}
          />
        </div>
      )}

      {/* 2. Main Application Content Area */}
      <main className={`flex-grow min-w-0 flex flex-col overflow-y-auto relative text-blue-100 
        ${currentView === 'home' || isWorkoutView ? 'p-0' : 'p-4 md:p-8'}`}>
        
        {/* Dynamic Header - Centered for Mobile via Header component */}
        {currentView !== 'home' && !isWorkoutView && (
          <Header 
            currentView={currentView}
            setShowAchievements={setShowAchievements}
            className={currentView === 'model' && active ? 'hidden' : ''}
          />
        )}

        <div className="flex-grow flex flex-col min-h-0">
          {/* Main Routing Logic */}
          {currentView === 'feedback' ? (
            <FeedbackPage 
              workouts={workoutHistory} 
              currentIndex={currentWorkoutIndex}
              onNavigate={setCurrentWorkoutIndex}
              onBack={() => setCurrentView('list')} 
              onSelectNewExercise={(ex) => { 
                setSelectedEx(ex); 
                setCurrentView('model'); 
              }} 
            />
          ) : currentView === 'home' ? (
            <HomeView 
              userName={session?.user?.user_metadata?.full_name || session?.user?.email?.split('@')[0]} 
              onSelectCategory={(cat) => {
                setMuscleFilter(cat);
                setCurrentView('list');
              }}
            />
          ) : currentView === 'train' ? (
            <ModelTrainer onBack={() => setCurrentView('list')} />
          ) : currentView === 'profile' ? (
            <UserProfile 
              avatarUrl={avatarUrl} 
              isGuest={isGuest}
              onLogin={onGoToLogin}
              onAvatarChange={(newUrl) => {
                setAvatarUrl(newUrl);
                localStorage.setItem('userAvatar', newUrl);
              }} 
              initialAchievementId={selectedAchievementId}
            />
          ) : (
            /* Dashboard view split between Library and 3D Atlas / Camera */
            <div className={`h-full flex flex-col min-h-0 ${isWorkoutView ? 'relative' : 'xl:grid xl:grid-cols-2 gap-6'}`}>
              
              {/* Left Column: Activity List (Order-2 on mobile so it stays under the model) */}
              {!isWorkoutView && (
                <section className="flex flex-col gap-4 min-h-[400px] order-2 xl:order-1 relative min-h-0">
                  <div className="flex-grow bg-slate-900/40 rounded-[2rem] border border-slate-800 overflow-hidden relative shadow-inner min-h-0">
                    <GymActivitiesList 
                      onSelectActivity={(a) => { 
                        setSelectedEx(a); 
                        setCurrentView('model'); 
                      }} 
                      filter={muscleFilter} 
                      setFilter={setMuscleFilter} 
                    />
                  </div>
                </section>
              )}

              {/* Right Column: Interactive 3D Model or FULLSCREEN Camera Feed */}
              <section className={`flex flex-col gap-4 transition-all duration-500 relative min-h-0
                ${isWorkoutView 
                  ? 'fixed inset-0 z-[120] bg-black p-0 m-0 w-screen h-screen' 
                  : 'min-h-[480px] md:min-h-[500px] order-1 xl:order-2'}`}>

                <div className={`flex-grow relative overflow-hidden transition-all duration-500
                  ${isWorkoutView 
                    ? 'rounded-0' 
                    : 'rounded-[2rem] border border-slate-800 shadow-2xl bg-slate-950'}`}>
                  
                  {!isWorkoutView ? (
                    /* 3D Muscle Atlas - Significantly larger on mobile due to section min-h */
                    <InteractiveModel 
                      onSelect={(c) => setMuscleFilter(c.charAt(0).toUpperCase() + c.slice(1).toLowerCase())} 
                      currentCategory={muscleFilter.toUpperCase()} 
                    />
                  ) : (
                    /* Real-time AI analysis camera view with Model Overlay */
                    <div className="w-full h-full relative">
                      <CameraView 
                        isActive={active} 
                        isGuest={isGuest} 
                        onWorkoutFinish={handleWorkoutFinish} 
                        selectedEx={selectedEx}
                      />

                      {/* MINI MODEL OVERLAY - Bottom left of camera feed */}
                      <div className="absolute bottom-28 left-6 w-[220px] h-[165px] md:w-[320px] md:h-[240px] bg-slate-900/40 backdrop-blur-xl rounded-[2rem] border border-white/10 shadow-2xl overflow-hidden z-[140] animate-in slide-in-from-left-5 duration-700">
                        <div className="absolute top-4 left-5 z-10 flex items-center gap-2 pointer-events-none">
                          <div className="bg-sky-500 p-1 rounded-lg">
                            <BrainCircuit size={12} className="text-slate-950" />
                          </div>
                          <p className="text-[9px] font-black uppercase text-white tracking-[0.15em] drop-shadow-md">
                            {selectedEx?.name}
                          </p>
                        </div>
                        
                        {selectedEx?.modelPath ? (
                          <ExerciseModelViewer modelPath={selectedEx.modelPath} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center p-6 text-center bg-slate-950/20">
                            <p className="text-[8px] text-slate-400 uppercase font-bold tracking-widest leading-relaxed">
                              Brak modelu 3D dla tego ćwiczenia
                            </p>
                          </div>
                        )}
                        
                        <div className="absolute bottom-3 left-0 w-full text-center pointer-events-none">
                          <p className="text-[7px] text-sky-400/60 font-bold uppercase tracking-[0.2em]">Technika Wzorcowa</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* AI System Control Panel - Fixed at bottom in workout mode */}
                {isWorkoutView && (
                  <div className="bg-slate-900/95 backdrop-blur-xl h-[85px] grid grid-cols-3 items-center px-8 md:px-12 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] border-t border-white/5 fixed bottom-0 left-0 w-full z-[150]">
                    <div className="hidden md:block" />
                    <div className="flex flex-col items-center justify-center text-center col-span-3 md:col-span-1">
                      <div className="flex items-center gap-3 mb-1.5">
                        <div className="relative flex items-center justify-center">
                          <div className={`h-3 w-3 rounded-full ${active ? 'bg-green-500 animate-pulse shadow-[0_0_15px_#22c55e]' : 'bg-red-500 shadow-[0_0_15px_#ef4444]'}`} />
                          {active && <div className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-20" />}
                        </div>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] leading-none">
                          {active ? 'Analiza AI Aktywna' : 'Status: Gotowość'}
                        </p>
                      </div>
                      <p className="text-[12px] text-white font-black uppercase tracking-wider italic">
                        {active ? 'Monitorowanie postawy...' : 'Ustaw się przed kamerą'}
                      </p>
                    </div>
                    <div className="flex justify-end">
                      <button 
                        onClick={() => setActive(!active)} 
                        className={`group flex items-center gap-4 px-10 h-[54px] rounded-2xl border transition-all duration-500 font-black uppercase tracking-[0.25em] text-[11px] ${
                          active 
                            ? 'bg-red-500 border-red-400 text-white shadow-[0_0_30px_rgba(239,68,68,0.4)]' 
                            : 'bg-sky-500 border-sky-400 text-slate-950 shadow-[0_0_30px_rgba(14,165,233,0.4)] hover:scale-105 active:scale-95'
                        }`}
                      >
                        {active ? <Square size={16} fill="white" /> : <Play size={16} fill="black" />}
                        <span className="hidden sm:inline">{active ? 'Zakończ' : 'Rozpocznij'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </main>

      {/* 3. Achievements Overlay Side Panel */}
      <AchievementsPanel 
        showAchievements={showAchievements}
        setShowAchievements={setShowAchievements}
        handleAchievementClick={(id) => handleAchievementClick(id, setCurrentView, setShowAchievements)}
      />

    </div>
  );
}