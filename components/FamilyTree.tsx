
import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { FamilyMember } from '../types';
import { 
  Calendar, 
  MapPin, 
  Download, 
  MousePointer2, 
  User, 
  Share2, 
  Layers, 
  Disc, 
  Layout, 
  Maximize2, 
  ZoomIn, 
  ZoomOut,
  RefreshCw,
  Focus,
  History,
  ShieldCheck,
  Award,
  Fingerprint,
  RotateCcw,
  Target,
  Search
} from 'lucide-react';

interface FamilyTreeProps {
  members: FamilyMember[];
}

type VizMode = 'horizontal' | 'radial' | 'treemap';

const FamilyTree: React.FC<FamilyTreeProps> = ({ members }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [vizMode, setVizMode] = useState<VizMode>('horizontal');
  const [focusedMember, setFocusedMember] = useState<FamilyMember | null>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const gRef = useRef<SVGGElement | null>(null);

  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    member: FamilyMember | null;
  }>({
    visible: false,
    x: 0,
    y: 0,
    member: null
  });

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(members, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `heritage_ledger_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const resetView = useCallback(() => {
    if (svgRef.current && zoomBehaviorRef.current) {
      const svg = d3.select(svgRef.current);
      svg.transition()
        .duration(1200)
        .ease(d3.easeCubicInOut)
        .call(zoomBehaviorRef.current.transform, d3.zoomIdentity);
    }
  }, []);

  const zoomIn = () => {
    if (svgRef.current && zoomBehaviorRef.current) {
      d3.select(svgRef.current).transition().duration(500).call(zoomBehaviorRef.current.scaleBy, 1.4);
    }
  };

  const zoomOut = () => {
    if (svgRef.current && zoomBehaviorRef.current) {
      d3.select(svgRef.current).transition().duration(500).call(zoomBehaviorRef.current.scaleBy, 0.7);
    }
  };

  const centerOnNode = (x: number, y: number, scale = 1.2) => {
    if (svgRef.current && zoomBehaviorRef.current && containerRef.current) {
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      const svg = d3.select(svgRef.current);

      svg.transition()
        .duration(1200)
        .ease(d3.easeCubicInOut)
        .call(
          zoomBehaviorRef.current.transform,
          d3.zoomIdentity
            .translate(width / 2, height / 2)
            .scale(scale)
            .translate(-x, -y)
        );
    }
  };

  useEffect(() => {
    if (!svgRef.current || members.length === 0 || !containerRef.current) return;

    const svgElement = d3.select(svgRef.current);
    svgElement.selectAll('*').remove();

    const width = containerRef.current.clientWidth;
    const height = 700;
    const margin = { top: 80, right: 180, bottom: 80, left: 180 };

    const defs = svgElement.append('defs');
    
    const filter = defs.append('filter')
      .attr('id', 'heritage-shadow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');
    filter.append('feGaussianBlur').attr('in', 'SourceAlpha').attr('stdDeviation', 6);
    filter.append('feOffset').attr('dx', 0).attr('dy', 5).attr('result', 'offsetblur');
    filter.append('feComponentTransfer').append('feFuncA').attr('type', 'linear').attr('slope', 0.25);
    const merge = filter.append('feMerge');
    merge.append('feMergeNode');
    merge.append('feMergeNode').attr('in', 'SourceGraphic');

    members.forEach(member => {
      const pattern = defs.append('pattern')
        .attr('id', `heritage-img-${member.id}`)
        .attr('patternUnits', 'objectBoundingBox')
        .attr('width', 1)
        .attr('height', 1);

      pattern.append('rect')
        .attr('width', '100%')
        .attr('height', '100%')
        .attr('fill', '#f1f5f9');

      if (member.imageUrl) {
        pattern.append('image')
          .attr('xlink:href', member.imageUrl)
          .attr('width', 200)
          .attr('height', 200)
          .attr('preserveAspectRatio', 'xMidYMid slice');
      } else {
        pattern.append('rect')
          .attr('width', '100%')
          .attr('height', '100%')
          .attr('fill', '#4f46e5');
      }
    });

    const zoomGroup = svgElement
      .attr('width', width)
      .attr('height', height)
      .append('g');
    
    gRef.current = zoomGroup.node();

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 5])
      .on('zoom', (event) => {
        zoomGroup.attr('transform', event.transform);
      });

    zoomBehaviorRef.current = zoom;
    svgElement.call(zoom as any);

    const stratify = d3.stratify<FamilyMember>()
      .id(d => d.id)
      .parentId(d => d.parentId);

    let root: d3.HierarchyNode<FamilyMember>;
    try {
      const stratifiedData = stratify(members);
      root = d3.hierarchy(stratifiedData);
    } catch (e) {
      console.warn("Ledger stratification requires a valid parent-child structure.");
      return;
    }

    root.count();

    // Unified transition timing for a polished feel
    const t = svgElement.transition().duration(1200).ease(d3.easeCubicInOut);

    if (vizMode === 'treemap') {
      const treemap = d3.treemap<d3.HierarchyNode<FamilyMember>>()
        .size([width - margin.left - margin.right, height - margin.top - margin.bottom])
        .paddingOuter(32)
        .paddingTop(48)
        .paddingInner(16)
        .round(true);

      treemap(root as any);

      const nodes = zoomGroup.selectAll('.treemap-node')
        .data(root.descendants())
        .enter()
        .append('g')
        .attr('class', 'treemap-node cursor-pointer group')
        .attr('transform', (d: any) => `translate(${d.x0 + margin.left},${d.y0 + margin.top})`)
        .style('opacity', 0)
        .on('click', (event, d: any) => {
           setFocusedMember(d.data.data);
           centerOnNode(d.x0 + (d.x1 - d.x0) / 2 + margin.left, d.y0 + (d.y1 - d.y0) / 2 + margin.top, 1.5);
        })
        .on('mouseenter', (event, d: any) => {
           setTooltip({ visible: true, x: event.pageX, y: event.pageY, member: d.data.data });
        })
        .on('mousemove', (event) => {
           setTooltip(prev => ({ ...prev, x: event.pageX, y: event.pageY }));
        })
        .on('mouseleave', () => setTooltip(prev => ({ ...prev, visible: false })));

      nodes.transition(t).style('opacity', 1);

      nodes.append('rect')
        .attr('width', (d: any) => Math.max(0, d.x1 - d.x0))
        .attr('height', (d: any) => Math.max(0, d.y1 - d.y0))
        .attr('fill', (d: any) => d.data.data.imageUrl ? `url(#heritage-img-${d.data.data.id})` : '#1e1b4b')
        .attr('rx', 20)
        .attr('stroke', '#fff')
        .attr('stroke-width', 3)
        .style('filter', 'url(#heritage-shadow)');

      nodes.append('rect')
        .attr('width', (d: any) => Math.max(0, d.x1 - d.x0))
        .attr('height', (d: any) => Math.max(0, d.y1 - d.y0))
        .attr('fill', 'rgba(15, 23, 42, 0.4)')
        .attr('rx', 20);

      nodes.append('text')
        .attr('x', 20)
        .attr('y', 36)
        .text((d: any) => d.data.data.name)
        .attr('class', 'text-sm font-bold fill-white serif pointer-events-none');

      svgElement.transition(t).call(zoom.transform as any, d3.zoomIdentity);

    } else if (vizMode === 'radial') {
      const radius = Math.min(width, height) / 2 - 140;
      const tree = d3.tree<d3.HierarchyNode<FamilyMember>>()
        .size([2 * Math.PI, radius])
        .separation((a, b) => (a.parent === b.parent ? 1.2 : 2) / a.depth);

      tree(root as any);

      const radialGroup = zoomGroup.append('g')
        .attr('transform', `translate(${width / 2},${height / 2})`);

      radialGroup.selectAll('.link')
        .data(root.links())
        .enter()
        .append('path')
        .attr('class', 'link')
        .attr('d', d3.linkRadial()
          .angle((d: any) => d.x)
          .radius((d: any) => d.y) as any)
        .attr('fill', 'none')
        .attr('stroke', 'rgba(79, 70, 229, 0.2)')
        .attr('stroke-width', 2.5)
        .attr('stroke-dasharray', '10,5')
        .style('opacity', 0)
        .transition(t)
        .style('opacity', 1);

      const nodes = radialGroup.selectAll('.node')
        .data(root.descendants())
        .enter()
        .append('g')
        .attr('transform', (d: any) => `rotate(${(d.x * 180) / Math.PI - 90}) translate(${d.y},0)`)
        .style('opacity', 0)
        .on('click', (event, d: any) => {
           setFocusedMember(d.data.data);
           const cx = width / 2 + d.y * Math.cos(d.x - Math.PI / 2);
           const cy = height / 2 + d.y * Math.sin(d.x - Math.PI / 2);
           centerOnNode(cx, cy, 1.8);
        })
        .on('mouseenter', (event, d: any) => {
           setTooltip({ visible: true, x: event.pageX, y: event.pageY, member: d.data.data });
        })
        .on('mousemove', (event) => {
           setTooltip(prev => ({ ...prev, x: event.pageX, y: event.pageY }));
        })
        .on('mouseleave', () => setTooltip(prev => ({ ...prev, visible: false })));

      nodes.transition(t).style('opacity', 1);

      nodes.append('circle')
        .attr('r', 32)
        .attr('fill', (d: any) => d.data.data.imageUrl ? `url(#heritage-img-${d.data.data.id})` : '#4f46e5')
        .attr('stroke', '#fff')
        .attr('stroke-width', 4)
        .style('filter', 'url(#heritage-shadow)');

      nodes.append('text')
        .attr('transform', (d: any) => d.x < Math.PI ? 'rotate(0) translate(44, 6)' : 'rotate(180) translate(-44, 6)')
        .attr('text-anchor', (d: any) => d.x < Math.PI ? 'start' : 'end')
        .text((d: any) => d.data.data.name)
        .attr('class', 'text-[12px] font-bold fill-slate-900 serif pointer-events-none');

      svgElement.transition(t).call(zoom.transform as any, d3.zoomIdentity.translate(0, 0).scale(0.85));

    } else {
      const treeLayout = d3.tree<d3.HierarchyNode<FamilyMember>>()
        .size([height - margin.top - margin.bottom, width - margin.left - margin.right - 150]);
      
      treeLayout(root as any);

      const treeGroup = zoomGroup.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      treeGroup.selectAll('.link')
        .data(root.links())
        .enter()
        .append('path')
        .attr('class', 'link')
        .attr('d', d3.linkHorizontal()
          .x((d: any) => d.y)
          .y((d: any) => d.x) as any)
        .attr('fill', 'none')
        .attr('stroke', 'rgba(79, 70, 229, 0.15)')
        .attr('stroke-width', 3.5)
        .style('opacity', 0)
        .transition(t)
        .style('opacity', 1);

      const nodes = treeGroup.selectAll('.node')
        .data(root.descendants())
        .enter()
        .append('g')
        .attr('class', 'node cursor-pointer')
        .attr('transform', (d: any) => `translate(${d.y},${d.x})`)
        .style('opacity', 0)
        .on('click', (event, d: any) => {
           setFocusedMember(d.data.data);
           centerOnNode(d.y + margin.left, d.x + margin.top, 2);
        })
        .on('mouseenter', (event, d: any) => {
           setTooltip({ visible: true, x: event.pageX, y: event.pageY, member: d.data.data });
           d3.select(event.currentTarget).select('circle').transition().duration(400).attr('r', 48);
        })
        .on('mousemove', (event) => {
           setTooltip(prev => ({ ...prev, x: event.pageX, y: event.pageY }));
        })
        .on('mouseleave', (event) => {
           setTooltip(prev => ({ ...prev, visible: false }));
           d3.select(event.currentTarget).select('circle').transition().duration(400).attr('r', 40);
        });

      nodes.transition(t).style('opacity', 1);

      nodes.append('circle')
        .attr('r', 40)
        .attr('fill', (d: any) => d.data.data.imageUrl ? `url(#heritage-img-${d.data.data.id})` : '#4f46e5')
        .attr('stroke', '#fff')
        .attr('stroke-width', 5)
        .style('filter', 'url(#heritage-shadow)');

      nodes.append('text')
        .attr('dy', '0.35em')
        .attr('x', (d: any) => d.children ? -56 : 56)
        .style('text-anchor', (d: any) => d.children ? 'end' : 'start')
        .text((d: any) => d.data.data.name)
        .attr('class', 'text-lg font-bold fill-slate-900 serif pointer-events-none');

      nodes.append('text')
        .attr('dy', '1.9em')
        .attr('x', (d: any) => d.children ? -56 : 56)
        .style('text-anchor', (d: any) => d.children ? 'end' : 'start')
        .text((d: any) => d.data.data.relation.toUpperCase())
        .attr('class', 'text-[10px] font-black tracking-heritage fill-indigo-500 pointer-events-none');

      svgElement.transition(t).call(zoom.transform as any, d3.zoomIdentity.translate(100, 50).scale(0.7));
    }

  }, [members, vizMode]);

  return (
    <div className="space-y-12 view-enter" aria-label="Interactive family tree visualization">
      {/* View Orchestrator */}
      <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-8 px-4 animate-in slide-in-from-top-10 duration-700">
        <div className="flex bg-slate-900/5 backdrop-blur-3xl p-2.5 rounded-[2.5rem] border border-slate-200/50 w-fit">
          <button 
            onClick={() => { setVizMode('horizontal'); resetView(); }}
            className={`flex items-center space-x-3 px-10 py-5 rounded-[2rem] text-[11px] font-black uppercase tracking-heritage transition-all duration-500 ${vizMode === 'horizontal' ? 'bg-white text-indigo-600 shadow-xl' : 'text-slate-500 hover:text-indigo-600'}`}
          >
            <Layout size={18} />
            <span>Horizontal Map</span>
          </button>
          <button 
            onClick={() => { setVizMode('radial'); resetView(); }}
            className={`flex items-center space-x-3 px-10 py-5 rounded-[2rem] text-[11px] font-black uppercase tracking-heritage transition-all duration-500 ${vizMode === 'radial' ? 'bg-white text-indigo-600 shadow-xl' : 'text-slate-500 hover:text-indigo-600'}`}
          >
            <Disc size={18} />
            <span>Radial Core</span>
          </button>
          <button 
            onClick={() => { setVizMode('treemap'); resetView(); }}
            className={`flex items-center space-x-3 px-10 py-5 rounded-[2rem] text-[11px] font-black uppercase tracking-heritage transition-all duration-500 ${vizMode === 'treemap' ? 'bg-white text-indigo-600 shadow-xl' : 'text-slate-500 hover:text-indigo-600'}`}
          >
            <Layers size={18} />
            <span>Legacy Treemap</span>
          </button>
        </div>

        <div className="flex items-center gap-5">
           <button 
             onClick={handleExport}
             className="flex items-center space-x-3 bg-white border border-slate-200 text-slate-600 px-10 py-5 rounded-[2rem] text-[11px] font-black uppercase tracking-heritage hover:bg-slate-50 transition-all shadow-xl hover:-translate-y-1"
           >
             <Download size={18} />
             <span>Export Registry</span>
           </button>
           <button className="p-5 bg-indigo-600 text-white rounded-[2rem] shadow-2xl shadow-indigo-200 hover:scale-110 transition-transform active:scale-95">
             <Share2 size={24} />
           </button>
        </div>
      </div>

      <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div ref={containerRef} className="lg:col-span-8 bg-white rounded-[4.5rem] shadow-4xl border border-slate-100 overflow-hidden relative group h-[750px] perspective-1000 animate-in zoom-in duration-1000">
          <div className="absolute top-12 left-12 z-10 flex flex-col space-y-5">
            <div className="flex items-center space-x-4 bg-white/95 backdrop-blur-2xl px-8 py-4 rounded-3xl border border-slate-100 shadow-2xl">
               <div className="w-2.5 h-2.5 bg-indigo-600 rounded-full animate-ping"></div>
               <span className="text-[11px] font-black text-slate-800 uppercase tracking-heritage">Live Heritage Feed</span>
            </div>
            
            <div className="flex flex-col bg-white/95 backdrop-blur-2xl p-3 rounded-[2rem] border border-slate-100 shadow-2xl space-y-3 opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-x-[-10px] group-hover:translate-x-0">
              <button onClick={zoomIn} className="p-4 hover:bg-slate-50 rounded-2xl transition-all text-slate-600 hover:text-indigo-600 active:scale-90" title="Zoom In">
                <ZoomIn size={22} />
              </button>
              <button onClick={zoomOut} className="p-4 hover:bg-slate-50 rounded-2xl transition-all text-slate-600 hover:text-indigo-600 active:scale-90" title="Zoom Out">
                <ZoomOut size={22} />
              </button>
              <div className="h-px bg-slate-100 mx-3"></div>
              <button onClick={resetView} className="p-4 hover:bg-slate-50 rounded-2xl transition-all text-slate-600 hover:text-indigo-600 active:scale-90" title="Reset View">
                <RotateCcw size={22} />
              </button>
              <button onClick={() => { setFocusedMember(null); resetView(); }} className="p-4 hover:bg-slate-50 rounded-2xl transition-all text-slate-600 hover:text-indigo-600 active:scale-90" title="Center on Root">
                <Target size={22} />
              </button>
            </div>
          </div>
          
          <div className="absolute bottom-12 right-12 z-10 flex space-x-5 opacity-0 group-hover:opacity-100 transition-all duration-700 translate-y-6 group-hover:translate-y-0">
            <div className="bg-slate-900/95 backdrop-blur-3xl p-5 rounded-[2rem] flex items-center space-x-5 shadow-4xl border border-white/10">
               <MousePointer2 size={18} className="text-indigo-400" />
               <span className="text-[11px] font-black text-white uppercase tracking-heritage">Click to Inspect & Focus</span>
            </div>
          </div>

          <svg ref={svgRef} className="cursor-grab active:cursor-grabbing w-full h-full shutter-open"></svg>

          {tooltip.visible && tooltip.member && (
            <div 
              className="fixed z-[400] pointer-events-none transform -translate-x-1/2 -translate-y-[120%] animate-in fade-in zoom-in slide-in-from-bottom-8 duration-500"
              style={{ left: tooltip.x, top: tooltip.y }}
            >
              <div className="bg-slate-950/95 backdrop-blur-3xl text-white p-10 rounded-[4rem] shadow-5xl border border-white/10 w-80 overflow-hidden relative">
                <div className="absolute top-0 right-0 p-10 opacity-5">
                   <Fingerprint size={140} />
                </div>
                <div className="flex items-center space-x-7 mb-8 pb-8 border-b border-white/10 relative z-10">
                  <div className="w-24 h-24 bg-white/5 rounded-[2rem] flex items-center justify-center text-3xl font-bold shrink-0 overflow-hidden border border-white/10 shadow-3xl">
                    {tooltip.member.imageUrl ? (
                        <img src={tooltip.member.imageUrl} alt={tooltip.member.name} className="w-full h-full object-cover" />
                    ) : (
                        <User className="w-12 h-12 opacity-30 text-indigo-400" />
                    )}
                  </div>
                  <div className="overflow-hidden space-y-2">
                    <h4 className="font-bold text-2xl truncate serif tracking-tight">{tooltip.member.name}</h4>
                    <p className="text-indigo-400 text-[11px] font-black uppercase tracking-heritage">{tooltip.member.relation}</p>
                  </div>
                </div>
                <div className="space-y-5 relative z-10">
                  <div className="flex items-center text-sm text-slate-300 font-bold">
                    <Calendar className="w-5 h-5 mr-5 text-indigo-500" />
                    <span>{tooltip.member.birthDate || 'Temporal Node Undefined'}</span>
                  </div>
                  <div className="flex items-center text-sm text-slate-300 font-bold">
                    <MapPin className="w-5 h-5 mr-5 text-indigo-500" />
                    <span className="truncate">{tooltip.member.location || 'Spatial Node Undefined'}</span>
                  </div>
                </div>
              </div>
              <div className="w-8 h-8 bg-slate-950/95 rotate-45 mx-auto -mt-4 border-r border-b border-white/10 shadow-5xl"></div>
            </div>
          )}
        </div>

        {/* Intelligence Sidebar */}
        <div className="lg:col-span-4 space-y-10 h-full animate-in slide-in-from-right-10 duration-1000">
           <div className="bg-slate-900 rounded-[4.5rem] p-16 text-white shadow-4xl flex flex-col h-full relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-16 opacity-5 -mr-24 -mt-24 group-hover:scale-110 transition-transform duration-1200">
                <History size={400} />
              </div>

              <div className="relative z-10 flex flex-col h-full space-y-12">
                 <div className="flex items-center justify-between">
                    <div className="bg-white/10 p-5 rounded-[2rem] border border-white/10">
                       <Focus className="w-10 h-10 text-indigo-400" />
                    </div>
                    <span className="text-[11px] font-black uppercase tracking-heritage opacity-40">Linage Inspector</span>
                 </div>

                 {focusedMember ? (
                    <div className="space-y-12 animate-in fade-in slide-in-from-right-10 duration-700">
                       <div className="space-y-6">
                          <h3 className="text-6xl font-extrabold serif tracking-tighter leading-[0.9]">{focusedMember.name}</h3>
                          <div className="flex items-center space-x-4">
                             <span className="bg-indigo-600 px-6 py-3 rounded-full text-[11px] font-black uppercase tracking-heritage">{focusedMember.relation}</span>
                             <span className="text-[11px] font-black uppercase tracking-heritage opacity-40">{focusedMember.privacyLevel}</span>
                          </div>
                       </div>
                       
                       <div className="space-y-8 bg-white/5 p-10 rounded-[3rem] border border-white/10 shadow-inner">
                          <div className="flex items-center space-x-5">
                             <MapPin className="w-6 h-6 text-indigo-400" />
                             <div>
                                <p className="text-[11px] font-black uppercase tracking-heritage opacity-40">Current Node</p>
                                <p className="font-bold text-xl">{focusedMember.location || 'Unknown'}</p>
                             </div>
                          </div>
                          <div className="flex items-center space-x-5">
                             <RefreshCw className="w-6 h-6 text-emerald-400" />
                             <div>
                                <p className="text-[11px] font-black uppercase tracking-heritage opacity-40">Integrity Score</p>
                                <p className="font-bold text-xl">94.2% Verified</p>
                             </div>
                          </div>
                       </div>

                       <div className="space-y-6">
                          <p className="text-base text-slate-400 leading-relaxed italic pr-4">
                             "{focusedMember.notes || 'No archival notes present for this ledger node.'}"
                          </p>
                          <button 
                            onClick={() => { setFocusedMember(null); resetView(); }}
                            className="w-full bg-white text-slate-900 font-extrabold py-7 rounded-[2.5rem] hover:bg-slate-100 transition-all flex items-center justify-center space-x-4 shadow-3xl group/btn active:scale-95"
                          >
                             <RotateCcw className="w-5 h-5 group-hover/btn:rotate-[-90deg] transition-transform" />
                             <span>Clear Focus</span>
                          </button>
                       </div>
                    </div>
                 ) : (
                    <div className="flex-grow flex flex-col items-center justify-center text-center space-y-8 opacity-40 animate-pulse">
                       <Search className="w-24 h-24 text-indigo-400" />
                       <div className="space-y-3">
                          <h4 className="text-2xl font-bold serif">System Idle</h4>
                          <p className="text-sm px-16 leading-relaxed">Select a lineage node in the visualization layer to inspect encrypted metadata.</p>
                       </div>
                    </div>
                 )}

                 <div className="mt-auto grid grid-cols-2 gap-6">
                    <div className="bg-white/5 p-8 rounded-[2rem] border border-white/10 text-center space-y-3 hover:bg-white/10 transition-colors">
                       <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto" />
                       <p className="text-[10px] font-black uppercase tracking-heritage opacity-60">GDPR Compliant</p>
                    </div>
                    <div className="bg-white/5 p-8 rounded-[2rem] border border-white/10 text-center space-y-3 hover:bg-white/10 transition-colors">
                       <Award className="w-8 h-8 text-indigo-400 mx-auto" />
                       <p className="text-[10px] font-black uppercase tracking-heritage opacity-60">Verified Link</p>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default FamilyTree;
