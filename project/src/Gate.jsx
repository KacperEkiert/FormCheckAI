import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import Auth from './Auth';
import App from './App';

export default function Gate() { 
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div style={{ background: '#020617', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8' }}>
        Weryfikacja dostępu...
      </div>
    );
  }

  if (!session) return <Auth />;

  return <App session={session} />;
}