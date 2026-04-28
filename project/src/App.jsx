import React from 'react';
import "@tensorflow/tfjs-backend-webgl";
import { Play, Square } from 'lucide-react';

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

  return (
    <div className="h-[100dvh] w-screen bg-slate-950 text-blue-100 flex overflow-hidden relative font-sans">
      
      {/* 1. Primary Navigation Sidebar */}
      {currentView !== 'home' && (
        <Sidebar 
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          currentView={currentView}
          setCurrentView={setCurrentView}
          workoutHistory={workoutHistory}
          avatarUrl={avatarUrl}
          onGoToLanding={onGoToLanding}
        />
      )}

      {/* 2. Main Application Content Area */}
      <main className={`flex-grow min-w-0 flex flex-col overflow-y-auto relative text-blue-100 ${currentView === 'home' ? 'p-0' : 'p-4 md:p-8'}`}>
        
        {/* Dynamic Header responding to current view */}
        {currentView !== 'home' && (
          <Header 
            currentView={currentView}
            setShowAchievements={setShowAchievements}
            className={currentView === 'model' && active ? 'hidden' : ''}
          />
        )}

        <div className="flex-grow flex flex-col min-h-0">
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
          ) : currentView === 'home' ? (
            /* Dashboard Home with 3D model and quick navigation */
            <HomeView 
              userName={session?.user?.user_metadata?.full_name || session?.user?.email?.split('@')[0]} 
              onSelectCategory={(cat) => {
                setMuscleFilter(cat);
                setCurrentView('list');
              }}
            />
          ) : currentView === 'train' ? (
            /* Model AI Training view */
            <ModelTrainer onBack={() => setCurrentView('list')} />
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
            <div className={`h-full flex flex-col min-h-0 ${currentView === 'model' && active ? 'gap-0' : 'xl:grid xl:grid-cols-2 gap-6'}`}>
              
              {/* Left Column: Activity List or Current Exercise Info */}
              {!(currentView === 'model' && active) && (
                <section className="flex flex-col gap-4 min-h-[400px] order-2 xl:order-1 relative min-h-0">
                  <div className="flex-grow bg-slate-900/40 rounded-[2rem] border border-slate-800 overflow-hidden relative shadow-inner min-h-0">

                  {currentView === 'model' ? (
                    /* Display selected exercise info when in training mode */
                    <div className="w-full h-full flex flex-col bg-slate-900/40 rounded-3xl border border-slate-800/50 shadow-inner overflow-hidden">
                      {/* Nagłówek techniki */}
                      <div className="p-6 bg-slate-950/30 border-b border-slate-800/50">
                        <p className="text-[10px] font-black uppercase text-sky-500 tracking-[0.2em] italic mb-1">
                          Podgląd techniki
                        </p>
                        <h3 className="text-2xl font-black uppercase text-white leading-none">
                          {selectedEx.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="px-2 py-0.5 bg-sky-500/10 text-sky-400 text-[9px] font-bold rounded border border-sky-500/20 uppercase">
                            Interaktywny Model 3D
                          </span>
                        </div>
                      </div>

                      {/* Kontener na model */}
                      <div className="flex-1 relative w-full">
                        {selectedEx?.modelPath ? (
                          <ExerciseModelViewer modelPath={selectedEx.modelPath} />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center">
                            <div className="z-10 bg-slate-950/50 p-6 rounded-3xl border border-slate-800/50 backdrop-blur-sm">
                              <p className="text-[10px] text-slate-400 uppercase font-bold max-w-xs leading-relaxed italic border-t border-slate-800 pt-4">
                                Uruchom AI i ustaw się w polu widzenia, aby rozpocząć analizę.
                              </p>
                            </div>
                          </div>
                        )}
                        
                        {selectedEx?.modelPath && (
                          <div className="absolute bottom-4 right-4 pointer-events-none">
                            <p className="text-[9px] text-slate-500 uppercase font-bold italic bg-slate-950/50 px-3 py-1 rounded-full backdrop-blur-sm">
                              Przytrzymaj i przesuń, aby obrócić
                            </p>
                          </div>
                        )}
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
              )}

              {/* Right Column: Interactive 3D Model or Live Camera Feed */}
              <section className={`flex flex-col gap-4 ${currentView === 'model' && active ? 'flex-grow min-h-[0px]' : 'min-h-[240px] md:min-h-[450px]'} order-1 xl:order-2 relative min-h-0`}>

                <div className="flex-grow rounded-[2rem] border border-slate-800 overflow-hidden relative shadow-2xl bg-slate-950 min-h-0">
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
                      selectedEx={selectedEx}
                    />
                  )}
                </div>

                {/* AI System Control Panel */}
                {currentView === 'model' && (
                  <div className="bg-slate-900/80 backdrop-blur-md h-[72px] rounded-2xl border border-slate-800 flex items-center justify-between px-6 shadow-xl shrink-0">
                    <div className="flex items-center gap-3">
                      <div className={`h-3 w-3 rounded-full ${active ? 'bg-green-500 animate-pulse shadow-[0_0_15px_#22c55e]' : 'bg-red-500'}`} />
                      <p className="hidden xs:block text-[10px] text-slate-400 font-black uppercase tracking-widest">
                        {active ? 'System Active' : 'System Standby'}
                      </p>
                    </div>
                    
                    {/* Main Start/Stop button for analysis */}
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
