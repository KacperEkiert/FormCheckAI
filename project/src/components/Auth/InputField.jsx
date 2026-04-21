import React from 'react';
import { Eye, EyeOff } from 'lucide-react';

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

export default InputField;
