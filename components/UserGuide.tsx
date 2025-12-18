
import React from 'react';
import { X, Heart, Shield, Cpu, ArrowRight, Fingerprint } from 'lucide-react';

interface UserGuideProps {
  onClose: () => void;
}

const UserGuide: React.FC<UserGuideProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md">
      <div className="bg-white w-full max-w-4xl rounded-[4rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-500 max-h-[90vh] flex flex-col">
        <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center space-x-4">
            <div className="bg-indigo-600 p-3 rounded-2xl shadow-xl shadow-indigo-100">
              <Heart className="text-white w-6 h-6" />
            </div>
            <h2 className="text-3xl font-bold text-slate-900 serif">Heritage Guide</h2>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-slate-200 rounded-2xl transition-all">
            <X className="w-6 h-6 text-slate-500" />
          </button>
        </div>

        <div className="flex-grow overflow-y-auto p-12 space-y-16 custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h3 className="text-4xl font-bold serif text-slate-900 leading-tight">Your Private Vault</h3>
              <p className="text-slate-500 text-lg leading-relaxed">
                Data is encrypted locally with your <strong>Master Key</strong>. If lost, your data stays private and inaccessible forever.
              </p>
            </div>
            <div className="bg-slate-50 rounded-[3rem] p-10 flex items-center justify-center border border-slate-100 shadow-inner">
               <Shield size={64} className="text-emerald-600" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="bg-slate-50 rounded-[3rem] p-10 flex items-center justify-center border border-slate-100 shadow-inner order-2 md:order-1">
               <Cpu size={64} className="text-indigo-600" />
            </div>
            <div className="space-y-6 order-1 md:order-2">
              <h3 className="text-4xl font-bold serif text-slate-900 leading-tight">The Sentinel</h3>
              <p className="text-slate-500 text-lg leading-relaxed">
                An autonomous historian working 24/7 to scan global records and find potential relative matches while you are offline.
              </p>
            </div>
          </div>
        </div>

        <div className="p-10 bg-slate-900 text-white flex flex-col md:flex-row items-center justify-between">
           <p className="text-lg font-medium mb-6 md:mb-0">Ready to begin your exploration?</p>
           <button 
             onClick={onClose}
             className="bg-indigo-600 px-10 py-5 rounded-2xl font-bold flex items-center space-x-3 hover:scale-105 transition-all shadow-xl"
           >
             <span>Start Journey</span>
             <ArrowRight size={20} />
           </button>
        </div>
      </div>
    </div>
  );
};

export default UserGuide;
