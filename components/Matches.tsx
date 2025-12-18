
import React, { useEffect, useState } from 'react';
import { Search, Loader2, ExternalLink, ShieldCheck, Globe, UserCheck, Lock, ArrowUpRight, History, Camera, Fingerprint, Database, Network, Map as MapIcon, Share2, Mail, Link as LinkIcon, Plus, BellRing, Target, Info, Sparkles, MapPin, MessageSquare, Send, X, Check } from 'lucide-react';
import { FamilyMember, MatchSuggestion } from '../types';
import { getPotentialMatches, visualEvidenceSearch, deepResearchRelative } from '../services/gemini';

interface MatchesProps {
  members: FamilyMember[];
  onConnect?: (match: MatchSuggestion) => void;
}

const MESSAGE_TEMPLATES = [
  {
    id: 'heritage',
    label: 'Heritage Discovery',
    text: "Hello! Our family heritage ledger suggests a potential connection between our lineages. I've found some archival records that seem to overlap. Would you be open to verifying these links together?"
  },
  {
    id: 'research',
    label: 'Archival Research',
    text: "Greetings. I am researching the [Surname] lineage and the Sentinel agent identified your profile as a high-confidence intersection. I would love to share my findings and hear about your family's oral history."
  },
  {
    id: 'reconnect',
    label: 'Direct Reconnection',
    text: "Hi there. I believe we might be related through [Ancestor Name]. Our family tree has several spatial and temporal matches with your records. It would be wonderful to reconnect and bridge our family's story."
  }
];

const RadarIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" />
    <path d="M12 12m-5 0a5 5 0 1 0 10 0a5 5 0 1 0 -10 0" />
    <path d="M12 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
    <path d="M12 3v9" />
    <path d="M12 12l5 5" />
  </svg>
);

const Matches: React.FC<MatchesProps> = ({ members, onConnect }) => {
  const [internalMatches, setInternalMatches] = useState<MatchSuggestion[]>([]);
  const [visualLeads, setVisualLeads] = useState<MatchSuggestion[]>([]);
  const [deepLeads, setDeepLeads] = useState<MatchSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [researchingId, setResearchingId] = useState<string | null>(null);
  const [globalSearchTerm, setGlobalSearchTerm] = useState('');
  
  // Connection Request State
  const [selectedMatchForRequest, setSelectedMatchForRequest] = useState<MatchSuggestion | null>(null);
  const [activeTemplate, setActiveTemplate] = useState(MESSAGE_TEMPLATES[0]);
  const [customMessage, setCustomMessage] = useState(MESSAGE_TEMPLATES[0].text);
  const [isSendingRequest, setIsSendingRequest] = useState(false);
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchMatches = async () => {
      setLoading(true);
      const res = await getPotentialMatches(members);
      setInternalMatches(res);
      setLoading(false);
    };
    fetchMatches();
  }, [members]);

  const handleGlobalDiscovery = async () => {
    if (!globalSearchTerm.trim()) return;
    setSearching(true);
    try {
      const leads = await visualEvidenceSearch(globalSearchTerm);
      setVisualLeads(leads);
    } catch (e) {
      console.error(e);
    } finally {
      setSearching(false);
    }
  };

  const handleDeepResearch = async (member: FamilyMember) => {
    setResearchingId(member.id);
    try {
      const leads = await deepResearchRelative(member);
      setDeepLeads(prev => [...prev, ...leads]);
    } catch (e) {
      console.error(e);
    } finally {
      setResearchingId(null);
    }
  };

  const openRequestModal = (match: MatchSuggestion) => {
    setSelectedMatchForRequest(match);
    setCustomMessage(MESSAGE_TEMPLATES[0].text);
    setActiveTemplate(MESSAGE_TEMPLATES[0]);
  };

  const handleSendRequest = () => {
    if (!selectedMatchForRequest) return;
    setIsSendingRequest(true);
    
    // Simulate API delay
    setTimeout(() => {
      setSentRequests(prev => new Set(prev).add(selectedMatchForRequest.id));
      setIsSendingRequest(false);
      setSelectedMatchForRequest(null);
    }, 1500);
  };

  const renderConfidenceMeter = (score: number) => {
    const percentage = Math.round(score * 100);
    const colorClass = percentage > 85 ? 'text-emerald-500' : percentage > 60 ? 'text-indigo-500' : 'text-slate-400';
    const bgClass = percentage > 85 ? 'bg-emerald-500' : percentage > 60 ? 'bg-indigo-600' : 'bg-slate-300';
    
    return (
      <div className="flex flex-col items-end shrink-0">
        <div className={`text-[8px] md:text-[10px] font-black uppercase tracking-widest ${colorClass}`}>
          {percentage}% Confidence
        </div>
        <div className="w-16 md:w-20 h-1 bg-slate-100 rounded-full mt-1.5 overflow-hidden">
          <div 
            className={`h-full transition-all duration-1000 ${bgClass}`}
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-12 md:space-y-24 pb-40 view-enter px-4">
      {/* Cinematic Header */}
      <div className="text-center space-y-6 md:space-y-10 pt-8 md:pt-16">
        <div className="inline-flex items-center space-x-3 bg-white/60 backdrop-blur-xl px-6 md:px-8 py-2 md:py-3 rounded-full border border-white/50 shadow-xl animate-in fade-in slide-in-from-top-4 duration-1000">
           <Globe className="w-3 h-3 md:w-4 md:h-4 text-indigo-600 animate-spin-slow" />
           <span className="text-[9px] md:text-[11px] font-black uppercase tracking-heritage text-indigo-600">Archival Scouting Node</span>
        </div>
        
        <div className="space-y-4 md:space-y-6">
          <h2 className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-slate-900 serif tracking-tight leading-none animate-in fade-in duration-1000">Discovery <span className="gradient-text-hope italic">Leads.</span></h2>
          <p className="text-slate-500 max-w-2xl mx-auto text-lg md:text-2xl font-medium leading-relaxed opacity-0 animate-in fade-in fill-mode-forwards duration-1000 delay-300 px-4">
            Triangulating lineage signatures across global archival repositories and social footprints.
          </p>
        </div>
        
        <div className="max-w-3xl mx-auto animate-in fade-in zoom-in duration-700 delay-500">
          <div className="glass-panel rounded-3xl md:rounded-[3.5rem] p-2 md:p-4 shadow-4xl border border-white/50 flex flex-col md:flex-row gap-2 md:gap-4 items-stretch group focus-within:shadow-indigo-500/10 focus-within:ring-8 focus-within:ring-indigo-500/5 transition-all">
            <div className="flex-grow flex items-center pl-4 md:pl-8 py-2">
              <Search className="h-5 w-5 md:h-6 md:w-6 text-indigo-300 group-focus-within:text-indigo-600 transition-colors" />
              <input 
                type="text" 
                value={globalSearchTerm}
                onChange={(e) => setGlobalSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleGlobalDiscovery()}
                placeholder="Search archives by name..." 
                className="block w-full px-4 md:px-6 py-3 md:py-6 bg-transparent outline-none text-slate-800 font-bold placeholder:text-slate-300 text-base md:text-xl"
              />
            </div>
            <button 
              onClick={handleGlobalDiscovery}
              disabled={searching || !globalSearchTerm}
              className="bg-indigo-600 text-white px-8 md:px-14 py-4 md:py-6 rounded-2xl md:rounded-[2.5rem] font-black uppercase tracking-widest text-xs md:text-sm shadow-3xl transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 flex items-center justify-center space-x-3 md:space-x-4"
            >
              {searching ? <Loader2 className="w-5 h-5 md:w-6 md:h-6 animate-spin" /> : <RadarIcon className="w-5 h-5 md:w-6 md:h-6" />}
              <span>Initiate Scan</span>
            </button>
          </div>
        </div>
      </div>

      {/* Structured Discovery Grids */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-16">
        
        {/* Left Column: Lineage Audits */}
        <div className="lg:col-span-8 space-y-8 md:space-y-12">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-6 md:pb-8 gap-4">
             <div className="flex items-center space-x-4 md:space-x-5">
                <div className="bg-indigo-600 p-3 md:p-4 rounded-2xl md:rounded-3xl shadow-xl">
                  <Network className="text-white w-5 h-5 md:w-7 md:h-7" />
                </div>
                <div>
                  <h3 className="text-2xl md:text-4xl font-bold text-slate-900 serif">Neural Investigations</h3>
                  <p className="text-slate-400 text-[8px] md:text-[10px] font-black uppercase tracking-heritage mt-0.5 md:mt-1">AI Scouting for Node Verification</p>
                </div>
             </div>
             <div className="flex -space-x-2 md:-space-x-3 ml-2 sm:ml-0">
               {members.slice(0, 5).map((m, i) => (
                 <div key={i} className="w-8 h-8 md:w-10 md:h-10 rounded-full border-2 border-white bg-indigo-100 flex items-center justify-center overflow-hidden shadow-md">
                   {m.imageUrl ? <img src={m.imageUrl} className="w-full h-full object-cover" /> : <span className="text-[8px] md:text-[10px] font-black">{m.name[0]}</span>}
                 </div>
               ))}
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            {members.map((member, i) => (
              <div key={member.id} className="group animate-in fade-in slide-in-from-bottom-8 duration-700" style={{ animationDelay: `${i * 100}ms` }}>
                <div className="glass-panel p-6 md:p-10 rounded-3xl md:rounded-[4rem] border border-white/60 shadow-xl hover:shadow-4xl transition-all duration-500 h-full flex flex-col space-y-6 md:space-y-8">
                   <div className="flex items-center space-x-4 md:space-x-6">
                      <div className="w-16 h-16 md:w-24 md:h-24 bg-white rounded-2xl md:rounded-[2rem] flex items-center justify-center overflow-hidden border border-slate-100 shadow-inner group-hover:scale-110 transition-transform shrink-0">
                         {member.imageUrl ? <img src={member.imageUrl} className="w-full h-full object-cover" alt={member.name} /> : <Fingerprint className="w-8 h-8 md:w-12 md:h-12 text-indigo-100" />}
                      </div>
                      <div className="space-y-1 overflow-hidden">
                         <h4 className="font-bold text-lg md:text-2xl text-slate-900 serif tracking-tight truncate">{member.name}</h4>
                         <div className="flex items-center text-[8px] md:text-[10px] font-black uppercase tracking-heritage text-indigo-600/60">
                            <MapPin size={10} className="mr-1 md:mr-1.5" />
                            <span className="truncate">{member.location || 'Unknown Spatial Node'}</span>
                         </div>
                      </div>
                   </div>
                   
                   <p className="text-slate-500 text-xs md:text-sm leading-relaxed italic opacity-70">
                     "{member.notes?.slice(0, 80) || 'Ledger entry sparse. Research recommended.'}..."
                   </p>

                   <div className="mt-auto">
                     <button 
                        disabled={researchingId === member.id}
                        onClick={() => handleDeepResearch(member)}
                        className="w-full bg-slate-900 text-white py-4 md:py-6 rounded-2xl md:rounded-3xl font-black uppercase tracking-widest text-[8px] md:text-[10px] hover:bg-indigo-600 transition-all flex items-center justify-center space-x-2 md:space-x-3 shadow-xl active:scale-95 disabled:opacity-50"
                     >
                        {researchingId === member.id ? <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" /> : <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-indigo-400" />}
                        <span>{researchingId === member.id ? 'Scouting...' : 'Audit Footprint'}</span>
                     </button>
                   </div>
                </div>
              </div>
            ))}
          </div>

          {/* Web Discovery Stream */}
          <div className="space-y-8 md:space-y-10 pt-8 md:pt-12">
             <div className="flex items-center space-x-4 border-b border-slate-100 pb-4 md:pb-6">
                <Globe className="text-indigo-600 w-5 h-5 md:w-6 md:h-6" />
                <h4 className="text-2xl md:text-3xl font-bold text-slate-900 serif">Discovery Feed</h4>
             </div>

             <div className="space-y-6 md:space-y-8">
                {[...deepLeads, ...visualLeads].length === 0 ? (
                  <div className="py-16 md:py-24 text-center glass-panel rounded-3xl md:rounded-[4rem] border border-white/50 border-dashed opacity-40">
                     <Search size={48} className="mx-auto mb-4 md:mb-6 text-slate-200 md:w-16 md:h-16" />
                     <p className="text-xl md:text-2xl font-bold text-slate-400 serif">No active discoveries</p>
                     <p className="text-xs md:text-sm text-slate-400 font-medium mt-2">Initiate a scan to populate this stream.</p>
                  </div>
                ) : (
                  [...deepLeads, ...visualLeads].map((lead, idx) => (
                    <div key={idx} className="glass-panel p-6 md:p-10 rounded-3xl md:rounded-[4.5rem] border border-white/70 shadow-2xl group flex flex-col md:flex-row gap-6 md:gap-10 items-start animate-in fade-in slide-in-from-left-8 duration-700" style={{ animationDelay: `${idx * 150}ms` }}>
                       <div className="w-24 h-24 md:w-32 md:h-32 shrink-0 rounded-2xl md:rounded-[2.5rem] bg-white overflow-hidden border border-slate-100 shadow-inner flex items-center justify-center relative">
                          {lead.imageUrl ? (
                            <img src={lead.imageUrl} className="w-full h-full object-cover" alt={lead.name} />
                          ) : (
                            <History className="w-10 h-10 md:w-12 md:h-12 text-slate-100" />
                          )}
                          <div className="absolute inset-0 bg-indigo-600/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                       </div>
                       
                       <div className="flex-grow space-y-4 md:space-y-6 w-full">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                             <div className="space-y-1 md:space-y-2">
                                <div className="flex flex-wrap items-center gap-2 md:gap-3">
                                   <h5 className="text-xl md:text-3xl font-bold text-slate-900 serif tracking-tight">{lead.name}</h5>
                                   <div className="bg-emerald-50 text-emerald-600 px-2 md:px-4 py-1 rounded-full text-[7px] md:text-[9px] font-black uppercase tracking-widest border border-emerald-100">
                                     {lead.sourceType || 'Archival Match'}
                                   </div>
                                </div>
                                <div className="flex items-center text-[9px] md:text-[11px] font-black text-indigo-400 uppercase tracking-heritage">
                                   <MapIcon size={10} className="mr-1.5 md:mr-2" />
                                   <span className="truncate">{lead.potentialLocation || 'Unknown Origin'}</span>
                                </div>
                             </div>
                             {renderConfidenceMeter(lead.confidence || 0.5)}
                          </div>
                          
                          <p className="text-slate-500 text-sm md:text-lg leading-relaxed line-clamp-2 font-medium opacity-80 italic">
                             "{lead.reason}"
                          </p>
                          
                          <div className="flex flex-wrap gap-2 pt-2">
                             {lead.externalLinks?.map((link, lIdx) => (
                                <a key={lIdx} href={link.uri} target="_blank" className="flex items-center px-4 py-2 md:px-6 md:py-3 bg-white text-indigo-600 rounded-xl md:rounded-2xl text-[8px] md:text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all border border-slate-100 shadow-sm">
                                   <LinkIcon className="w-3 h-3 md:w-3.5 md:h-3.5 mr-1.5 md:mr-2" />
                                   {link.title}
                                </a>
                             ))}
                          </div>

                          <div className="flex flex-col sm:flex-row items-center gap-3 md:gap-4 pt-6 md:pt-8 border-t border-slate-50">
                             <button 
                                onClick={() => onConnect?.(lead)}
                                className="w-full sm:flex-grow bg-indigo-600 text-white py-4 md:py-6 rounded-xl md:rounded-[2rem] text-[10px] md:text-xs font-black uppercase tracking-widest flex items-center justify-center space-x-2 md:space-x-3 shadow-3xl hover:scale-[1.02] active:scale-95 transition-all"
                             >
                                <Plus className="w-4 h-4 md:w-5 md:h-5" />
                                <span>Integrate Node</span>
                             </button>
                             <button 
                                onClick={() => openRequestModal(lead)}
                                disabled={sentRequests.has(lead.id)}
                                className={`w-full sm:w-auto px-6 md:px-10 py-4 md:py-6 rounded-xl md:rounded-[2rem] text-[10px] md:text-xs font-black uppercase tracking-widest flex items-center justify-center space-x-2 md:space-x-3 transition-all shadow-xl ${
                                  sentRequests.has(lead.id) 
                                    ? 'bg-emerald-100 text-emerald-700 cursor-default' 
                                    : 'bg-slate-900 text-white hover:bg-slate-800'
                                }`}
                             >
                                {sentRequests.has(lead.id) ? <Check className="w-4 h-4 md:w-5 md:h-5" /> : <Mail className="w-4 h-4 md:w-5 md:h-5" />}
                                <span>{sentRequests.has(lead.id) ? 'Sent' : 'Request'}</span>
                             </button>
                          </div>
                       </div>
                    </div>
                  ))
                )}
             </div>
          </div>
        </div>

        {/* Right Column: Neural Inferences & Activity */}
        <div className="lg:col-span-4 space-y-8 md:space-y-12">
           <div className="bg-slate-900 rounded-[2.5rem] md:rounded-[4rem] p-8 md:p-12 text-white shadow-4xl relative overflow-hidden group border border-white/5">
              <div className="absolute top-0 right-0 p-12 opacity-5 -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-1000">
                 <ShieldCheck size={280} />
              </div>
              <div className="relative z-10 space-y-8 md:space-y-10">
                 <div className="flex items-center space-x-4">
                    <div className="bg-indigo-600 p-2 md:p-3 rounded-xl md:rounded-2xl">
                       <History className="w-5 h-5 md:w-6 md:h-6 text-white" />
                    </div>
                    <h4 className="text-xl md:text-2xl font-bold serif">System Inference</h4>
                 </div>
                 
                 <div className="space-y-4 md:space-y-6">
                    {internalMatches.map((match, idx) => (
                       <div key={idx} className="bg-white/5 p-6 md:p-8 rounded-3xl border border-white/10 hover:bg-white/10 transition-all cursor-pointer group/match animate-in slide-in-from-right-8 duration-700" style={{ animationDelay: `${idx * 200}ms` }}>
                          <div className="flex items-center justify-between mb-4">
                             <div className="w-12 h-12 md:w-14 md:h-14 bg-white/10 rounded-xl md:rounded-2xl flex items-center justify-center overflow-hidden">
                                {match.imageUrl ? <img src={match.imageUrl} className="w-full h-full object-cover" /> : <Target className="w-6 h-6 md:w-7 md:h-7 text-indigo-400" />}
                             </div>
                             {renderConfidenceMeter(match.confidence || 0.5)}
                          </div>
                          <h5 className="font-bold text-lg md:text-xl serif mb-2">{match.name}</h5>
                          <p className="text-[10px] text-slate-400 leading-relaxed line-clamp-3 italic">"{match.reason}"</p>
                          <div className="flex gap-2 mt-6">
                            <button 
                              onClick={() => onConnect?.(match)}
                              className="flex-grow bg-indigo-600 text-white py-3 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center space-x-2 group-hover/match:scale-105 transition-all shadow-xl"
                            >
                               <Plus className="w-3.5 h-3.5" />
                               <span>Add Node</span>
                            </button>
                            <button 
                              onClick={() => openRequestModal(match)}
                              disabled={sentRequests.has(match.id)}
                              className={`p-3 rounded-xl transition-all ${
                                sentRequests.has(match.id) 
                                  ? 'bg-emerald-500/20 text-emerald-400' 
                                  : 'bg-white/10 text-white hover:bg-white/20'
                              }`}
                            >
                               {sentRequests.has(match.id) ? <Check className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
                            </button>
                          </div>
                       </div>
                    ))}
                 </div>
              </div>
           </div>

           <div className="glass-panel rounded-3xl md:rounded-[4rem] p-8 md:p-12 border border-white/50 shadow-2xl space-y-8 md:space-y-10">
              <div className="flex items-center space-x-4">
                 <div className="bg-emerald-50 p-3 rounded-xl">
                    <ShieldCheck className="w-5 h-5 md:w-6 md:h-6 text-emerald-600" />
                 </div>
                 <h4 className="text-xl md:text-2xl font-bold text-slate-900 serif">Ledger Privacy</h4>
              </div>
              <div className="space-y-6">
                 <p className="text-xs md:text-sm text-slate-500 font-medium leading-relaxed">
                   Discovery scouting utilizes zero-knowledge metadata. Your private tree details never leave the vault during audits.
                 </p>
                 <div className="p-4 md:p-6 bg-emerald-50 rounded-2xl md:rounded-3xl border border-emerald-100 flex items-start space-x-3 md:space-x-4">
                    <Lock className="w-4 h-4 md:w-5 md:h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <p className="text-[9px] md:text-[11px] font-bold text-emerald-800 uppercase tracking-widest leading-relaxed">
                      Verified against global GDPR compliance standards.
                    </p>
                 </div>
              </div>
           </div>
        </div>
      </div>

      {/* Connection Request Modal */}
      {selectedMatchForRequest && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-2xl rounded-3xl md:rounded-[3rem] shadow-5xl overflow-hidden animate-in fade-in zoom-in duration-500 max-h-[90vh] flex flex-col">
            <div className="p-6 md:p-10 border-b border-slate-100 flex justify-between items-center">
              <div className="flex items-center space-x-3 md:space-x-4">
                <div className="bg-indigo-600 p-2.5 md:p-3 rounded-xl md:rounded-2xl shadow-xl">
                  <MessageSquare className="text-white w-5 h-5 md:w-6 md:h-6" />
                </div>
                <div>
                  <h3 className="text-xl md:text-2xl font-bold text-slate-900 serif">Heritage Connection</h3>
                  <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-heritage truncate max-w-[150px]">To: {selectedMatchForRequest.name}</p>
                </div>
              </div>
              <button onClick={() => setSelectedMatchForRequest(null)} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
                <X className="w-5 h-5 md:w-6 md:h-6 text-slate-400" />
              </button>
            </div>

            <div className="p-6 md:p-10 space-y-6 md:space-y-8 overflow-y-auto flex-grow custom-scrollbar">
              <div className="space-y-3 md:space-y-4">
                <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-heritage">Select Template</label>
                <div className="flex flex-wrap gap-2">
                  {MESSAGE_TEMPLATES.map(t => (
                    <button 
                      key={t.id}
                      onClick={() => {
                        setActiveTemplate(t);
                        setCustomMessage(t.text);
                      }}
                      className={`px-4 md:px-5 py-2 md:py-3 rounded-xl md:rounded-2xl text-[8px] md:text-[10px] font-black uppercase tracking-widest transition-all border ${
                        activeTemplate.id === t.id 
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' 
                          : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-200'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3 md:space-y-4">
                <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-heritage">Message Payload</label>
                <textarea 
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  className="w-full h-32 md:h-40 p-4 md:p-6 bg-slate-50 border border-slate-200 rounded-2xl md:rounded-3xl outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all font-medium text-slate-700 resize-none text-sm md:text-base"
                  placeholder="Craft your connection request..."
                />
              </div>

              <div className="bg-indigo-50 p-4 md:p-6 rounded-2xl md:rounded-3xl border border-indigo-100 flex items-start space-x-3 md:space-x-4">
                <ShieldCheck className="w-4 h-4 md:w-5 md:h-5 text-indigo-600 shrink-0 mt-0.5" />
                <p className="text-[8px] md:text-[10px] font-bold text-indigo-800 uppercase tracking-widest leading-relaxed">
                  Your identity remains semi-anonymous until the recipient accepts the protocol.
                </p>
              </div>

              <button 
                onClick={handleSendRequest}
                disabled={isSendingRequest || !customMessage.trim()}
                className="w-full bg-indigo-600 text-white py-4 md:py-6 rounded-xl md:rounded-[2rem] font-black uppercase tracking-widest text-xs md:text-sm shadow-3xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center space-x-2 md:space-x-3 disabled:opacity-50"
              >
                {isSendingRequest ? (
                  <>
                    <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
                    <span>Transmitting...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 md:w-5 md:h-5" />
                    <span>Broadcast Request</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Matches;
