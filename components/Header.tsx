
import React, { useState } from 'react';
import { LayoutDashboard, Network, FolderSearch, UserCircle, Library, Fingerprint, Cpu, HelpCircle, Globe, Menu, X } from 'lucide-react';
import { ViewType, UserProfile } from '../types';

interface HeaderProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  userProfile: UserProfile;
  onOpenGuide: () => void;
}

const Header: React.FC<HeaderProps> = ({ currentView, onViewChange, userProfile, onOpenGuide }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'tree', label: 'Map', icon: Network },
    { id: 'agent', label: 'Sentinel', icon: Cpu, spin: true },
    { id: 'memories', label: 'Archives', icon: Library },
    { id: 'matches', label: 'Leads', icon: FolderSearch },
  ];

  const handleNavClick = (view: ViewType) => {
    onViewChange(view);
    setIsMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-[150] glass-dark border-b border-white/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20 md:h-24">
          <div 
            className="flex items-center space-x-3 md:space-x-4 cursor-pointer group" 
            onClick={() => handleNavClick('dashboard')}
            aria-label="Go to Dashboard"
          >
            <div className="bg-indigo-600 p-2 md:p-3 rounded-xl md:rounded-2xl group-hover:rotate-12 transition-transform shadow-2xl shadow-indigo-600/30">
               <Fingerprint className="text-white w-5 h-5 md:w-7 md:h-7" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl md:text-2xl font-bold text-slate-900 serif tracking-tight">FamilyConnect</h1>
              <span className="text-[8px] md:text-[10px] font-black text-indigo-500 uppercase tracking-heritage -mt-1">Guardian Hub</span>
            </div>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center space-x-1 glass-light p-1.5 rounded-[2rem] border border-white/40">
            {navItems.map((item) => (
              <button 
                key={item.id}
                onClick={() => handleNavClick(item.id as ViewType)}
                className={`flex items-center space-x-3 px-5 py-2.5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${currentView === item.id ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-500 hover:text-slate-900'}`}
              >
                <item.icon className={`w-4 h-4 ${item.spin && currentView === item.id ? 'animate-spin-slow' : ''}`} />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="flex items-center space-x-1 md:space-x-2">
            <button 
              onClick={onOpenGuide}
              className="p-2 md:p-3 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all"
              title="Help & Guide"
            >
              <HelpCircle className="w-5 h-5 md:w-6 md:h-6" />
            </button>

            <button 
              className="hidden sm:block p-2 md:p-3 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all"
              title="Change Language"
            >
              <Globe className="w-5 h-5 md:w-6 md:h-6" />
            </button>

            <button 
              onClick={() => handleNavClick('profile')}
              className="flex items-center space-x-2 md:space-x-4 p-1.5 md:p-2 pr-3 md:pr-4 glass-light border border-white/50 rounded-[1.25rem] md:rounded-[1.5rem] hover:bg-white transition-all group"
            >
              <div className="bg-indigo-600 p-1.5 md:p-2 rounded-lg md:rounded-xl">
                <UserCircle className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
              <span className="hidden sm:block text-[10px] md:text-xs font-bold text-slate-900 uppercase truncate max-w-[100px]">
                {userProfile.username || 'Guardian'}
              </span>
            </button>

            {/* Mobile Menu Toggle */}
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden p-2 text-slate-900 hover:bg-slate-100 rounded-xl transition-all"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-[200] bg-white animate-in slide-in-from-top duration-300">
          <div className="flex flex-col h-full">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <Fingerprint className="text-indigo-600 w-6 h-6" />
                <span className="font-bold text-xl serif">Menu</span>
              </div>
              <button onClick={() => setIsMenuOpen(false)} className="p-2 bg-slate-100 rounded-xl">
                <X size={24} />
              </button>
            </div>
            <div className="flex-grow p-6 space-y-4">
              {navItems.map((item) => (
                <button 
                  key={item.id}
                  onClick={() => handleNavClick(item.id as ViewType)}
                  className={`w-full flex items-center space-x-5 p-5 rounded-3xl transition-all ${currentView === item.id ? 'bg-indigo-600 text-white shadow-xl' : 'bg-slate-50 text-slate-600 hover:bg-indigo-50'}`}
                >
                  <item.icon className={item.spin && currentView === item.id ? 'animate-spin-slow' : ''} />
                  <span className="text-sm font-black uppercase tracking-widest">{item.label}</span>
                </button>
              ))}
            </div>
            <div className="p-6 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
                  <UserCircle size={20} />
                </div>
                <span className="font-bold text-slate-900 uppercase text-xs">{userProfile.username}</span>
              </div>
              <button onClick={() => handleNavClick('profile')} className="text-indigo-600 font-bold text-xs uppercase tracking-widest">Settings</button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
