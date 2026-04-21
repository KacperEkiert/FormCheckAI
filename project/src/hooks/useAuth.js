import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export const useAuth = () => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false); 
  const [authLoading, setAuthLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState({});
  const [authError, setAuthError] = useState('');
  const [isShaking, setIsShaking] = useState(false);
  
  const [formData, setFormData] = useState({
    email: '', password: '', confirmPassword: '', firstName: '', lastName: ''
  });

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

  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 400);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setAuthError('');
    if (errors[name]) {
      setErrors(prev => {
        const newErrs = { ...prev };
        delete newErrs[name];
        return newErrs;
      });
    }
  };

  const validate = () => {
    let newErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) newErrors.email = "Błędny format e-mail";
    if (formData.password.length < 6) newErrors.password = "Hasło: min. 6 znaków";
    if (isRegistering) {
      if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = "Hasła nie są identyczne";
      if (!formData.firstName) newErrors.firstName = "Podaj imię";
      if (!formData.lastName) newErrors.lastName = "Podaj nazwisko";
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      triggerShake();
      return false;
    }
    return true;
  };

  const handleAuth = async (e) => {
    if (e) e.preventDefault();
    setAuthError('');
    if (!validate()) return;
    setAuthLoading(true);

    try {
      if (isRegistering) {
        const { data, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: { 
            data: { first_name: formData.firstName, last_name: formData.lastName },
            emailRedirectTo: window.location.origin 
          }
        });
        if (error) throw error;

        if (data?.user && !data?.session) {
          setIsEmailSent(true);
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password
        });
        if (error) throw error;
      }
    } catch (err) {
      triggerShake();
      const errMsg = err.message === "Invalid login credentials" ? "BŁĘDNY E-MAIL LUB HASŁO" : err.message.toUpperCase();
      setAuthError(errMsg);
    } finally {
      setAuthLoading(false);
    }
  };

  return {
    session,
    loading,
    isGuest,
    setIsGuest,
    isRegistering,
    setIsRegistering,
    isEmailSent,
    setIsEmailSent,
    authLoading,
    showPassword,
    setShowPassword,
    rememberMe,
    setRememberMe,
    errors,
    setErrors,
    authError,
    setAuthError,
    isShaking,
    formData,
    handleChange,
    handleAuth
  };
};
