
import React from 'react';
import { Cpu, Zap, Loader2, Search, CheckCircle2, Activity, Brain, Target, Compass, UserCheck, ArrowUpRight, ShieldCheck } from 'lucide-react';
import { AgentTask, AgentState } from '../types';

interface AgentTerminalProps {
  state: AgentState;
  tasks: AgentTask[];
  onToggleAutonomous: () => void;
}

const AgentTerminal: React.FC<AgentTerminalProps> = ({ state, tasks, onToggleAutonomous }) => {
  return (
    <div className="max-w-5xl mx-auto space-y-12 view-enter shutter-open pb-32 pt-12">
      <div className="bg-slate-900 rounded-[4rem] p-16 text-white shadow-4xl relative overflow-hidden group border border-white/5">
        <div className="absolute top-0 right-0 p-16 opacity-5 -mr-24 -mt-24 group-hover:scale-125 transition-transform duration-1000">
           <Brain size={450} />
        </div>
        
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-10">
            <div className="inline-flex items-center space-x-4 bg-white/10 px-8 py-3 rounded-2xl border border-white/10 backdrop-blur-xl">
               <Cpu className={`w-6 h-6 ${state.isAutonomous ? 'text-indigo-400 animate-spin' : 'text-slate-500'}`} />
               <span className="text-[11px] font-black uppercase tracking-heritage">Status: {state.isAutonomous ? 'Sentinel Active' : 'Manual'}</span>
            </div>
            
            <div className="space-y-4">
              <h2 className="text-7xl font-extrabold serif tracking-tighter leading-none">The <span className="text-indigo-400">Sentinel</span>.</h2>
              <p className="text-slate-400 text-xl font-medium leading-relaxed">
                Autonomous heritage mapping. The agent independently scouts global archives and cross-verifies nodes.
              </p>
            </div>

            <div className="flex items-center space-x-6">
              <button 
                onClick={onToggleAutonomous}
                className={`px-12 py-6 rounded-[2.5rem] font-bold shadow-2xl transition-all hover:scale-105 active:scale-95 flex items-center space-x-4 ${state.isAutonomous ? 'bg-rose-600' : 'bg-indigo-600'}`}
              >
                <Zap className="w-6 h-6 fill-white" />
                <span>{state.isAutonomous ? 'Stop Sentinel' : 'Start Sentinel'}</span>
              </button>
            </div>
          </div>

          <div className="bg-black/40 backdrop-blur-3xl rounded-[3rem] p-10 border border-white/10 h-[400px] flex flex-col font-mono relative overflow-hidden shadow-inner">
             <div className="mt-8 flex-grow overflow-y-auto space-y-4 custom-scrollbar pr-4">
                {state.thoughtStream.map((thought, i) => (
                  <div key={i} className="flex space-x-4 animate-in slide-in-from-left-4 duration-500">
                     <span className="text-indigo-500 opacity-60">[{i}]</span>
                     <p className="text-slate-300 text-sm">{thought}</p>
                  </div>
                ))}
                {state.isAutonomous && (
                   <div className="flex items-center space-x-4 text-indigo-400 animate-pulse">
                      <span className="font-black">_</span>
                      <p className="text-sm font-black uppercase tracking-widest">Processing Inferences...</p>
                   </div>
                )}
             </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-8">
           <div className="flex items-center justify-between border-b border-slate-200 pb-6">
              <div className="flex items-center space-x-4">
                 <Target className="text-indigo-600 w-6 h-6" />
                 <h3 className="text-3xl font-bold text-slate-900 serif">Discovery Queue</h3>
              </div>
           </div>

           <div className="space-y-6">
              {tasks.length === 0 ? (
                 <div className="py-32 text-center space-y-6 bg-white border border-slate-100 rounded-[4rem] shadow-xl">
                    <Compass className="w-20 h-20 text-slate-200 mx-auto" />
                    <p className="text-sm text-slate-400">Enable Sentinel mode to begin autonomous scouting.</p>
                 </div>
              ) : (
                tasks.map((task) => (
                  <div key={task.id} className="bg-white p-10 rounded-[4rem] border border-slate-100 shadow-xl hover:shadow-2xl transition-all group relative overflow-hidden">
                     <div className="space-y-8 relative z-10">
                        <div className="flex items-center justify-between">
                           <div className="flex items-center space-x-4">
                              <div className={`p-4 rounded-2xl ${task.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'}`}>
                                 {task.status === 'completed' ? <CheckCircle2 className="w-6 h-6" /> : <Search className="w-6 h-6" />}
                              </div>
                              <div>
                                 <h4 className="text-2xl font-bold text-slate-900 serif tracking-tight">{task.goal}</h4>
                                 <p className="text-[10px] font-black uppercase tracking-heritage text-slate-400">{new Date(task.timestamp).toLocaleString()}</p>
                              </div>
                           </div>
                        </div>

                        <div className="space-y-4">
                           {task.logs.map((log, lIdx) => (
                             <div key={lIdx} className="flex items-start space-x-4 text-slate-500 text-sm italic">
                                <span className="text-indigo-400 mt-1.5">•</span>
                                <p>{log}</p>
                             </div>
                           ))}
                        </div>

                        {task.findings && task.findings.length > 0 && (
                           <div className="pt-8 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4">
                              {task.findings.map((f, fIdx) => (
                                 <div key={fIdx} className="bg-slate-50 p-6 rounded-3xl border border-slate-200/50 flex items-center space-x-5 group/finding hover:bg-white transition-colors">
                                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center overflow-hidden border border-slate-100">
                                       {f.imageUrl ? <img src={f.imageUrl} className="w-full h-full object-cover" /> : <UserCheck className="w-8 h-8 text-indigo-200" />}
                                    </div>
                                    <div className="flex-grow">
                                       <p className="font-bold text-slate-900 serif">{f.name}</p>
                                       <p className="text-[10px] font-black uppercase tracking-heritage text-indigo-500">{Math.round(f.confidence * 100)}% Match</p>
                                    </div>
                                 </div>
                              ))}
                           </div>
                        )}
                     </div>
                  </div>
                ))
              )}
           </div>
        </div>

        <div className="space-y-12">
           <div className="bg-indigo-600 rounded-[3.5rem] p-12 text-white shadow-2xl space-y-10 relative overflow-hidden">
              <div className="absolute top-0 left-0 p-10 opacity-10">
                 <ShieldCheck size={180} />
              </div>
              <h4 className="text-3xl font-bold serif leading-tight">Privacy Guard</h4>
              <p className="text-indigo-100 leading-relaxed font-medium">Your agent runs strictly within the vault's ZK-architecture. Public scanning uses anonymized metadata.</p>
           </div>
        </div>
      </div>
    </div>
  );
};

const PlayIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M8 5v14l11-7z" />
  </svg>
);

export default AgentTerminal;
