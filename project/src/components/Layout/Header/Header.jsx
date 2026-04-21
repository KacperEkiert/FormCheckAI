import React from 'react';
import { Medal } from 'lucide-react';

const Header = ({ currentView, setShowAchievements }) => {
  const getViewTitle = () => {
    switch (currentView) {
      case 'list': return 'Eksploruj Bibliotekę';
      case 'profile': return 'Twój Profil';
      default: return 'Twoja Sesja AI';
    }
  };

  return (
    <header className="flex justify-between items-center mb-6 gap-4">
      <div className="flex items-center gap-4">
        <p className="text-xl md:text-2xl font-black uppercase italic tracking-tight text-white">
          {getViewTitle()}
        </p>
      </div>
      
      {currentView !== 'profile' && (
        <button 
          onClick={() => setShowAchievements(true)}
          className="p-2 bg-slate-900 border border-slate-800 rounded-xl hover:border-amber-500 transition-all group shadow-lg"
        >
          <Medal size={22} className="text-amber-500 group-hover:scale-110 transition-transform" />
        </button>
      )}
    </header>
  );
};

export default Header;
