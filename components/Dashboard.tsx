
import React, { useEffect, useState } from 'react';
import { Sparkles, MapPin, Plus, ChevronRight, BookOpen, Clock, Globe, Fingerprint, History, Quote, ArrowUpRight, ShieldCheck, Database, Search, Radar, Network, Heart, Shield, Cpu } from 'lucide-react';
import { FamilyMember } from '../types';
import { generateFamilyStory } from '../services/gemini';

interface DashboardProps {
  members: FamilyMember[];
  onAddClick: () => void;
  onNavigateToMatches: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ members, onAddClick, onNavigateToMatches }) => {
  const [story, setStory] = useState<string>('');
  const [loadingStory, setLoadingStory] = useState(false);

  useEffect(() => {
    if (members.length > 0) {
      setLoadingStory(true);
      generateFamilyStory(members).then(res => {
        setStory(res);
        setLoadingStory(false);
      });
    }
  }, [members]);

  return (
    <div className="space-y-12 md:space-y-20 pb-24">
      {/* Dynamic Discovery Status Bar */}
      <div className="glass-panel rounded-3xl md:rounded-[2.5rem] p-2 flex items-center shadow-xl border border-white/60 animate-in slide-in-from-top-full duration-1000">
         <div className="bg-indigo-600 backdrop-blur px-4 md:px-8 py-3 md:py-4 rounded-2xl md:rounded-[2rem] flex items-center space-x-2 md:space-x-4 shadow-lg shrink-0">
            <Radar className="w-4 h-4 md:w-5 md:h-5 text-white animate-pulse" />
            <span className="text-[8px] md:text-[10px] font-black text-white uppercase tracking-heritage">Sentinel: Autonomous</span>
         </div>
         <div className="flex-grow flex items-center justify-center space-x-6 md:space-x-12 px-4 overflow-hidden">
            <div className="flex items-center space-x-2 md:space-x-3 text-slate-400 shrink-0">
               <Database className="w-3 h-3 md:w-4 md:h-4 opacity-40" />
               <span className="text-[8px] md:text-[9px] font-black uppercase tracking-heritage">Synced</span>
            </div>
            <div className="hidden sm:flex items-center space-x-2 md:space-x-3 text-slate-400 shrink-0">
               <History className="w-3 h-3 md:w-4 md:h-4 opacity-40" />
               <span className="text-[8px] md:text-[9px] font-black uppercase tracking-heritage">Inferring</span>
            </div>
         </div>
         <div className="hidden sm:block bg-indigo-50 px-6 py-4 rounded-[2rem] text-[9px] font-black text-indigo-600 uppercase tracking-heritage border border-indigo-100 shrink-0">
            Vault Gated
         </div>
      </div>

      {/* Hero Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-12 md:gap-16 pb-12">
        <div className="space-y-6 md:space-y-10 max-w-2xl animate-in slide-in-from-left-10 duration-1000">
          <div className="flex items-center space-x-3 text-indigo-600">
            <Network className="w-5 h-5 md:w-6 md:h-6" />
            <span className="text-[9px] md:text-[11px] font-black uppercase tracking-heritage">Archival Node v4.1</span>
          </div>
          <h2 className="text-5xl md:text-7xl lg:text-8xl font-extrabold text-slate-900 serif tracking-tighter leading-tight md:leading-[0.85]">
            Map Your <br/><span className="gradient-text-hope italic">Destiny.</span>
          </h2>
          <p className="text-slate-500 text-lg md:text-2xl font-medium leading-relaxed pr-0 md:pr-8">
            The heritage ledger identifies <span className="text-indigo-600 font-black">{members.length} unique nodes.</span> Our agent is currently scouting for historical intersections.
          </p>
          <div className="flex flex-col sm:flex-row flex-wrap gap-4 md:gap-6 pt-4">
             <button 
                onClick={onAddClick}
                className="bg-indigo-600 text-white px-8 md:px-14 py-5 md:py-8 rounded-2xl md:rounded-[3rem] font-bold shadow-3xl transition-all hover:scale-105 active:scale-95 flex items-center justify-center space-x-4 group"
              >
                <Plus className="w-5 h-5 md:w-6 md:h-6 group-hover:rotate-90 transition-transform" />
                <span className="text-base md:text-lg uppercase tracking-widest font-black">Expand Ledger</span>
              </button>
              <div className="flex items-center justify-center px-8 md:px-10 py-5 md:py-6 glass-panel rounded-2xl md:rounded-[3rem] space-x-4 border border-white/50 group hover:shadow-xl transition-all">
                 <Heart className="text-rose-500 w-5 h-5 md:w-7 md:h-7 group-hover:scale-110 transition-transform" />
                 <span className="text-[8px] md:text-[10px] font-black uppercase tracking-heritage text-slate-500">Curating Legacy</span>
              </div>
          </div>
        </div>

        {/* Neural Discovery Card */}
        <div className="perspective-1000 group w-full lg:w-[480px] animate-in slide-in-from-right-10 duration-1000">
          <div className="glass-panel rounded-[3rem] md:rounded-[5rem] p-8 md:p-16 text-slate-900 shadow-4xl relative overflow-hidden h-[400px] md:h-[540px] flex flex-col border border-white/50 hover:shadow-5xl transition-all duration-700">
            <div className="absolute top-0 right-0 p-12 opacity-5 -mr-24 -mt-24 group-hover:scale-125 transition-transform duration-1000">
               <Globe size={480} className="text-indigo-600" />
            </div>
            <div className="relative z-10 flex flex-col h-full">
               <div className="bg-indigo-600 p-4 md:p-6 rounded-2xl md:rounded-[2.5rem] w-fit shadow-2xl">
                  <Fingerprint className="w-8 h-8 md:w-12 md:h-12 text-white" />
               </div>
               <div className="mt-auto space-y-6 md:space-y-12">
                  <div className="space-y-2 md:space-y-4">
                    <p className="text-[9px] md:text-[11px] font-black uppercase tracking-heritage text-indigo-600">Archival Leads Identified</p>
                    <div className="text-6xl md:text-9xl font-black tracking-tighter serif leading-none text-slate-900">08<span className="text-indigo-600 text-3xl md:text-5xl ml-2 md:ml-4 tracking-normal font-bold animate-pulse">+</span></div>
                  </div>
                  <p className="text-slate-500 font-bold text-base md:text-xl leading-snug">Autonomous inferences currently pending verification.</p>
                  <button 
                    onClick={onNavigateToMatches}
                    className="w-full bg-slate-900 text-white hover:bg-slate-800 font-black py-5 md:py-8 rounded-[1.5rem] md:rounded-[2.5rem] transition-all flex items-center justify-center space-x-4 shadow-xl text-[8px] md:text-[10px] uppercase tracking-heritage active:scale-95"
                  >
                    <span>Audit Discoveries</span>
                    <ArrowUpRight className="w-5 h-5 md:w-6 md:h-6" />
                  </button>
               </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-16">
        <div className="lg:col-span-2 glass-panel rounded-[3rem] md:rounded-[5.5rem] p-10 md:p-24 border border-white/60 shadow-4xl overflow-hidden relative group animate-in slide-in-from-bottom-10 duration-1000 delay-200">
          <div className="absolute top-0 right-0 p-16 text-indigo-600/5 transition-transform group-hover:scale-110 duration-1000 -mr-40 -mt-40">
            <Quote size={640} strokeWidth={1} />
          </div>
          <div className="relative z-10 space-y-6 md:space-y-12">
            <div className="inline-flex items-center space-x-3 md:space-x-4 bg-indigo-50/80 backdrop-blur-sm px-6 md:px-8 py-3 md:py-4 rounded-2xl md:rounded-[2.5rem] border border-indigo-100">
              <Sparkles className="text-amber-500 w-5 h-5 md:w-7 md:h-7 animate-pulse" />
              <span className="text-[9px] md:text-[11px] font-black uppercase tracking-heritage text-indigo-600">Synthesized Legacy Story</span>
            </div>
            
            {loadingStory ? (
              <div className="space-y-4 md:space-y-8">
                <div className="h-10 md:h-16 w-full bg-slate-100/50 rounded-2xl md:rounded-[2.5rem] animate-pulse"></div>
                <div className="h-10 md:h-16 w-3/4 bg-slate-100/50 rounded-2xl md:rounded-[2.5rem] animate-pulse"></div>
              </div>
            ) : (
              <p className="text-2xl md:text-4xl lg:text-6xl text-slate-900 leading-snug md:leading-[1.2] font-medium serif italic pr-0 md:pr-32 tracking-tight animate-in fade-in duration-1000">
                "{story || 'Initiate the ledger by adding a node to reveal the synthesized family legacy.'}"
              </p>
            )}
            
            <div className="pt-4 md:pt-8">
              <button className="text-indigo-600 font-bold text-xs md:text-sm flex items-center space-x-4 md:space-x-6 group/btn active:scale-95 transition-all">
                <span className="pb-1 md:pb-2 border-b-2 border-transparent group-hover:border-indigo-600 uppercase tracking-heritage text-[10px] md:text-xs font-black">Generate Historical Analysis</span>
                <ChevronRight className="w-5 h-5 md:w-6 md:h-6 group-hover:translate-x-3 transition-transform duration-300" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-8 md:gap-10">
            <div className="bg-indigo-600 rounded-[3rem] md:rounded-[5.5rem] p-10 md:p-16 text-white shadow-3xl flex flex-col items-center justify-center text-center space-y-6 md:space-y-10 group overflow-hidden relative animate-in slide-in-from-bottom-10 duration-1000 delay-400 hover:scale-[1.02] transition-all duration-700">
               <div className="absolute inset-0 bg-white opacity-5 group-hover:scale-110 transition-transform duration-1000"></div>
               <div className="relative">
                 <div className="w-24 h-24 md:w-32 md:h-32 glass-panel backdrop-blur-3xl rounded-full flex items-center justify-center border border-white/30 transition-all duration-1000 group-hover:rotate-[-12deg] group-hover:scale-110">
                    <BookOpen className="w-10 h-10 md:w-12 md:h-12 text-white" />
                 </div>
               </div>
               <div className="space-y-3 md:space-y-4 relative">
                  <h4 className="text-2xl md:text-3xl font-bold serif leading-tight">Migration Logs</h4>
                  <p className="text-indigo-50 text-sm md:text-base leading-relaxed px-4 opacity-80 font-medium">Tracing spatial intersections of ancestors through time.</p>
               </div>
               <button className="relative text-[8px] md:text-[10px] font-black uppercase tracking-heritage text-white bg-white/10 hover:bg-white/20 px-8 md:px-10 py-4 md:py-5 rounded-2xl md:rounded-[2rem] border border-white/20 transition-all active:scale-95 backdrop-blur-md">Visualize Timeline</button>
            </div>

            <div className="glass-panel rounded-[2.5rem] md:rounded-[3.5rem] p-8 md:p-12 border border-white/50 shadow-2xl space-y-6 md:space-y-8 animate-in slide-in-from-bottom-10 duration-1000 delay-600">
                <div className="flex items-center space-x-4">
                    <div className="bg-slate-900 p-2 md:p-3 rounded-xl md:rounded-2xl shadow-lg">
                        <Shield className="text-white w-4 h-4 md:w-5 md:h-5" />
                    </div>
                    <h4 className="text-lg md:text-xl font-bold text-slate-900 serif">Vault Audit</h4>
                </div>
                <div className="space-y-3 md:space-y-4">
                    <div className="flex items-center justify-between">
                        <span className="text-[8px] md:text-[10px] font-black uppercase tracking-heritage text-slate-400">Integrity Status</span>
                        <span className="text-[8px] md:text-[10px] font-black uppercase tracking-heritage text-emerald-600">Locked & Patched</span>
                    </div>
                    <div className="h-1 md:h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 w-[92%]"></div>
                    </div>
                    <div className="flex items-center space-x-2 text-[8px] md:text-[10px] font-medium text-slate-500">
                        <Cpu className="w-3 md:w-3.5 h-3 md:h-3.5" />
                        <span>Ready for 2,000+ Node Scaling</span>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
