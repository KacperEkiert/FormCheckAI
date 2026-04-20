import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import Auth from './Auth';
import App from './App';
import LandingPage from './LandingPage';

export default function Gate() { 
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLanding, setShowLanding] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        setIsGuest(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

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

  // Jeśli kliknięto "Zaloguj" (isGuest=false) i nie ma sesji -> EKRAŃ LOGOWANIA
  if (!session && !isGuest) return <Auth onGoToLanding={() => setShowLanding(true)} />;

  // Używamy KEY, aby React wymusił całkowity re-render App przy zmianie trybu Demo -> Login
  return <App 
    key={isGuest ? 'guest-app' : (session?.user?.id || 'auth-app')}
    session={session} 
    isGuest={isGuest} 
    onGoToLanding={() => setShowLanding(true)} 
    onGoToLogin={handleGoToLogin} 
  />;
}
