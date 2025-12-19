
import React, { useEffect, useState } from 'react';
import { Heart, Loader2, ShieldCheck, Mail, Check, X, MapIcon, Plus, Info, Send } from 'lucide-react';
import { FamilyMember, MatchSuggestion } from '../types';
import { getPotentialMatches } from '../services/gemini';

interface MatchesProps {
  members: FamilyMember[];
  onConnect?: (match: MatchSuggestion) => void;
}

const MESSAGE_TEMPLATES = [
  {
    id: 'heritage',
    label: 'Heritage Discovery',
    text: "Hello! Our family tree suggests a potential connection between our lineages. Would you be open to verifying these links together?"
  },
  {
    id: 'research',
    label: 'Family Research',
    text: "Hi! I'm researching our family history and found some records that overlap with yours. I'd love to connect and share what I've discovered."
  },
  {
    id: 'reconnect',
    label: 'Reconnection',
    text: "We might be related through a common ancestor. I'd like to reconnect and learn more about our shared family story."
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Connection Request State
  const [selectedMatchForRequest, setSelectedMatchForRequest] = useState<MatchSuggestion | null>(null);
  const [activeTemplate, setActiveTemplate] = useState(MESSAGE_TEMPLATES[0]);
  const [customMessage, setCustomMessage] = useState(MESSAGE_TEMPLATES[0].text);
  const [isSendingRequest, setIsSendingRequest] = useState(false);
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await getPotentialMatches(members);
        setInternalMatches(res);
      } catch (err) {
        setError('Unable to find matches. Try adding more family members first.');
        setInternalMatches([]);
      } finally {
        setLoading(false);
      }
    };
    
    if (members.length > 0) {
      fetchMatches();
    } else {
      setLoading(false);
    }
  }, [members]);

  const openRequestModal = (match: MatchSuggestion) => {
    setSelectedMatchForRequest(match);
    setCustomMessage(MESSAGE_TEMPLATES[0].text);
    setActiveTemplate(MESSAGE_TEMPLATES[0]);
  };

  const handleSendRequest = () => {
    if (!selectedMatchForRequest) return;
    setIsSendingRequest(true);
    
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
          {percentage}% Match
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
    <div className="max-w-7xl mx-auto space-y-10 md:space-y-16 pb-32 view-enter px-4 py-8">
      {/* Simple Header */}
      <div className="text-center space-y-4 md:space-y-6">
        <div className="inline-flex items-center space-x-2 bg-indigo-50 px-4 md:px-6 py-2 rounded-full border border-indigo-100 animate-in fade-in">
           <Heart className="w-4 h-4 text-indigo-600" />
           <span className="text-[10px] md:text-[11px] font-black uppercase tracking-heritage text-indigo-600">Find Your Family</span>
        </div>
        
        <div className="space-y-2 md:space-y-3">
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-extrabold text-slate-900 serif tracking-tight leading-none">Potential Family <span className="gradient-text-hope italic">Matches</span></h2>
          <p className="text-slate-600 max-w-2xl mx-auto text-base md:text-lg font-medium px-4">
            Based on the family members you've added, we've found people who might be your relatives. Review the matches below.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-8 md:space-y-12">
        {/* Loading State */}
        {loading && members.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 md:py-24 space-y-4">
            <div className="w-12 h-12 md:w-16 md:h-16 bg-indigo-100 rounded-full flex items-center justify-center">
              <Loader2 className="w-6 h-6 md:w-8 md:h-8 text-indigo-600 animate-spin" />
            </div>
            <p className="text-slate-600 font-medium">Loading matches...</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="glass-panel rounded-2xl md:rounded-3xl p-6 md:p-8 border border-orange-200 bg-orange-50 flex items-start space-x-4">
            <Info className="w-5 h-5 md:w-6 md:h-6 text-orange-600 shrink-0 mt-0.5" />
            <div className="flex-grow">
              <h3 className="font-bold text-orange-900 text-base md:text-lg mb-1">No matches found</h3>
              <p className="text-orange-800 text-sm md:text-base">{error}</p>
            </div>
          </div>
        )}

        {/* Matches List */}
        {!loading && internalMatches.length > 0 && (
          <div className="space-y-6 md:space-y-8">
            <div className="flex items-center space-x-3">
              <div className="bg-indigo-600 p-2 md:p-3 rounded-xl md:rounded-2xl shadow-lg">
                <Heart className="text-white w-5 h-5 md:w-6 md:h-6" />
              </div>
              <div>
                <h3 className="text-2xl md:text-3xl font-bold text-slate-900 serif">
                  {internalMatches.length} Potential Match{internalMatches.length !== 1 ? 'es' : ''}
                </h3>
                <p className="text-slate-500 text-xs md:text-sm font-medium">Based on shared information</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {internalMatches.map((match, i) => (
                <div key={match.id} className="group animate-in fade-in slide-in-from-bottom-8 duration-700" style={{ animationDelay: `${i * 100}ms` }}>
                  <div className="glass-panel p-6 md:p-8 rounded-2xl md:rounded-3xl border border-white/60 shadow-lg hover:shadow-xl transition-all h-full flex flex-col space-y-4">
                    {/* Card Header */}
                    <div className="flex items-start space-x-4">
                      <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-indigo-100 to-blue-100 rounded-xl md:rounded-2xl flex items-center justify-center overflow-hidden border border-indigo-200 shrink-0">
                        {match.imageUrl ? (
                          <img src={match.imageUrl} className="w-full h-full object-cover" alt={match.name} />
                        ) : (
                          <Heart className="w-8 h-8 md:w-10 md:h-10 text-indigo-400" />
                        )}
                      </div>
                      <div className="flex-grow min-w-0">
                        <h4 className="text-lg md:text-xl font-bold text-slate-900 serif truncate">{match.name}</h4>
                        <div className="flex items-center space-x-1 text-slate-500 text-xs md:text-sm mt-1">
                          <MapIcon size={14} className="shrink-0" />
                          <span className="truncate">{match.potentialLocation || 'Location unknown'}</span>
                        </div>
                        <div className="mt-2">
                          {renderConfidenceMeter(match.confidence || 0.5)}
                        </div>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="space-y-2">
                      <p className="text-slate-600 text-sm md:text-base leading-relaxed italic font-medium">
                        "{match.reason}"
                      </p>
                    </div>

                    {/* Card Actions */}
                    <div className="flex flex-col sm:flex-row gap-3 pt-3 md:pt-4 border-t border-slate-100 mt-auto">
                      <button 
                        onClick={() => onConnect?.(match)}
                        className="flex-1 bg-indigo-600 text-white py-3 md:py-4 rounded-lg md:rounded-xl text-xs md:text-sm font-bold uppercase tracking-wide flex items-center justify-center space-x-2 shadow-lg hover:bg-indigo-700 active:scale-95 transition-all"
                        title="Add this person to your family tree"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add to Tree</span>
                      </button>
                      <button 
                        onClick={() => openRequestModal(match)}
                        disabled={sentRequests.has(match.id)}
                        className={`px-4 md:px-6 py-3 md:py-4 rounded-lg md:rounded-xl text-xs md:text-sm font-bold uppercase tracking-wide flex items-center justify-center space-x-2 transition-all ${
                          sentRequests.has(match.id) 
                            ? 'bg-emerald-100 text-emerald-700 cursor-default' 
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                        title={sentRequests.has(match.id) ? 'Request already sent' : 'Send a message to this person'}
                      >
                        {sentRequests.has(match.id) ? (
                          <>
                            <Check className="w-4 h-4" />
                            <span>Sent</span>
                          </>
                        ) : (
                          <>
                            <Mail className="w-4 h-4" />
                            <span className="hidden sm:inline">Contact</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && internalMatches.length === 0 && !error && (
          <div className="glass-panel rounded-2xl md:rounded-3xl p-12 md:p-16 text-center space-y-6 border border-slate-100">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto">
              <Heart className="w-8 h-8 md:w-10 md:h-10 text-indigo-600" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl md:text-3xl font-bold text-slate-900 serif">Add more family members</h3>
              <p className="text-slate-600 text-base md:text-lg">
                The more family members you add to your tree, the better matches we can find for you.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Privacy Footer */}
      <div className="glass-panel rounded-2xl md:rounded-3xl p-6 md:p-8 border border-emerald-100 bg-emerald-50 flex items-start space-x-4">
        <ShieldCheck className="w-5 h-5 md:w-6 md:h-6 text-emerald-600 shrink-0 mt-0.5" />
        <div className="flex-grow">
          <h4 className="font-bold text-emerald-900 text-base md:text-lg mb-1">Your privacy is protected</h4>
          <p className="text-emerald-800 text-sm md:text-base">
            Your family information is encrypted and stays on your device. We never share your data without your permission.
          </p>
        </div>
      </div>

      {/* Connection Request Modal */}
      {selectedMatchForRequest && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-2xl rounded-3xl md:rounded-[3rem] shadow-5xl overflow-hidden animate-in fade-in zoom-in duration-500 max-h-[90vh] flex flex-col">
            <div className="p-6 md:p-10 border-b border-slate-100 flex justify-between items-center">
              <div className="flex items-center space-x-3 md:space-x-4">
                <div className="bg-indigo-600 p-2.5 md:p-3 rounded-xl md:rounded-2xl shadow-xl">
                  <Heart className="text-white w-5 h-5 md:w-6 md:h-6" />
                </div>
                <div>
                  <h3 className="text-xl md:text-2xl font-bold text-slate-900 serif">Connect with {selectedMatchForRequest.name}</h3>
                  <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-heritage">Send a message to start the conversation</p>
                </div>
              </div>
              <button onClick={() => setSelectedMatchForRequest(null)} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
                <X className="w-5 h-5 md:w-6 md:h-6 text-slate-400" />
              </button>
            </div>

            <div className="p-6 md:p-10 space-y-6 md:space-y-8 overflow-y-auto flex-grow custom-scrollbar">
              <div className="space-y-3 md:space-y-4">
                <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-heritage">Choose a message template</label>
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
                <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-heritage">Your message</label>
                <textarea 
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  className="w-full h-32 md:h-40 p-4 md:p-6 bg-slate-50 border border-slate-200 rounded-2xl md:rounded-3xl outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all font-medium text-slate-700 resize-none text-sm md:text-base"
                  placeholder="Customize your message..."
                />
              </div>

              <div className="bg-indigo-50 p-4 md:p-6 rounded-2xl md:rounded-3xl border border-indigo-100 flex items-start space-x-3 md:space-x-4">
                <ShieldCheck className="w-4 h-4 md:w-5 md:h-5 text-indigo-600 shrink-0 mt-0.5" />
                <p className="text-[8px] md:text-[10px] font-bold text-indigo-800 uppercase tracking-widest leading-relaxed">
                  Your identity is semi-private until they accept your request.
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
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 md:w-5 md:h-5" />
                    <span>Send Message</span>
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
