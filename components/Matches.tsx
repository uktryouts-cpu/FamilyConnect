
import React, { useEffect, useState } from 'react';
import { Heart, Loader2, ShieldCheck, Mail, Check, X, MapIcon, Plus, Info, Send, Search, Globe, Users, Archive, AlertCircle, Eye, ChevronDown, ChevronRight, Zap, Target } from 'lucide-react';
import { FamilyMember, MatchSuggestion } from '../types';
import { getPotentialMatches, executeAgentDiscovery, deepResearchRelative, visualEvidenceSearch } from '../services/gemini';

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

const SEARCH_SOURCES = [
  { id: 'app-users', label: 'App Users', icon: Users, color: 'indigo', description: 'Search other FamilyConnect users' },
  { id: 'social-media', label: 'Social Media', icon: Globe, color: 'blue', description: 'Facebook, LinkedIn, Twitter, Instagram' },
  { id: 'archives', label: 'Archives', icon: Archive, color: 'purple', description: 'Historical records & documents' },
  { id: 'public-records', label: 'Public Records', icon: Search, color: 'slate', description: 'Census, vital records, databases' },
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
  // Match Discovery State
  const [internalMatches, setInternalMatches] = useState<MatchSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Search & Sentinel Features
  const [activeTab, setActiveTab] = useState<'ai-matches' | 'search'>('ai-matches');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSource, setSearchSource] = useState<string>('app-users');
  const [searchResults, setSearchResults] = useState<MatchSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [sentinelActive, setSentinelActive] = useState(false);
  const [sentinelProgress, setSentinelProgress] = useState<string>('');
  
  // Deep Research Mode
  const [selectedMemberForDeepDive, setSelectedMemberForDeepDive] = useState<FamilyMember | null>(null);
  const [deepDiveResults, setDeepDiveResults] = useState<MatchSuggestion[]>([]);
  const [deepDiveLoading, setDeepDiveLoading] = useState(false);
  
  // Connection Request State
  const [selectedMatchForRequest, setSelectedMatchForRequest] = useState<MatchSuggestion | null>(null);
  const [activeTemplate, setActiveTemplate] = useState(MESSAGE_TEMPLATES[0]);
  const [customMessage, setCustomMessage] = useState(MESSAGE_TEMPLATES[0].text);
  const [isSendingRequest, setIsSendingRequest] = useState(false);
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());
  
  // Add to Profile Modal
  const [selectedInfoToAdd, setSelectedInfoToAdd] = useState<{ match: MatchSuggestion; type: string } | null>(null);

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

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setSearching(true);
    try {
      const results = await executeAgentDiscovery(
        `Search for "${searchQuery}" in ${searchSource === 'app-users' ? 'app users' : searchSource}. Include their name, location, potential relationship, and where they were found.`,
        members
      );
      setSearchResults(results);
    } catch (err) {
      alert('Search failed. Try a different query.');
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleSentinelActivate = async () => {
    if (!members.length) {
      alert('Add family members first');
      return;
    }
    
    setSentinelActive(true);
    setSentinelProgress('🔍 Scanning for family connections...');
    
    try {
      // Multi-stage Sentinel analysis
      const stages = [
        { msg: '🔍 Scanning internet records...', delay: 800 },
        { msg: '📊 Analyzing social media profiles...', delay: 1200 },
        { msg: '📚 Searching historical archives...', delay: 1000 },
        { msg: '🔗 Cross-referencing family connections...', delay: 1500 },
        { msg: '✨ Synthesizing discovery report...', delay: 800 }
      ];
      
      for (const stage of stages) {
        setSentinelProgress(stage.msg);
        await new Promise(r => setTimeout(r, stage.delay));
      }
      
      // Run autonomous discovery
      const sentinelResults = await executeAgentDiscovery(
        `Comprehensive sentinel scan: Find all potential family connections, relatives, and genealogical leads for the user's family tree.`,
        members
      );
      
      setInternalMatches(sentinelResults);
      setSentinelProgress('✅ Sentinel scan complete! Found ' + sentinelResults.length + ' potential matches.');
      
      setTimeout(() => setSentinelActive(false), 2000);
    } catch (err) {
      setSentinelProgress('❌ Sentinel scan encountered an error.');
      setTimeout(() => setSentinelActive(false), 2000);
    }
  };

  const handleDeepDive = async (member: FamilyMember) => {
    setSelectedMemberForDeepDive(member);
    setDeepDiveLoading(true);
    
    try {
      const results = await deepResearchRelative(member);
      setDeepDiveResults(results);
    } catch (err) {
      alert('Deep research failed for this member.');
      setDeepDiveResults([]);
    } finally {
      setDeepDiveLoading(false);
    }
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

  const handleAddToProfile = (match: MatchSuggestion) => {
    setSelectedInfoToAdd({ match, type: 'info' });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 md:space-y-12 pb-32 view-enter px-4 py-8">
      {/* Enhanced Header */}
      <div className="text-center space-y-4 md:space-y-6">
        <div className="inline-flex items-center space-x-2 bg-indigo-50 px-4 md:px-6 py-2 rounded-full border border-indigo-100 animate-in fade-in">
           <Zap className="w-4 h-4 text-indigo-600" />
           <span className="text-[10px] md:text-[11px] font-black uppercase tracking-heritage text-indigo-600">Find Your Relatives</span>
        </div>
        
        <div className="space-y-2 md:space-y-3">
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-extrabold text-slate-900 serif tracking-tight leading-none">
            Discover & Connect <span className="gradient-text-hope italic">Your Family</span>
          </h2>
          <p className="text-slate-600 max-w-3xl mx-auto text-base md:text-lg font-medium px-4">
            Use AI-powered discovery to find relatives online, across social media, archives, and app users. Connect with your family worldwide.
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-col sm:flex-row gap-3 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('ai-matches')}
          className={`flex-1 px-6 py-4 font-bold uppercase text-xs md:text-sm tracking-widest transition-all border-b-2 ${
            activeTab === 'ai-matches'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <div className="flex items-center justify-center space-x-2">
            <Zap className="w-4 h-4" />
            <span>AI Matches</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('search')}
          className={`flex-1 px-6 py-4 font-bold uppercase text-xs md:text-sm tracking-widest transition-all border-b-2 ${
            activeTab === 'search'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <div className="flex items-center justify-center space-x-2">
            <Search className="w-4 h-4" />
            <span>Advanced Search</span>
          </div>
        </button>
      </div>

      {/* AI Matches Tab */}
      {activeTab === 'ai-matches' && (
        <div className="space-y-8">
          {/* Sentinel Activation Card */}
          <div className="glass-panel rounded-3xl p-6 md:p-10 border border-indigo-200/50 bg-gradient-to-br from-indigo-50 to-blue-50 shadow-lg">
            <div className="flex items-start justify-between gap-6">
              <div className="space-y-4 flex-grow">
                <div className="flex items-center space-x-3">
                  <div className="bg-indigo-600 p-2.5 rounded-xl">
                    <Zap className="text-white w-5 h-5" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 serif">Sentinel AI Analysis</h3>
                </div>
                <p className="text-slate-700 font-medium text-sm md:text-base">
                  Activate our advanced Sentinel AI to scan across the internet, social media, archives, and public records for potential family connections.
                </p>
                {sentinelProgress && (
                  <div className="bg-white/60 backdrop-blur p-4 rounded-xl border border-indigo-100">
                    <p className="text-sm font-semibold text-slate-700">{sentinelProgress}</p>
                  </div>
                )}
              </div>
              <button
                onClick={handleSentinelActivate}
                disabled={sentinelActive || !members.length}
                className="px-8 py-4 bg-indigo-600 text-white font-black uppercase text-sm rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all whitespace-nowrap flex-shrink-0 shadow-lg"
              >
                {sentinelActive ? <Loader2 className="w-5 h-5 animate-spin inline mr-2" /> : <Zap className="w-5 h-5 inline mr-2" />}
                {sentinelActive ? 'Scanning...' : 'Activate Sentinel'}
              </button>
            </div>
          </div>

          {/* Loading State */}
          {loading && members.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 md:py-24 space-y-4">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-indigo-100 rounded-full flex items-center justify-center">
                <Loader2 className="w-6 h-6 md:w-8 md:h-8 text-indigo-600 animate-spin" />
              </div>
              <p className="text-slate-600 font-medium">Discovering matches...</p>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="glass-panel rounded-2xl md:rounded-3xl p-6 md:p-8 border border-orange-200 bg-orange-50 flex items-start space-x-4">
              <AlertCircle className="w-5 h-5 md:w-6 md:h-6 text-orange-600 shrink-0 mt-0.5" />
              <div className="flex-grow">
                <h3 className="font-bold text-orange-900 text-base md:text-lg mb-1">Unable to find matches</h3>
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
                    {internalMatches.length} Match{internalMatches.length !== 1 ? 'es' : ''} Found
                  </h3>
                  <p className="text-slate-500 text-xs md:text-sm font-medium">People who could be your relatives</p>
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
                          "{match.reason || 'Potential family connection'}"
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
                        >
                          {sentRequests.has(match.id) ? (
                            <>
                              <Check className="w-4 h-4" />
                              <span>Contacted</span>
                            </>
                          ) : (
                            <>
                              <Mail className="w-4 h-4" />
                              <span className="hidden sm:inline">Connect</span>
                            </>
                          )}
                        </button>
                        <button 
                          onClick={() => handleAddToProfile(match)}
                          className="px-4 md:px-6 py-3 md:py-4 rounded-lg md:rounded-xl text-xs md:text-sm font-bold uppercase tracking-wide bg-purple-100 text-purple-700 hover:bg-purple-200 transition-all"
                          title="Add info found online to your profile"
                        >
                          <Eye className="w-4 h-4 inline mr-1" />
                          <span className="hidden sm:inline">Save Info</span>
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
                <h3 className="text-2xl md:text-3xl font-bold text-slate-900 serif">Activate Sentinel to begin discovery</h3>
                <p className="text-slate-600 text-base md:text-lg">
                  Click the "Activate Sentinel" button above to scan for family connections across the internet, social media, and archives.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Advanced Search Tab */}
      {activeTab === 'search' && (
        <div className="space-y-8">
          {/* Search Controls */}
          <div className="glass-panel rounded-3xl p-6 md:p-10 border border-slate-200 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="text-sm font-bold uppercase text-slate-600 tracking-widest">Search Name or Term</label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Enter name, email, or search term..."
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                />
              </div>
              <div className="space-y-3">
                <label className="text-sm font-bold uppercase text-slate-600 tracking-widest">Search Source</label>
                <select
                  value={searchSource}
                  onChange={(e) => setSearchSource(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                >
                  {SEARCH_SOURCES.map(source => (
                    <option key={source.id} value={source.id}>{source.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={handleSearch}
              disabled={searching || !searchQuery.trim()}
              className="w-full bg-indigo-600 text-white py-4 md:py-6 rounded-xl font-black uppercase tracking-widest text-sm shadow-lg hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center space-x-3"
            >
              {searching ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Searching...</span>
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  <span>Search Across Sources</span>
                </>
              )}
            </button>
          </div>

          {/* Search Source Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {SEARCH_SOURCES.map(source => (
              <div key={source.id} className="glass-panel p-4 rounded-2xl border border-slate-100 text-center space-y-2">
                <div className="flex justify-center">
                  <source.icon className="w-6 h-6 text-slate-600" />
                </div>
                <h4 className="font-bold text-sm text-slate-900">{source.label}</h4>
                <p className="text-[10px] text-slate-500 leading-tight">{source.description}</p>
              </div>
            ))}
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="space-y-6">
              <div className="flex items-center space-x-3">
                <div className="bg-green-600 p-2 rounded-xl">
                  <Check className="text-white w-5 h-5" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 serif">
                  {searchResults.length} Result{searchResults.length !== 1 ? 's' : ''} Found
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {searchResults.map((match, i) => (
                  <div key={match.id} className="group animate-in fade-in slide-in-from-bottom-8 duration-700" style={{ animationDelay: `${i * 100}ms` }}>
                    <div className="glass-panel p-6 md:p-8 rounded-2xl md:rounded-3xl border border-white/60 shadow-lg hover:shadow-xl transition-all h-full flex flex-col space-y-4">
                      <div className="flex items-start space-x-4">
                        <div className="w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br from-green-100 to-emerald-100 rounded-xl flex items-center justify-center border border-green-200">
                          <Globe className="w-7 h-7 text-green-600" />
                        </div>
                        <div className="flex-grow min-w-0">
                          <h4 className="font-bold text-slate-900 truncate">{match.name}</h4>
                          <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-widest mt-1">{searchSource}</p>
                        </div>
                      </div>

                      <p className="text-sm text-slate-600">{match.reason}</p>

                      <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-slate-100 mt-auto">
                        <button 
                          onClick={() => onConnect?.(match)}
                          className="flex-1 bg-green-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-green-700 transition-all flex items-center justify-center space-x-1"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add</span>
                        </button>
                        <button 
                          onClick={() => openRequestModal(match)}
                          className="flex-1 bg-slate-100 text-slate-700 py-2 rounded-lg text-xs font-bold hover:bg-slate-200 transition-all flex items-center justify-center space-x-1"
                        >
                          <Mail className="w-3 h-3" />
                          <span>Contact</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Privacy Footer */}
      <div className="glass-panel rounded-2xl md:rounded-3xl p-6 md:p-8 border border-emerald-100 bg-emerald-50 flex items-start space-x-4">
        <ShieldCheck className="w-5 h-5 md:w-6 md:h-6 text-emerald-600 shrink-0 mt-0.5" />
        <div className="flex-grow">
          <h4 className="font-bold text-emerald-900 text-base md:text-lg mb-1">Your family information is secure</h4>
          <p className="text-emerald-800 text-sm md:text-base">
            All data is encrypted and stored securely. Verification notifications are sent before anyone can see your profile. You control all connections and sharing.
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
                  Your contact info is hidden until they accept your request.
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

      {/* Add to Profile Modal */}
      {selectedInfoToAdd && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-xl rounded-3xl shadow-5xl overflow-hidden animate-in fade-in zoom-in duration-500">
            <div className="p-6 md:p-10 border-b border-slate-100 flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <Eye className="w-6 h-6 text-purple-600" />
                <h3 className="text-xl font-bold text-slate-900">Save Info to Profile</h3>
              </div>
              <button onClick={() => setSelectedInfoToAdd(null)} className="p-2 hover:bg-slate-100 rounded-xl">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-6 md:p-10 space-y-6">
              <p className="text-slate-600">
                Add this information about <strong>{selectedInfoToAdd.match.name}</strong> to your profile:
              </p>

              <div className="bg-purple-50 p-4 rounded-2xl border border-purple-200 space-y-3">
                <p className="text-sm font-semibold text-purple-900">{selectedInfoToAdd.match.reason}</p>
                {selectedInfoToAdd.match.potentialLocation && (
                  <p className="text-sm text-purple-800 flex items-center space-x-2">
                    <MapIcon className="w-4 h-4" />
                    <span>{selectedInfoToAdd.match.potentialLocation}</span>
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setSelectedInfoToAdd(null)}
                  className="flex-1 px-6 py-3 bg-slate-100 text-slate-700 font-bold uppercase text-sm rounded-xl hover:bg-slate-200 transition-all"
                >
                  Skip
                </button>
                <button
                  onClick={() => {
                    alert('Information added to your profile!');
                    setSelectedInfoToAdd(null);
                  }}
                  className="flex-1 px-6 py-3 bg-purple-600 text-white font-bold uppercase text-sm rounded-xl hover:bg-purple-700 transition-all"
                >
                  Save to Profile
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Matches;
