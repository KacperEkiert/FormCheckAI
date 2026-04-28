import React from 'react';
import { Medal } from 'lucide-react';

const Header = ({ currentView, setShowAchievements }) => {
  const getViewTitle = () => {
    switch (currentView) {
      case 'list': return 'Eksploruj Bibliotekę';
      case 'profile': return 'Twój Profil';
      case 'feedback': return 'Raport Treningowy';
      default: return 'Twoja Sesja AI';
    }
  };

  return (
    <header className="relative flex justify-between items-center mb-8 gap-4 min-h-[44px]">
      {/* Tytuł: 
        - Na mobile (domyślnie): absolutny środek kontenera
        - Od md: powrót do normalnego układu (static/left)
      */}
      <div className="flex-grow md:flex-grow-0 flex items-center justify-center md:justify-start w-full md:w-auto">
        <p className="text-xl md:text-2xl font-black uppercase italic tracking-tight text-white text-center md:text-left">
          {getViewTitle()}
        </p>
      </div>
      
      {/* Przycisk Osiągnięć:
        - Na mobile: pozycja absolutna po prawej, aby nie przesuwał wyśrodkowanego tekstu
        - Od md: powrót do normalnego flexa
      */}
      {currentView !== 'profile' && (
        <div className="absolute right-0 md:relative">
          <button 
            onClick={() => setShowAchievements(true)}
            className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl hover:border-amber-500 transition-all group shadow-lg"
          >
            <Medal size={20} className="text-amber-500 group-hover:scale-110 transition-transform md:w-[22px] md:h-[22px]" />
          </button>
        </div>
      )}
    </header>
  );
};

export default Header;