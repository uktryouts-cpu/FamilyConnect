import React, { useState, useRef } from 'react';
import { X, Briefcase, MapPin, Milestone, Dna, Plus, Trash2, Sparkles, User, Loader2, RefreshCw, Upload, Shield, Info, History, Clock, Fingerprint } from 'lucide-react';
import { FamilyMember, LifeEvent } from '../types';
import { generatePersonaPreview } from '../services/gemini';

interface AddMemberModalProps {
  onClose: () => void;
  onAdd: (member: Omit<FamilyMember, 'id' | 'childrenIds'>) => void;
  existingMembers: FamilyMember[];
}

const AddMemberModal: React.FC<AddMemberModalProps> = ({ onClose, onAdd, existingMembers }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<Omit<FamilyMember, 'id' | 'childrenIds'>>({
    name: '',
    relation: 'Parent',
    customRelation: '',
    birthDate: '',
    location: '',
    contactInfo: '',
    notes: '',
    parentId: '',
    occupations: [],
    lifeEvents: [],
    dnaMarkers: '',
    imageUrl: '',
    privacyLevel: 'Private'
  });

  const [newOcc, setNewOcc] = useState('');
  const [isGeneratingPortrait, setIsGeneratingPortrait] = useState(false);

  // Milestone State
  const [mType, setMType] = useState<LifeEvent['type']>('Migration');
  const [mYear, setMYear] = useState('');
  const [mLoc, setMLoc] = useState('');
  const [mDesc, setMDesc] = useState('');

  const handleGeneratePortrait = async () => {
    if (!formData.name.trim()) return;
    setIsGeneratingPortrait(true);
    try {
      const description = `${formData.relation} from ${formData.location || 'somewhere'}. Occupations: ${formData.occupations?.join(', ')}. ${formData.notes || ''}`;
      const img = await generatePersonaPreview(formData.name, description);
      if (img) setFormData(prev => ({ ...prev, imageUrl: img }));
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingPortrait(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setFormData(prev => ({ ...prev, imageUrl: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const addOccupation = () => {
    if (newOcc.trim() && !formData.occupations?.includes(newOcc.trim())) {
      setFormData(prev => ({ ...prev, occupations: [...(prev.occupations || []), newOcc.trim()] }));
      setNewOcc('');
    }
  };

  const removeOccupation = (occ: string) => {
    setFormData(prev => ({ ...prev, occupations: prev.occupations?.filter(o => o !== occ) }));
  };

  const addMilestone = () => {
    if (mYear && mLoc) {
      const newEvent: LifeEvent = {
        year: parseInt(mYear),
        type: mType,
        location: mLoc,
        description: mDesc
      };
      setFormData(prev => ({ ...prev, lifeEvents: [...(prev.lifeEvents || []), newEvent] }));
      setMYear('');
      setMLoc('');
      setMDesc('');
    }
  };

  const removeMilestone = (idx: number) => {
    setFormData(prev => ({ ...prev, lifeEvents: prev.lifeEvents?.filter((_, i) => i !== idx) }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-2 sm:p-4 bg-slate-900/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-white w-full max-w-3xl rounded-3xl md:rounded-[3rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 my-4 md:my-8 relative">
        <div className="flex justify-between items-center p-6 md:p-8 border-b border-slate-100 sticky top-0 bg-white/90 backdrop-blur-sm z-10">
          <div className="flex items-center space-x-3 md:space-x-4">
             <div className="bg-indigo-600 p-2.5 md:p-3 rounded-xl md:rounded-2xl shadow-xl shadow-indigo-200">
               <Plus className="text-white w-5 h-5 md:w-6 md:h-6" />
             </div>
             <div>
               <h2 className="text-xl md:text-2xl font-bold text-slate-900 serif">Add a Relative</h2>
               <p className="text-[8px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 md:mt-1">Expanding Your Family Story</p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 md:p-3 hover:bg-slate-100 rounded-xl md:rounded-2xl transition-all">
            <X className="w-5 h-5 md:w-6 md:h-6 text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 md:p-10 space-y-8 md:space-y-12 max-h-[80vh] overflow-y-auto custom-scrollbar">
          {/* Section 1: Identity & Visuals */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-10">
            <div className="lg:col-span-4 flex flex-col items-center">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-36 h-36 md:w-48 md:h-48 bg-slate-50 rounded-2xl md:rounded-[2.5rem] overflow-hidden border-2 border-dashed border-slate-200 relative group flex items-center justify-center cursor-pointer hover:border-indigo-400 transition-all shadow-inner"
              >
                {formData.imageUrl ? (
                  <img src={formData.imageUrl} alt="Portrait" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center justify-center space-y-2 text-slate-300 group-hover:text-indigo-400 transition-colors px-4 text-center">
                     <User className="w-8 h-8 md:w-12 md:h-12" />
                     <span className="text-[8px] md:text-[10px] font-bold tracking-widest uppercase">Tap to add a photo</span>
                  </div>
                )}
                {isGeneratingPortrait && (
                  <div className="absolute inset-0 bg-white/80 backdrop-blur-md flex items-center justify-center">
                    <Loader2 className="w-6 h-6 md:w-8 md:h-8 text-indigo-600 animate-spin" />
                  </div>
                )}
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
              </div>
              
              <div className="mt-4 md:mt-6 flex flex-col gap-2 w-full">
                <button 
                  type="button" 
                  onClick={handleGeneratePortrait}
                  disabled={!formData.name.trim() || isGeneratingPortrait}
                  className="w-full bg-indigo-50 text-indigo-600 py-3 rounded-xl md:rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 disabled:opacity-50 transition-all flex items-center justify-center"
                >
                  <Sparkles size={14} className="mr-2" /> AI Portrait
                </button>
                <p className="text-[8px] md:text-[9px] text-slate-400 text-center px-2 italic">Based on your notes.</p>
              </div>
            </div>

            <div className="lg:col-span-8 space-y-4 md:space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div className="md:col-span-2">
                  <label className="block text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Relative's Full Name</label>
                  <input 
                    required type="text" 
                    placeholder="e.g. Abraham S. Vance"
                    className="w-full px-5 md:px-6 py-3.5 md:py-4 bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl outline-none focus:ring-4 focus:ring-indigo-50 transition-all text-sm md:text-base"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Relation</label>
                  <select 
                    className="w-full px-5 md:px-6 py-3.5 md:py-4 bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl outline-none focus:ring-4 focus:ring-indigo-50 transition-all font-medium text-sm md:text-base"
                    value={formData.relation}
                    onChange={e => setFormData({ ...formData, relation: e.target.value })}
                  >
                    <option>Parent</option>
                    <option>Sibling</option>
                    <option>Child</option>
                    <option>Spouse</option>
                    <option>Grandparent</option>
                    <option>Uncle/Aunt</option>
                    <option>Cousin</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Parent Node</label>
                  <select 
                    className="w-full px-5 md:px-6 py-3.5 md:py-4 bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl outline-none focus:ring-4 focus:ring-indigo-50 transition-all font-medium text-sm md:text-base"
                    value={formData.parentId}
                    onChange={e => setFormData({ ...formData, parentId: e.target.value })}
                  >
                    <option value="">No parent selected</option>
                    {existingMembers.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Heritage Discovery Points */}
          <div className="bg-slate-50 p-6 md:p-8 rounded-2xl md:rounded-[2.5rem] border border-slate-100 space-y-6 md:space-y-8">
             <div className="flex items-center space-x-3">
               <History className="text-indigo-600 w-4 h-4 md:w-5 md:h-5" />
               <h3 className="font-bold text-slate-900 serif text-lg">Historical Clues</h3>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
               <div className="space-y-3 md:space-y-4">
                  <label className="block text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Primary Birth Year</label>
                 <div className="relative">
                   <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                   <input 
                     type="text" placeholder="e.g. 1910"
                     className="w-full pl-12 pr-5 md:pr-6 py-3.5 md:py-4 bg-white border border-slate-200 rounded-xl md:rounded-2xl outline-none focus:ring-4 focus:ring-indigo-50 transition-all text-sm"
                     value={formData.birthDate}
                     onChange={e => setFormData({ ...formData, birthDate: e.target.value })}
                   />
                 </div>
               </div>
               <div className="space-y-3 md:space-y-4">
                 <label className="block text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Primary Location</label>
                 <div className="relative">
                   <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                   <input 
                     type="text" placeholder="e.g. Cork, Ireland"
                     className="w-full pl-12 pr-5 md:pr-6 py-3.5 md:py-4 bg-white border border-slate-200 rounded-xl md:rounded-2xl outline-none focus:ring-4 focus:ring-indigo-50 transition-all text-sm"
                     value={formData.location}
                     onChange={e => setFormData({ ...formData, location: e.target.value })}
                   />
                 </div>
               </div>
             </div>
          </div>

          {/* Section 3: Ancestral Occupations */}
          <div className="space-y-4 md:space-y-6">
            <div className="flex items-center space-x-3">
              <Briefcase className="text-blue-600 w-4 h-4 md:w-5 md:h-5" />
              <h3 className="font-bold text-slate-900 serif text-lg">Ancestral Occupations</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.occupations?.map(occ => (
                <span key={occ} className="bg-blue-50 text-blue-600 px-3 md:px-4 py-1.5 md:py-2 rounded-xl text-[9px] md:text-[10px] font-bold flex items-center border border-blue-100 shadow-sm">
                  {occ}
                  <button type="button" onClick={() => removeOccupation(occ)} className="ml-2 hover:text-rose-500 p-0.5"><X size={10} /></button>
                </span>
              ))}
            </div>
            <div className="flex gap-2 md:gap-4">
               <input 
                 type="text" 
                 placeholder="e.g. Blacksmith, Weaver..."
                 className="flex-grow px-5 md:px-6 py-3.5 md:py-4 bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl outline-none focus:ring-4 focus:ring-blue-50 transition-all text-sm"
                 value={newOcc}
                 onChange={e => setNewOcc(e.target.value)}
                 onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addOccupation())}
               />
               <button type="button" onClick={addOccupation} className="bg-blue-600 text-white p-3.5 md:p-4 rounded-xl md:rounded-2xl hover:bg-blue-700 transition-colors shadow-lg">
                 {/* Fixed: Remove invalid 'md:size' prop and use tailwind for responsive sizing */}
                 <Plus className="w-5 h-5 md:w-6 md:h-6" />
               </button>
            </div>
          </div>

          {/* Section 4: Life Milestones */}
          <div className="space-y-4 md:space-y-6">
            <div className="flex items-center space-x-3">
              <Milestone className="text-amber-600 w-4 h-4 md:w-5 md:h-5" />
              <h3 className="font-bold text-slate-900 serif text-lg">Life Milestones</h3>
            </div>
            
            <div className="space-y-3 mb-6">
              {formData.lifeEvents?.map((event, i) => (
                <div key={i} className="bg-amber-50/50 p-3 md:p-4 rounded-xl md:rounded-2xl border border-amber-100 flex items-center justify-between shadow-sm">
                  <div className="flex items-center space-x-3 md:space-x-4">
                    <div className="bg-amber-600 text-white w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center text-[10px] md:text-xs font-bold">
                      {event.year}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-xs md:text-sm">{event.type} in {event.location}</p>
                      <p className="text-[9px] md:text-[10px] text-slate-500 truncate max-w-[150px] sm:max-w-none">{event.description}</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => removeMilestone(i)} className="text-rose-500 hover:bg-rose-50 p-2 rounded-lg transition-colors"><Trash2 size={16} /></button>
                </div>
              ))}
            </div>

            <div className="bg-slate-50 p-4 md:p-6 rounded-2xl md:rounded-[2rem] border border-slate-200 space-y-4 md:space-y-6">
               <div className="grid grid-cols-2 gap-3 md:gap-4">
                  <select 
                    className="px-4 md:px-6 py-3 md:py-4 bg-white border border-slate-200 rounded-xl md:rounded-2xl outline-none text-xs md:text-sm font-bold"
                    value={mType}
                    onChange={e => setMType(e.target.value as any)}
                  >
                    <option>Migration</option>
                    <option>Birth</option>
                    <option>Marriage</option>
                    <option>Military</option>
                    <option>Death</option>
                  </select>
                  <input 
                    type="number" placeholder="Year"
                    className="px-4 md:px-6 py-3 md:py-4 bg-white border border-slate-200 rounded-xl md:rounded-2xl outline-none text-xs md:text-sm font-bold"
                    value={mYear}
                    onChange={e => setMYear(e.target.value)}
                  />
               </div>
               <input 
                  type="text" placeholder="Location"
                  className="w-full px-4 md:px-6 py-3 md:py-4 bg-white border border-slate-200 rounded-xl md:rounded-2xl outline-none text-xs md:text-sm font-bold"
                  value={mLoc}
                  onChange={e => setMLoc(e.target.value)}
               />
               <textarea 
                  placeholder="Notes..."
                  className="w-full px-4 md:px-6 py-3 md:py-4 bg-white border border-slate-200 rounded-xl md:rounded-2xl outline-none text-xs md:text-sm font-medium h-20 md:h-24 resize-none"
                  value={mDesc}
                  onChange={e => setMDesc(e.target.value)}
               />
               <button type="button" onClick={addMilestone} className="w-full bg-amber-600 text-white py-3 md:py-4 rounded-xl md:rounded-2xl font-black uppercase tracking-widest text-[9px] md:text-[10px] hover:bg-amber-700 transition-all shadow-lg">
                 Add Milestone
               </button>
            </div>
          </div>

          {/* Section 5: Privacy */}
          <div className="space-y-4 md:space-y-6">
            <div className="flex items-center space-x-3">
              <Shield className="text-emerald-600 w-4 h-4 md:w-5 md:h-5" />
              <h3 className="font-bold text-slate-900 serif text-lg">Sharing Control</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
               {[
                 { level: 'Private', desc: 'Only you see this.' },
                 { level: 'Family Only', desc: 'Shared with tree.' },
                 { level: 'Public', desc: 'Helps discovery.' }
               ].map((item) => (
                 <button
                   key={item.level}
                   type="button"
                   onClick={() => setFormData({ ...formData, privacyLevel: item.level as any })}
                   className={`p-4 md:p-6 rounded-2xl border text-xs font-bold transition-all flex flex-col items-center space-y-1 md:space-y-2 ${formData.privacyLevel === item.level ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl' : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-200'}`}
                 >
                   <span>{item.level}</span>
                   <span className="text-[8px] md:text-[9px] font-medium opacity-60 uppercase tracking-tighter text-center">
                     {item.desc}
                   </span>
                 </button>
               ))}
            </div>
          </div>

          <div className="pt-6 md:pt-10 sticky bottom-0 bg-white/95 backdrop-blur-md pb-4 flex gap-3 md:gap-4">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-4 md:py-5 rounded-2xl md:rounded-3xl transition-all text-xs md:text-sm"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 md:py-5 rounded-2xl md:rounded-3xl transition-all shadow-2xl shadow-indigo-100 flex items-center justify-center space-x-2 md:space-x-3 text-xs md:text-sm"
            >
              <Fingerprint className="w-4 h-4 md:w-5 md:h-5" />
              <span>Save Relative</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddMemberModal;