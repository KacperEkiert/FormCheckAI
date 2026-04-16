import React, { useState } from 'react';
import { supabase } from './supabaseClient';
import { 
  User, Mail, Lock, ArrowRight, CheckCircle2, 
  AlertCircle, Loader2, Eye, EyeOff 
} from 'lucide-react';

const InputField = ({ name, icon: Icon, placeholder, type = "text", error, showEyeToggle, value, onChange, showPassword, setShowPassword, autoComplete, isCompact }) => (
  <div className={`w-full ${isCompact ? 'min-h-[60px]' : 'min-h-[68px]'} transition-all duration-300`}>
    <div className={`relative w-full flex items-center bg-[#0f172a]/60 border rounded-xl outline-none transition-all duration-300
        ${error 
          ? 'border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.2)]' 
          : 'border-slate-800 focus-within:border-sky-500 focus-within:ring-1 focus-within:ring-sky-500/20'
        }`}>
      {Icon && (
        <div className={`absolute left-3 z-10 transition-colors ${error ? 'text-red-500' : 'text-slate-500'}`}>
          <Icon size={14} />
        </div>
      )}
      <input
        name={name}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={onChange}
        autoComplete={autoComplete || "off"}
        className={`w-full ${isCompact ? 'h-[38px]' : 'h-[44px]'} bg-transparent p-3 rounded-xl text-slate-100 text-[13px] outline-none placeholder:text-slate-600 font-medium
          ${Icon ? 'pl-10' : 'pl-3'}
          ${showEyeToggle ? 'pr-10' : 'pr-3'}
          autofill-custom`}
      />
      {showEyeToggle && (
        <button 
          type="button" 
          onClick={() => setShowPassword(!showPassword)} 
          className="absolute right-3 text-slate-500 hover:text-white transition-colors z-10"
        >
          {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      )}
    </div>
    {error ? (
      <span className="text-[10px] text-red-500 font-bold ml-2 mt-1 block uppercase tracking-wider animate-in fade-in slide-in-from-top-1">
        {error}
      </span>
    ) : (
      <div className={isCompact ? "h-[8px]" : "h-[12px]"}></div> 
    )}
  </div>
);

export default function Auth() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false); 
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState({});
  const [authError, setAuthError] = useState('');
  const [isShaking, setIsShaking] = useState(false);
  
  const [formData, setFormData] = useState({
    email: '', password: '', confirmPassword: '', firstName: '', lastName: ''
  });

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
    e.preventDefault();
    setAuthError('');
    if (!validate()) return;
    setLoading(true);

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
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#0a0f1d] flex items-center justify-center p-4 antialiased overflow-hidden" style={{ fontFamily: '"Inter", sans-serif' }}>
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-sky-600/10 blur-[130px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-blue-700/5 blur-[130px]" />
      </div>

      <div className={`relative w-full max-w-[380px] z-10 ${isShaking ? 'animate-shake' : ''}`}>
        <div className="bg-[#0f172a]/80 backdrop-blur-2xl border border-slate-800 p-6 sm:p-8 rounded-3xl shadow-[0_0_60px_rgba(0,0,0,0.7)] relative z-10">
          
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-sky-500 border border-sky-400 rounded-2xl mb-4 shadow-[0_0_25px_rgba(14,165,233,0.4)] rotate-3">
              <CheckCircle2 className="text-slate-900 w-6 h-6" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tighter uppercase italic">
              FormCheck <span className="text-sky-400">AI</span>
            </h1>
          </div>

          {isEmailSent ? (
            <div className="text-center py-4 animate-in fade-in zoom-in-95 duration-500">
              <div className="w-16 h-16 bg-sky-500/10 border border-sky-500/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(14,165,233,0.1)]">
                <Mail className="text-sky-400 w-8 h-8 animate-bounce" />
              </div>
              <h2 className="text-white font-bold text-xl mb-3 uppercase tracking-tight">Sprawdź skrzynkę!</h2>
              <p className="text-slate-400 text-[13px] leading-relaxed mb-8">
                Wysłaliśmy link aktywacyjny na adres:<br/>
                <span className="text-sky-400 font-mono mt-2 block bg-sky-400/5 py-1 rounded border border-sky-400/10">{formData.email}</span>
              </p>
              <button 
                onClick={() => { setIsEmailSent(false); setIsRegistering(false); }}
                className="text-sky-500 hover:text-sky-400 text-[10px] font-black uppercase tracking-[0.2em] transition-all border-b border-sky-500/20 pb-1"
              >
                [ Wróć do logowania ]
              </button>
            </div>
          ) : (
            <>
              {authError && (
                <div className="mb-5 p-3.5 bg-red-500/10 border border-red-500/40 rounded-xl text-red-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-3 animate-in fade-in zoom-in-95">
                  <AlertCircle size={16} /> {authError}
                </div>
              )}

              <form onSubmit={handleAuth} noValidate className="space-y-1">
                {isRegistering ? (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3">
                      <InputField name="firstName" icon={User} placeholder="Imię" value={formData.firstName} error={errors.firstName} onChange={handleChange} isCompact />
                      <InputField name="lastName" placeholder="Nazwisko" value={formData.lastName} error={errors.lastName} onChange={handleChange} isCompact />
                    </div>
                    <InputField name="email" icon={Mail} placeholder="Adres e-mail" type="email" value={formData.email} error={errors.email} onChange={handleChange} isCompact />
                    <InputField name="password" icon={Lock} placeholder="Hasło" type={showPassword ? "text" : "password"} value={formData.password} error={errors.password} showEyeToggle showPassword={showPassword} setShowPassword={setShowPassword} onChange={handleChange} isCompact />
                    <InputField name="confirmPassword" icon={Lock} placeholder="Potwierdź hasło" type={showPassword ? "text" : "password"} value={formData.confirmPassword} error={errors.confirmPassword} onChange={handleChange} isCompact />
                  </>
                ) : (
                  <>
                    <InputField name="email" icon={Mail} placeholder="Adres e-mail" type="email" value={formData.email} error={errors.email} onChange={handleChange} />
                    <InputField name="password" icon={Lock} placeholder="Hasło użytkownika" type={showPassword ? "text" : "password"} value={formData.password} error={errors.password} showEyeToggle showPassword={showPassword} setShowPassword={setShowPassword} onChange={handleChange} />
                    
                    <div className="flex justify-center items-center gap-3 py-4">
                      <div 
                        onClick={() => setRememberMe(!rememberMe)}
                        className={`w-5 h-5 border rounded-lg transition-all cursor-pointer flex items-center justify-center
                          ${rememberMe ? 'border-sky-500 bg-sky-500/20' : 'border-slate-700 bg-transparent hover:border-slate-600'}`}
                      >
                        {rememberMe && <div className="w-2.5 h-2.5 bg-sky-500 rounded shadow-[0_0_8px_#0ea5e9]" />}
                      </div>
                      <span 
                        className="text-[10px] text-slate-400 font-black tracking-widest cursor-pointer select-none hover:text-sky-400 transition-colors uppercase"
                        onClick={() => setRememberMe(!rememberMe)}
                      >
                        Zapamiętaj hasło
                      </span>
                    </div>
                  </>
                )}
                
                <button disabled={loading} type="submit" className="w-full bg-gradient-to-r from-sky-500 to-blue-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-sky-500/20 mt-3 active:scale-[0.97] transition-all flex items-center justify-center gap-3 text-[11px] tracking-[0.2em] uppercase relative z-10 hover:shadow-sky-500/30">
                  {loading ? <Loader2 className="animate-spin size-4" /> : <>{isRegistering ? 'Utwórz konto' : 'Zaloguj się'} <ArrowRight size={16} /></>}
                </button>
              </form>

              <div className="relative my-8 text-center">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800/50"></div></div>
                <span className="relative bg-[#131b2e] px-4 text-[9px] text-slate-600 font-black uppercase tracking-[0.3em]">Lub kontynuuj przez</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button type="button" className="flex items-center justify-center gap-3 py-3 border border-slate-800 rounded-2xl hover:bg-white/[0.03] hover:border-slate-600 transition-all text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                  Google
                </button>
                <button type="button" className="flex items-center justify-center gap-3 py-3 border border-slate-800 rounded-2xl hover:bg-white/[0.03] hover:border-slate-600 transition-all text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <span className="text-blue-500 text-sm font-black">f</span> Facebook
                </button>
              </div>

              <div className="mt-8 text-center pt-6 border-t border-slate-800/50 relative z-10">
                <button type="button" onClick={() => { setIsRegistering(!isRegistering); setErrors({}); setAuthError(''); }} 
                        className="group text-slate-500 hover:text-sky-400 text-[10px] font-black uppercase tracking-[0.25em] transition-all relative z-10">
                  {isRegistering ? (
                    <span>Posiadasz konto? <span className="text-sky-500 group-hover:underline">Zaloguj się</span></span>
                  ) : (
                    <span>Nie masz konta? <span className="text-sky-500 group-hover:underline">Zarejestruj się</span></span>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');
        @keyframes shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-6px)} 40%{transform:translateX(6px)} 60%{transform:translateX(-6px)} 80%{transform:translateX(6px)} }
        .animate-shake { animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both; }
        .autofill-custom:-webkit-autofill { -webkit-text-fill-color: #f8fafc !important; -webkit-box-shadow: 0 0 0px 1000px #0f172a inset !important; transition: background-color 5000s ease-in-out 0s; }
      `}} />
    </div>
  );
}