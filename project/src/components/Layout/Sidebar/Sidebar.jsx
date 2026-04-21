import React from 'react';
import { 
  BrainCircuit, LayoutGrid, Activity as ActivityIcon, 
  History, User, LogOut, ChevronLeft 
} from 'lucide-react';
import { supabase } from '../../../supabaseClient';

const Sidebar = ({ 
  isSidebarOpen, 
  setIsSidebarOpen, 
  currentView, 
  setCurrentView, 
  workoutHistory, 
  avatarUrl, 
  onGoToLanding 
}) => {
  const navItems = [
    { view: 'list', icon: <LayoutGrid size={22} />, label: 'Biblioteka' },
    { view: 'model', icon: <ActivityIcon size={22} />, label: 'Trening' },
    { view: 'feedback', icon: <History size={22} />, label: 'Raport', disabled: workoutHistory.length === 0 },
    { view: 'profile', icon: avatarUrl ? <img src={avatarUrl} alt="avatar" className="w-6 h-6 rounded-full object-cover border border-sky-400" /> : <User size={22} />, label: 'Profil' }
  ];

  return (
    <>
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] md:hidden" 
          onClick={() => setIsSidebarOpen(false)} 
        />
      )}
      
      <aside className={`bg-slate-900 border-r border-slate-800 flex flex-col transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] z-[110] 
        ${isSidebarOpen ? 'w-80 translate-x-0' : 'w-24 -translate-x-full md:translate-x-0'} 
        fixed md:relative h-full shadow-2xl`}>
        
        <div className="p-6 flex items-center justify-between relative">
          <div className="flex items-center gap-3 min-w-0 cursor-pointer group/logo" onClick={onGoToLanding}>
            <div className="bg-sky-500 p-2.5 rounded-2xl shadow-[0_0_20px_rgba(14,165,233,0.4)] shrink-0 group-hover/logo:scale-110 transition-transform">
              <BrainCircuit className="h-6 w-6 text-slate-950" />
            </div>
            <h1 className={`text-xl font-black uppercase italic tracking-tighter transition-all duration-500 ${isSidebarOpen ? 'opacity-100 max-w-[200px] ml-1' : 'opacity-0 max-w-0 overflow-hidden'}`}>
              FormCheck<span className="text-sky-400">AI</span>
            </h1>
          </div>
          
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
            className={`group p-2.5 rounded-xl border border-slate-800 bg-slate-950/50 text-slate-400 transition-all duration-300 hover:border-sky-500/50 hover:text-sky-400 hover:shadow-[0_0_15px_rgba(14,165,233,0.2)] ${!isSidebarOpen ? 'md:flex hidden absolute -right-5 top-7 z-50 bg-slate-900 border-slate-700' : ''}`}
          >
            <ChevronLeft size={18} className={`transition-transform duration-500 ${!isSidebarOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        <nav className="flex-grow px-4 mt-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <button 
              key={item.view} 
              disabled={item.disabled} 
              onClick={() => { 
                setCurrentView(item.view); 
                if(window.innerWidth < 768) setIsSidebarOpen(false); 
              }} 
              className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all duration-300 group ${item.disabled ? 'opacity-20 cursor-not-allowed' : ''} ${currentView === item.view ? 'bg-sky-500 text-slate-950 shadow-[0_0_25px_rgba(14,165,233,0.3)]' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            >
              <div className={`shrink-0 transition-transform duration-300 ${currentView === item.view ? 'scale-110' : 'group-hover:scale-110'}`}>
                {item.icon}
              </div>
              <span className={`font-black text-xs uppercase tracking-[0.2em] transition-all duration-500 whitespace-nowrap ${isSidebarOpen ? 'opacity-100 max-w-[150px]' : 'opacity-0 max-w-0 overflow-hidden'}`}>
                {item.label}
              </span>
            </button>
          ))}
        </nav>

        <div className="p-4 mb-4">
          <button 
            onClick={() => supabase.auth.signOut()} 
            className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-red-500 hover:bg-red-500/10 transition-all duration-300 group"
          >
            <LogOut size={22} className="shrink-0 group-hover:translate-x-1 transition-transform" />
            <span className={`font-black text-xs uppercase tracking-widest transition-all duration-500 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 max-w-0 overflow-hidden'}`}>
              Wyloguj
            </span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
