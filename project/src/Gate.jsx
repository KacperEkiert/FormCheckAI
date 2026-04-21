import React, { useState } from 'react';
import { useAuth } from './hooks';
import { Auth, LandingPage } from './components';
import App from './App';

export default function Gate() { 
  const authState = useAuth();
  const { session, loading, isGuest, setIsGuest } = authState;
  const [showLanding, setShowLanding] = useState(true);

  const handleStartDemo = () => {
    setIsGuest(true);
    setShowLanding(false);
  };

  const handleGoToLogin = () => {
    setIsGuest(false);
    setShowLanding(false);
  };

  if (showLanding) {
    return <LandingPage onLaunch={handleGoToLogin} onDemo={handleStartDemo} session={session} />;
  }

  if (loading && !isGuest) {
    return (
      <div style={{ background: '#020617', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8' }}>
        Weryfikacja dostępu...
      </div>
    );
  }

  if (!session && !isGuest) {
    return <Auth authState={authState} onGoToLanding={() => setShowLanding(true)} />;
  }

  return <App 
    key={isGuest ? 'guest-app' : (session?.user?.id || 'auth-app')}
    session={session} 
    isGuest={isGuest} 
    onGoToLanding={() => setShowLanding(true)} 
    onGoToLogin={handleGoToLogin} 
  />;
}
