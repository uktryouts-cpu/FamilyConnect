
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  X, User, ShieldCheck, Key, Lock, Unlock, Fingerprint, Cpu, ArrowRight, UserPlus, Heart, Info, Search, Loader2, Sparkles, MapIcon, Globe 
} from 'lucide-react';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import FamilyTree from './components/FamilyTree';
import Matches from './components/Matches';
import MemoryStudio from './components/MemoryStudio';
import AddMemberModal from './components/AddMemberModal';
import AIAssistant from './components/AIAssistant';
import AgentTerminal from './components/AgentTerminal';
import UserGuide from './components/UserGuide';
import MigrationTimeline from './components/MigrationTimeline';
import GeographicDistribution from './components/GeographicDistribution';
import { FamilyMember, ViewType, UserProfile, MatchSuggestion, AgentState, AgentTask, DiscoveryReport } from './types';
import { loadFamilyData, saveFamilyData, loadUserProfile, saveUserProfile, hasVault } from './utils/storage';
import { performAutonomousReasoning, executeAgentDiscovery, synthesizeDiscoveryReport } from './services/gemini';

const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

interface Notification {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

type OnboardingStep = 'welcome' | 'profile' | 'heritage' | 'key';

const App: React.FC = () => {
  const [vaultKey, setVaultKey] = useState<string>('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile>(loadUserProfile());
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isOnboarding, setIsOnboarding] = useState(!hasVault());
  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep>('welcome');

  const agentThinkingRef = useRef(false);
  const [agentState, setAgentState] = useState<AgentState>({
    isAutonomous: false,
    currentTask: null,
    thoughtStream: ['Sentinel initialized.', 'Scouting for lineage intersections...'],
    lastScanTimestamp: 0
  });
  const [agentTasks, setAgentTasks] = useState<AgentTask[]>([]);

  const addNotification = useCallback((type: Notification['type'], message: string) => {
    const id = generateUUID();
    setNotifications(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 6000);
  }, []);

  // Fix for: Error in file App.tsx on line 309: Cannot find name 'handleViewChange'.
  // Fix for: Error in file App.tsx on line 321: Cannot find name 'handleViewChange'.
  // Implemented handleViewChange to toggle views with a transition state.
  const handleViewChange = useCallback((view: ViewType) => {
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentView(view);
      setIsTransitioning(false);
    }, 300);
  }, []);

  useEffect(() => {
    if (isUnlocked || isOnboarding) {
      saveUserProfile(userProfile);
    }
  }, [userProfile, isUnlocked, isOnboarding]);

  useEffect(() => {
    if (isUnlocked && vaultKey) {
      saveFamilyData(members, vaultKey);
    }
  }, [members, isUnlocked, vaultKey]);

  const triggerAgentAction = useCallback(async (isFullAudit = false) => {
    if (!isUnlocked || !agentState.isAutonomous || agentThinkingRef.current) return;
    
    agentThinkingRef.current = true;
    const logPrefix = isFullAudit ? "END-TO-END AUDIT: " : "PROACTIVE SCAN: ";
    
    setAgentState(prev => ({ 
      ...prev, 
      thoughtStream: [...prev.thoughtStream.slice(-12), `${logPrefix}Initiating neural ledger inspection...`] 
    }));

    try {
      const reasoning = await performAutonomousReasoning(members);
      if (reasoning && reasoning.task) {
        const newTask: AgentTask = {
          id: generateUUID(),
          goal: reasoning.task,
          status: 'working',
          logs: [
            `${logPrefix}Audit result: ${reasoning.reason}`,
            `Goal calibrated: ${reasoning.task}`, 
            "Navigating global archives..."
          ],
          timestamp: Date.now()
        };
        
        setAgentTasks(prev => [newTask, ...prev.slice(0, 19)]);
        setAgentState(prev => ({ 
          ...prev, 
          thoughtStream: [...prev.thoughtStream.slice(-12), `Executing discovery for: ${reasoning.task}`] 
        }));

        const findings = await executeAgentDiscovery(reasoning.task, members);
        
        let report: DiscoveryReport | undefined;
        if (findings.length > 0) {
          setAgentState(prev => ({ ...prev, thoughtStream: [...prev.thoughtStream, "Synthesizing detailed discovery report..."] }));
          report = await synthesizeDiscoveryReport(reasoning.task, findings);
        }

        setAgentTasks(prev => prev.map(t => t.id === newTask.id ? { 
          ...t, 
          status: 'completed', 
          findings, 
          report,
          logs: [...t.logs, `Discovery finalized. Synthesized ${findings.length} high-confidence leads.`] 
        } : t));
        
        if (findings.length > 0) {
          addNotification('info', `The Sentinel has synthesized ${findings.length} new heritage leads.`);
        }
        
        setAgentState(prev => ({ 
          ...prev, 
          thoughtStream: [...prev.thoughtStream.slice(-12), `Task completed.`] 
        }));
      }
    } catch (e) {
      console.error("Agent Logic Failure:", e);
    } finally {
      agentThinkingRef.current = false;
    }
  }, [isUnlocked, agentState.isAutonomous, members, addNotification]);

  useEffect(() => {
    if (!isUnlocked || !agentState.isAutonomous) return;
    const timer = setInterval(() => triggerAgentAction(), 75000);
    return () => clearInterval(timer);
  }, [isUnlocked, agentState.isAutonomous, triggerAgentAction]);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vaultKey) return;
    const data = loadFamilyData(vaultKey);
    if (data) {
      setMembers(data);
      setIsUnlocked(true);
      addNotification('success', 'Legacy Vault successfully decrypted.');
      setAgentState(p => ({ ...p, isAutonomous: true }));
    } else {
      addNotification('error', 'Master Security Key validation failed.');
    }
  };

  const handleAddMember = (memberData: Omit<FamilyMember, 'id' | 'childrenIds'>) => {
    const newMember: FamilyMember = {
      ...memberData,
      id: generateUUID(),
      childrenIds: []
    };
    setMembers(prev => [...prev, newMember]);
    addNotification('success', `${memberData.name} has been integrated into the lineage ledger.`);
  };

  const handleConnectFromSearch = (match: MatchSuggestion) => {
    const newMember: FamilyMember = {
      id: match.id || generateUUID(),
      name: match.name,
      relation: 'Potential Match',
      birthDate: '',
      location: match.potentialLocation || '',
      contactInfo: '',
      notes: match.reason,
      childrenIds: [],
      imageUrl: match.imageUrl,
      privacyLevel: 'Private',
      verificationScore: match.confidence
    };
    setMembers(prev => [...prev, newMember]);
    addNotification('success', `${match.name} integrated via discovery protocols.`);
  };

  const handleCompleteOnboarding = () => {
    if (!vaultKey) return;
    const initialData: FamilyMember[] = [{
      id: 'root-node-0',
      name: userProfile.username || 'Guardian',
      relation: 'Myself',
      birthDate: '',
      location: userProfile.location || 'Unknown',
      contactInfo: '',
      notes: `FamilyConnect Founder node.`,
      childrenIds: [],
      occupations: [],
      lifeEvents: [],
      privacyLevel: 'Private'
    }];
    setMembers(initialData);
    saveFamilyData(initialData, vaultKey);
    saveUserProfile(userProfile);
    setIsUnlocked(true);
    setIsOnboarding(false);
    setAgentState(p => ({ ...p, isAutonomous: true }));
    addNotification('success', 'Ledger Node initialized.');
  };

  if (isOnboarding) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 md:p-6 bg-transparent">
        <div className="max-w-xl w-full">
          {onboardingStep === 'welcome' && (
            <div className="glass-panel p-8 md:p-12 lg:p-20 rounded-3xl md:rounded-[5rem] text-center space-y-8 md:space-y-12 animate-in fade-in zoom-in duration-1000 shadow-5xl border border-white/50 relative overflow-hidden">
               <div className="absolute top-0 right-0 p-8 md:p-12 opacity-5 -mr-8 md:-mr-16 -mt-8 md:-mt-16"><Heart size={200} className="md:w-[240px] md:h-[240px]" /></div>
               <div className="w-20 h-20 md:w-24 md:h-24 bg-indigo-600 rounded-2xl md:rounded-[2.5rem] flex items-center justify-center mx-auto shadow-3xl relative z-10"><Heart className="text-white w-10 h-10 md:w-12 md:h-12" /></div>
               <div className="space-y-3 md:space-y-4 relative z-10">
                 <h1 className="text-4xl md:text-5xl lg:text-7xl font-extrabold text-slate-900 serif tracking-tighter leading-tight">Heritage <br/><span className="gradient-text-hope italic">Redefined.</span></h1>
                 <p className="text-slate-500 text-base md:text-lg lg:text-xl leading-relaxed font-medium px-2">Secure, autonomous heritage mapping.</p>
               </div>
               <div className="flex flex-col space-y-3 md:space-y-4 relative z-10">
                  <button onClick={() => setOnboardingStep('profile')} className="w-full bg-indigo-600 text-white font-black py-4 md:py-7 rounded-xl md:rounded-[2.5rem] flex items-center justify-center space-x-2 md:space-x-4 hover:scale-[1.02] active:scale-95 transition-all shadow-3xl uppercase tracking-widest text-xs md:text-sm">
                    <UserPlus className="w-5 h-5 md:w-6 md:h-6" /> <span>Initialize Node</span>
                  </button>
                  <button onClick={() => setIsGuideOpen(true)} className="w-full bg-white/50 border border-slate-200 text-slate-500 font-black py-4 md:py-7 rounded-xl md:rounded-[2.5rem] flex items-center justify-center space-x-2 md:space-x-4 hover:bg-white transition-all backdrop-blur-md uppercase tracking-widest text-xs md:text-sm">
                    <Info className="w-5 h-5 md:w-6 md:h-6" /> <span>Capabilities Guide</span>
                  </button>
               </div>
            </div>
          )}

          {onboardingStep !== 'welcome' && (
            <div className="glass-panel p-8 md:p-12 lg:p-16 rounded-3xl md:rounded-[4.5rem] space-y-8 md:space-y-12 animate-in slide-in-from-right-12 duration-700 shadow-5xl border border-white/50">
              {onboardingStep === 'profile' && (
                <>
                  <div className="flex items-center space-x-4 md:space-x-5 pb-6 md:pb-10 border-b border-slate-100">
                      <div className="bg-indigo-600 p-2 md:p-3 rounded-lg md:rounded-2xl shadow-lg"><User className="text-white w-5 h-5 md:w-6 md:h-6" /></div>
                      <h2 className="text-2xl md:text-3xl font-bold text-slate-900 serif">Identity Profile</h2>
                  </div>
                  <div className="space-y-6 md:space-y-8">
                      <div className="grid grid-cols-1 gap-4 md:gap-8">
                        <div className="space-y-2 md:space-y-3">
                          <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-heritage ml-3 md:ml-4">Full Legal Name</label>
                          <input type="text" className="w-full px-4 md:px-8 py-3 md:py-6 bg-white border border-indigo-100 rounded-xl md:rounded-[2rem] text-slate-900 outline-none focus:ring-8 focus:ring-indigo-500/5 transition-all font-bold text-base md:text-lg shadow-inner" value={userProfile.username} onChange={e => setUserProfile(p => ({ ...p, username: e.target.value }))} />
                        </div>
                        <div className="space-y-2 md:space-y-3">
                          <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-heritage ml-3 md:ml-4">Current Location</label>
                          <input type="text" className="w-full px-4 md:px-8 py-3 md:py-6 bg-white border border-indigo-100 rounded-xl md:rounded-[2rem] text-slate-900 outline-none focus:ring-8 focus:ring-indigo-500/5 transition-all font-bold text-base md:text-lg shadow-inner" value={userProfile.location} onChange={e => setUserProfile(p => ({ ...p, location: e.target.value }))} />
                        </div>
                      </div>
                  </div>
                  <button onClick={() => setOnboardingStep('key')} disabled={!userProfile.username || !userProfile.location} className="w-full bg-indigo-600 text-white font-black py-4 md:py-7 rounded-xl md:rounded-[2.5rem] flex items-center justify-center space-x-2 md:space-x-4 hover:scale-[1.02] active:scale-95 disabled:opacity-50 transition-all shadow-3xl uppercase tracking-widest text-xs md:text-sm">
                    <span>Next: Set Master Key</span> <ArrowRight className="w-4 h-4 md:w-5 md:h-5" />
                  </button>
                </>
              )}

              {onboardingStep === 'key' && (
                <>
                  <div className="flex items-center space-x-4 md:space-x-5 pb-6 md:pb-10 border-b border-slate-100">
                      <div className="bg-emerald-600 p-2 md:p-3 rounded-lg md:rounded-2xl shadow-lg"><Lock className="text-white w-5 h-5 md:w-6 md:h-6" /></div>
                      <h2 className="text-2xl md:text-3xl font-bold text-slate-900 serif">Vault Master Key</h2>
                  </div>
                  <input type="password" placeholder="ENTER SECURE MASTER KEY" className="w-full px-4 md:px-8 py-6 md:py-10 bg-white border border-indigo-100 rounded-xl md:rounded-[2.5rem] text-slate-900 outline-none focus:ring-8 focus:ring-emerald-500/10 transition-all font-black text-lg md:text-2xl tracking-[0.3em] md:tracking-[0.5em] text-center shadow-2xl" value={vaultKey} onChange={e => setVaultKey(e.target.value)} />
                  <button onClick={handleCompleteOnboarding} disabled={vaultKey.length < 4} className="w-full bg-emerald-600 text-white font-black py-5 md:py-8 rounded-xl md:rounded-[3rem] flex items-center justify-center space-x-2 md:space-x-4 hover:scale-[1.02] active:scale-95 disabled:opacity-50 transition-all shadow-4xl uppercase tracking-widest text-xs md:text-sm">
                    <ShieldCheck className="w-5 h-5 md:w-6 md:h-6" /> <span>Activate Heritage Ledger</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!isUnlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 md:p-6 bg-transparent">
        <div className="max-w-md w-full space-y-8 md:space-y-16 text-center animate-in fade-in zoom-in duration-1000">
          <div className="space-y-6 md:space-y-8">
             <div className="w-24 h-24 md:w-32 md:h-32 bg-indigo-600 rounded-2xl md:rounded-[3rem] flex items-center justify-center mx-auto shadow-4xl"><Lock className="text-white w-12 h-12 md:w-14 md:h-14" /></div>
             <div className="space-y-2 md:space-y-3">
               <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 serif tracking-tighter">FamilyConnect</h1>
               <p className="text-indigo-600 text-[10px] md:text-[11px] font-black uppercase tracking-heritage">Vault Authentication Protocol</p>
             </div>
          </div>
          <form onSubmit={handleUnlock} className="glass-panel p-8 md:p-12 rounded-3xl md:rounded-[5rem] space-y-6 md:space-y-10 border border-white/50 shadow-5xl">
            <input autoFocus type="password" placeholder="MASTER KEY" className="w-full px-4 md:px-8 py-5 md:py-8 bg-white border border-indigo-100 rounded-xl md:rounded-[2.5rem] text-slate-900 outline-none focus:ring-8 focus:ring-indigo-500/5 transition-all font-black text-base md:text-xl text-center tracking-[0.3em] md:tracking-[0.4em] shadow-inner" value={vaultKey} onChange={(e) => setVaultKey(e.target.value)} />
            <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 md:py-7 rounded-xl md:rounded-[2.5rem] transition-all shadow-3xl flex items-center justify-center space-x-2 md:space-x-4 active:scale-95 group uppercase tracking-widest text-xs md:text-sm">
              <Unlock className="w-4 h-4 md:w-5 md:h-5 group-hover:-translate-y-1 transition-transform" />
              <span>Unlock Archive</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-transparent overflow-x-hidden">
      <Header currentView={currentView} onViewChange={handleViewChange} userProfile={userProfile} onOpenGuide={() => setIsGuideOpen(true)} />
      {isGuideOpen && <UserGuide onClose={() => setIsGuideOpen(false)} />}
      <div className="fixed bottom-6 right-4 md:top-24 md:right-8 z-[200] space-y-2 md:space-y-4 pointer-events-none max-w-[calc(100vw-2rem)] md:max-w-none">
        {notifications.map(n => (
          <div key={n.id} className="pointer-events-auto flex items-center p-4 md:p-8 rounded-2xl md:rounded-[3rem] shadow-5xl border backdrop-blur-3xl animate-in slide-in-from-right-12 duration-700 md:w-96 bg-white/95">
            <div className={`w-2 h-2 rounded-full mr-3 md:mr-5 shrink-0 ${n.type === 'success' ? 'bg-emerald-500' : 'bg-indigo-500 animate-pulse'}`}></div>
            <p className="text-[9px] md:text-[11px] font-black uppercase tracking-heritage flex-grow pr-4 md:pr-6 leading-relaxed">{n.message}</p>
            <button onClick={() => setNotifications(p => p.filter(x => x.id !== n.id))} className="opacity-30 hover:opacity-100 transition-opacity shrink-0"><X className="w-4 h-4 md:w-5 md:h-5" /></button>
          </div>
        ))}
      </div>
      <main className={`flex-grow max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-8 md:py-16 lg:py-20 w-full view-transition ${isTransitioning ? 'opacity-0 translate-y-12 blur-xl scale-95' : 'opacity-100 translate-y-0 blur-0 scale-100'}`}>
        {currentView === 'dashboard' && <Dashboard members={members} onAddClick={() => setIsAddModalOpen(true)} onNavigateToMatches={() => handleViewChange('matches')} />}
        {currentView === 'tree' && <FamilyTree members={members} />}
        {currentView === 'matches' && <Matches members={members} onConnect={handleConnectFromSearch} />}
        {currentView === 'memories' && <MemoryStudio />}
        {currentView === 'agent' && <AgentTerminal state={agentState} tasks={agentTasks} onToggleAutonomous={() => setAgentState(p => ({ ...p, isAutonomous: !p.isAutonomous }))} />}
        {currentView === 'timeline' && <MigrationTimeline members={members} />}
        {currentView === 'distribution' && <GeographicDistribution members={members} />}
        {currentView === 'profile' && (
          <div className="max-w-3xl mx-auto glass-panel p-8 md:p-12 lg:p-20 rounded-3xl md:rounded-[5rem] animate-in fade-in slide-in-from-bottom-12 duration-1000 space-y-12 md:space-y-20 border border-white/50 shadow-5xl relative overflow-hidden">
             <div className="absolute top-0 right-0 p-8 md:p-20 opacity-5 -mr-12 md:-mr-24 -mt-12 md:-mt-24"><Fingerprint size={280} className="md:w-[320px] md:h-[320px]" /></div>
             <div className="flex flex-col md:flex-row md:items-center md:justify-between relative z-10 gap-6">
                <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold serif tracking-tight text-slate-900">Guardian</h2>
                <div className="bg-indigo-600 text-white px-6 md:px-10 py-2 md:py-3 rounded-full text-[9px] md:text-[11px] font-black uppercase tracking-heritage shadow-xl shadow-indigo-200">System Node</div>
             </div>
             <div className="space-y-12 md:space-y-16 relative z-10">
                <div className="flex flex-col md:flex-row md:items-center md:space-x-8 lg:space-x-14 pb-8 md:pb-16 border-b border-slate-100">
                  <div className="w-28 h-28 md:w-40 md:h-40 bg-indigo-600 rounded-2xl md:rounded-[3.5rem] flex items-center justify-center text-3xl md:text-5xl font-bold text-white shadow-3xl overflow-hidden border-4 md:border-8 border-white/50 shrink-0">
                    {userProfile.username ? userProfile.username[0] : 'G'}
                  </div>
                  <div className="space-y-2 md:space-y-4">
                    <h3 className="text-3xl md:text-4xl lg:text-5xl font-bold serif text-slate-900 tracking-tight">{userProfile.username || 'Guardian Initializing'}</h3>
                  </div>
                </div>
                <button onClick={() => { setVaultKey(''); setIsUnlocked(false); }} className="w-full bg-slate-900 text-white py-5 md:py-10 rounded-xl md:rounded-[3rem] text-xs md:text-xs font-black uppercase tracking-heritage hover:bg-slate-800 transition-all flex items-center justify-center space-x-3 md:space-x-5 shadow-3xl active:scale-95">
                  <Lock className="w-5 h-5 md:w-6 md:h-6" />
                  <span>Seal Archive</span>
                </button>
             </div>
          </div>
        )}
      </main>
      {isAddModalOpen && <AddMemberModal onClose={() => setIsAddModalOpen(false)} onAdd={handleAddMember} existingMembers={members} />}
      <AIAssistant />
    </div>
  );
};

export default App;
