
import React from 'react';
import { FamilyMember } from '../types';
import { Globe, MapPin, Navigation } from 'lucide-react';

interface GeographicDistributionProps {
  members: FamilyMember[];
}

const GeographicDistribution: React.FC<GeographicDistributionProps> = ({ members }) => {
  const locations = members.reduce((acc, member) => {
    const loc = member.location || 'Unknown';
    acc[loc] = (acc[loc] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const sortedLocations = (Object.entries(locations) as [string, number][]).sort((a, b) => b[1] - a[1]);

  return (
    <div className="max-w-4xl mx-auto py-20 px-6 space-y-12 animate-in fade-in duration-1000">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center space-x-3 bg-indigo-50 text-indigo-600 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-100">
          <Globe size={14} className="animate-spin-slow" />
          <span>Global Presence Map</span>
        </div>
        <h2 className="text-6xl font-extrabold text-slate-900 serif tracking-tighter">Heritage <span className="gradient-text-hope italic">Heatmap.</span></h2>
        <p className="text-slate-500 max-w-xl mx-auto text-xl font-medium leading-relaxed">Quantifying the spatial density of your lineage across continents.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div className="glass-panel p-10 rounded-[3rem] border border-white/60 shadow-xl space-y-8">
          <div className="flex items-center space-x-4">
            <Navigation className="text-indigo-600 w-6 h-6" />
            <h3 className="text-2xl font-bold serif">Primary Hubs</h3>
          </div>
          <div className="space-y-6">
            {members.length === 0 ? (
               <div className="py-12 text-center text-slate-400 text-sm italic">Initialize the ledger to map hubs.</div>
            ) : sortedLocations.map(([loc, count], idx) => (
              <div key={loc} className="flex items-center justify-between group">
                <div className="flex items-center space-x-4">
                  <span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    {idx + 1}
                  </span>
                  <span className="text-slate-700 font-bold">{loc}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="h-2 bg-indigo-100 rounded-full w-24 overflow-hidden">
                    <div 
                      className="h-full bg-indigo-600" 
                      style={{ width: `${members.length > 0 ? (count / members.length) * 100 : 0}%` }}
                    ></div>
                  </div>
                  <span className="text-xs font-black text-indigo-600">{count} Nodes</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col justify-center space-y-8 bg-slate-950 rounded-[3rem] p-12 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-12 opacity-5 -mr-16 -mt-16">
            <Globe size={300} />
          </div>
          <div className="relative z-10 space-y-6">
            <MapPin size={48} className="text-indigo-400 animate-bounce" />
            <h4 className="text-3xl font-bold serif leading-tight">Spatial Summary</h4>
            <p className="text-indigo-100/60 leading-relaxed">
              Your family's geographic footprint spans <strong>{Object.keys(locations).length} unique nodes</strong>.
              {sortedLocations.length > 0 && (
                <> The highest density is concentrated in <strong>{sortedLocations[0][0]}</strong>.</>
              )}
            </p>
            <div className="pt-6 grid grid-cols-2 gap-4">
              <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                <p className="text-[9px] font-black uppercase tracking-heritage text-indigo-400">Total Reach</p>
                <p className="text-2xl font-bold">{members.length} Members</p>
              </div>
              <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                <p className="text-[9px] font-black uppercase tracking-heritage text-indigo-400">Hub Density</p>
                <p className="text-2xl font-bold">
                  {members.length > 0 && sortedLocations.length > 0 
                    ? Math.round((sortedLocations[0][1] / members.length) * 100) 
                    : 0}%
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GeographicDistribution;
