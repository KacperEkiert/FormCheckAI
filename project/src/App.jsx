import React from 'react';
import "@tensorflow/tfjs-backend-webgl";
import { Footprints, Play, Square } from 'lucide-react';

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
  InteractiveModel 
} from './components/Workout';

// Feature Views
import FeedbackPage from './components/Feedback';
import UserProfile from './components/Profile';

/**
 * App Component
 * Core container managing application layout, routing between views, 
 * and orchestrating workout analysis state.
 */
export default function App({ onGoToLanding, onGoToLogin, isGuest }) {
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

  return (
    <div className="h-[100dvh] w-screen bg-slate-950 text-blue-100 flex overflow-hidden relative font-sans">
      
      {/* 1. Primary Navigation Sidebar */}
      <Sidebar 
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        currentView={currentView}
        setCurrentView={setCurrentView}
        workoutHistory={workoutHistory}
        avatarUrl={avatarUrl}
        onGoToLanding={onGoToLanding}
      />

      {/* 2. Main Application Content Area */}
      <main className="flex-grow flex flex-col p-4 md:p-8 overflow-y-auto relative text-blue-100">
        
        {/* Dynamic Header responding to current view */}
        <Header 
          currentView={currentView}
          setShowAchievements={setShowAchievements}
        />

        <div className="flex-grow">
          {/* Main Routing Logic */}
          {currentView === 'feedback' ? (
            /* Post-workout analysis view */
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
          ) : currentView === 'profile' ? (
            /* User profile and settings view */
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
            <div className="h-full flex flex-col xl:grid xl:grid-cols-2 gap-6">
              
              {/* Left Column: Activity List or Current Exercise Info */}
              <section className="flex flex-col gap-4 min-h-[400px] order-2 xl:order-1">
                <div className="flex-grow bg-slate-900/40 rounded-[2rem] border border-slate-800 overflow-hidden relative shadow-inner">
                  {currentView === 'model' ? (
                    /* Display selected exercise info when in training mode */
                    <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center">
                      <Footprints size={120} className="text-sky-900 opacity-20 absolute" />
                      <div className="z-10 bg-slate-950/50 p-6 rounded-3xl border border-slate-800/50 backdrop-blur-sm">
                        <p className="text-sm font-black uppercase text-sky-500 tracking-[0.2em] italic mb-2">
                          Wybrane ćwiczenie
                        </p>
                        <h3 className="text-2xl font-black uppercase mb-4">
                          {selectedEx.name}
                        </h3>
                        <p className="text-[10px] text-slate-400 uppercase font-bold max-w-xs leading-relaxed italic border-t border-slate-800 pt-4">
                          Uruchom AI i ustaw się w polu widzenia, aby rozpocząć analizę.
                        </p>
                      </div>
                    </div>
                  ) : (
                    /* Display filterable library of activities */
                    <GymActivitiesList 
                      onSelectActivity={(a) => { 
                        setSelectedEx(a); 
                        setCurrentView('model'); 
                      }} 
                      filter={muscleFilter} 
                      setFilter={setMuscleFilter} 
                    />
                  )}
                </div>
              </section>

              {/* Right Column: Interactive 3D Model or Live Camera Feed */}
              <section className="flex flex-col gap-4 min-h-[450px] order-1 xl:order-2">
                <div className="flex-grow rounded-[2rem] border border-slate-800 overflow-hidden relative shadow-2xl bg-slate-950">
                  {currentView === 'list' ? (
                    /* 3D Muscle Atlas for category selection */
                    <InteractiveModel 
                      onSelect={(c) => setMuscleFilter(c.charAt(0).toUpperCase() + c.slice(1).toLowerCase())} 
                      currentCategory={muscleFilter.toUpperCase()} 
                    />
                  ) : (
                    /* Real-time AI analysis camera view */
                    <CameraView 
                      isActive={active} 
                      isGuest={isGuest} 
                      onWorkoutFinish={handleWorkoutFinish} 
                    />
                  )}
                </div>

                {/* AI System Control Panel */}
                <div className="bg-slate-900/80 backdrop-blur-md h-[72px] rounded-2xl border border-slate-800 flex items-center justify-between px-6 shadow-xl">
                  <div className="flex items-center gap-3">
                    <div className={`h-3 w-3 rounded-full ${active ? 'bg-green-500 animate-pulse shadow-[0_0_15px_#22c55e]' : 'bg-red-500'}`} />
                    <p className="hidden xs:block text-[10px] text-slate-400 font-black uppercase tracking-widest">
                      {active ? 'System Active' : 'System Standby'}
                    </p>
                  </div>
                  
                  {currentView === 'model' && (
                    /* Main Start/Stop button for analysis */
                    <button 
                      onClick={() => setActive(!active)} 
                      className={`flex items-center gap-3 px-10 h-[48px] rounded-2xl border transition-all duration-300 font-black uppercase tracking-widest text-[10px] ${
                        active 
                          ? 'bg-red-500 border-red-400 text-white shadow-[0_0_20px_rgba(239,68,68,0.3)]' 
                          : 'bg-sky-500 border-sky-400 text-slate-950 shadow-[0_0_20px_rgba(14,165,233,0.4)]'
                      }`}
                    >
                      {active ? <Square size={14} fill="white" /> : <Play size={14} fill="black" />}
                      <span>{active ? 'Zatrzymaj' : 'Uruchom AI'}</span>
                    </button>
                  )}
                </div>
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
