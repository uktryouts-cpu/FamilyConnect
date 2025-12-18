
import React from 'react';
import { FamilyMember } from '../types';
import { MapPin, Clock, ArrowRight, Globe } from 'lucide-react';

interface MigrationTimelineProps {
  members: FamilyMember[];
}

const MigrationTimeline: React.FC<MigrationTimelineProps> = ({ members }) => {
  const getYear = (dateStr: string) => {
    const match = dateStr.match(/\d{4}/);
    return match ? parseInt(match[0]) : 0;
  };

  const sortedMembers = [...members].sort((a, b) => getYear(a.birthDate) - getYear(b.birthDate));

  return (
    <div className="max-w-5xl mx-auto py-20 px-6 space-y-16 animate-in fade-in duration-1000">
      <div className="text-center space-y-4">
        <h2 className="text-6xl font-extrabold text-slate-900 serif tracking-tighter">Migration <span className="gradient-text-hope italic">Pulse.</span></h2>
        <p className="text-slate-500 max-w-xl mx-auto text-xl font-medium leading-relaxed">Tracing geographic trajectories through time and space.</p>
      </div>

      {members.length === 0 ? (
        <div className="py-20 text-center glass-panel rounded-[3rem] border-2 border-dashed border-slate-200 opacity-40">
           <Globe size={64} className="mx-auto mb-6 text-slate-300" />
           <p className="text-xl font-bold text-slate-400 serif">Ledger Timeline Empty</p>
           <p className="text-sm text-slate-400">Add nodes to visualize the migration journey.</p>
        </div>
      ) : (
        <div className="relative space-y-24">
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-indigo-100 hidden md:block"></div>
          {sortedMembers.map((member, idx) => (
            <div key={member.id} className={`flex flex-col md:flex-row items-center gap-12 ${idx % 2 === 0 ? '' : 'md:flex-row-reverse'}`}>
              <div className="flex-1 space-y-6">
                <div className="glass-panel p-10 rounded-[3rem] border border-white/60 shadow-xl hover:shadow-2xl transition-all">
                  <h4 className="text-2xl font-bold text-slate-900 serif">{member.name}</h4>
                  <div className="flex items-center text-slate-400 text-sm font-medium mt-2">
                    <Clock size={16} className="mr-2" />
                    <span>{member.birthDate || 'Timeline Node Unknown'}</span>
                  </div>
                </div>
              </div>
              <div className="relative flex items-center justify-center">
                <div className="w-12 h-12 bg-white rounded-full border-4 border-indigo-600 z-10 shadow-lg"></div>
              </div>
              <div className="flex-1">
                 <div className="flex items-center space-x-5 text-indigo-600 font-black">
                    <MapPin size={24} className="shrink-0 animate-bounce" />
                    <span className="text-3xl serif tracking-tight text-slate-900">{member.location || 'Undisclosed Spatial Hub'}</span>
                 </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MigrationTimeline;
