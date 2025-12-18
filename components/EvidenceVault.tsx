
import React, { useState } from 'react';
import { FamilyMember, EvidenceLink } from '../types';
import { Link as LinkIcon, ShieldCheck, AlertCircle, Trash2, Plus, ExternalLink, Globe, FileText, Loader2 } from 'lucide-react';
import { analyzeEvidenceLink } from '../services/gemini';

interface EvidenceVaultProps {
  member: FamilyMember;
  onUpdate: (member: FamilyMember) => void;
}

const EvidenceVault: React.FC<EvidenceVaultProps> = ({ member, onUpdate }) => {
  const [newUrl, setNewUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAddEvidence = async () => {
    if (!newUrl.trim()) return;
    setLoading(true);
    try {
      const analysis = await analyzeEvidenceLink(newUrl);
      const newEvidence: EvidenceLink = {
        id: crypto.randomUUID(),
        title: analysis.title || 'Unknown Source',
        url: newUrl,
        snippet: analysis.snippet,
        sourceType: analysis.sourceType || 'Web Archive',
        verificationStatus: 'unverified'
      };
      
      const updatedMember = {
        ...member,
        evidenceLinks: [...(member.evidenceLinks || []), newEvidence]
      };
      onUpdate(updatedMember);
      setNewUrl('');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const removeEvidence = (id: string) => {
    const updatedMember = {
      ...member,
      evidenceLinks: member.evidenceLinks?.filter(e => e.id !== id)
    };
    onUpdate(updatedMember);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between border-b border-slate-100 pb-6">
        <div className="flex items-center space-x-4">
          <div className="bg-indigo-600 p-3 rounded-2xl shadow-lg">
            <LinkIcon className="text-white w-6 h-6" />
          </div>
          <h3 className="text-3xl font-bold serif text-slate-900">Archival Evidence</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="flex gap-4">
            <input 
              type="text" 
              placeholder="Paste archival URL (Census, Parish, etc.)"
              className="flex-grow px-8 py-5 bg-slate-50 border border-slate-200 rounded-[2rem] outline-none focus:ring-4 focus:ring-indigo-50 font-bold"
              value={newUrl}
              onChange={e => setNewUrl(e.target.value)}
            />
            <button 
              onClick={handleAddEvidence}
              disabled={loading || !newUrl}
              className="bg-indigo-600 text-white p-5 rounded-[2rem] hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-xl"
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Plus className="w-6 h-6" />}
            </button>
          </div>

          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-4 custom-scrollbar">
            {!member.evidenceLinks?.length ? (
              <div className="py-20 text-center opacity-30 border-2 border-dashed border-slate-200 rounded-[3rem]">
                <FileText size={48} className="mx-auto mb-4" />
                <p className="font-bold">No citations in vault.</p>
              </div>
            ) : (
              member.evidenceLinks.map((ev) => (
                <div key={ev.id} className="glass-panel p-6 rounded-[2.5rem] border border-white/60 shadow-md group animate-in slide-in-from-left-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-grow pr-4">
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-black uppercase tracking-widest bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full">
                          {ev.sourceType}
                        </span>
                        {ev.verificationStatus === 'verified' && <ShieldCheck className="w-4 h-4 text-emerald-500" />}
                      </div>
                      <h4 className="font-bold text-slate-900 serif">{ev.title}</h4>
                      <p className="text-xs text-slate-400 line-clamp-2">{ev.snippet || ev.url}</p>
                    </div>
                    <div className="flex flex-col gap-2">
                       <a href={ev.url} target="_blank" className="p-3 bg-slate-50 text-slate-400 hover:text-indigo-600 rounded-xl transition-all">
                         <ExternalLink size={16} />
                       </a>
                       <button onClick={() => removeEvidence(ev.id)} className="p-3 bg-slate-50 text-slate-400 hover:text-rose-500 rounded-xl transition-all">
                         <Trash2 size={16} />
                       </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-slate-950 rounded-[3.5rem] p-12 text-white relative overflow-hidden">
          <div className="absolute top-0 left-0 p-12 opacity-5">
            <ShieldCheck size={260} />
          </div>
          <div className="relative z-10 space-y-8">
            <Globe className="text-indigo-400 w-12 h-12" />
            <h4 className="text-3xl font-bold serif leading-tight">Verification Protocols</h4>
            <p className="text-indigo-100/60 leading-relaxed font-medium">
              Citations are cross-verified by the Sentinel. Verified links (green badge) have high archival probability matching the node's temporal and spatial data.
            </p>
            <div className="flex items-center space-x-4 p-6 bg-white/5 rounded-[2rem] border border-white/10">
              <AlertCircle className="text-amber-400 w-6 h-6 shrink-0" />
              <p className="text-[11px] font-bold text-amber-200 uppercase tracking-widest leading-relaxed">
                Source analysis utilizes real-time Google Search grounding.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EvidenceVault;
