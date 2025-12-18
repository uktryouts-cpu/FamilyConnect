
import React, { useState, useEffect } from 'react';
import { ImagePlus, Edit3, Search, Wand2, Upload, Trash2, Maximize2, Loader2, Sparkles, MapPin, Video, Key, Download } from 'lucide-react';
import { generateFamilyPortrait, editFamilyPhoto, analyzePhoto, findAncestralPlaces, animateFamilyPhoto } from '../services/gemini';
import { MemoryItem, ChatMessage } from '../types';

const MemoryStudio: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'generate' | 'edit' | 'analyze' | 'video'>('generate');
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [resultVideo, setResultVideo] = useState<string | null>(null);
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<"1K" | "2K" | "4K">("1K");
  const [groundingInfo, setGroundingInfo] = useState<ChatMessage | null>(null);
  const [hasApiKey, setHasApiKey] = useState(false);

  useEffect(() => {
    const checkKey = async () => {
      const selected = await (window as any).aistudio?.hasSelectedApiKey?.();
      setHasApiKey(!!selected);
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    await (window as any).aistudio?.openSelectKey?.();
    setHasApiKey(true);
  };

  const handleGenerate = async () => {
    if (!prompt) return;
    setLoading(true);
    setLoadingMsg("Generating family legacy art...");
    try {
      if (!hasApiKey) await handleSelectKey();
      const img = await generateFamilyPortrait(prompt, selectedSize);
      setResultImage(img);
      setResultVideo(null);
      addMemory(img, prompt);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAnimate = async () => {
    if (!resultImage) return;
    setLoading(true);
    try {
      if (!hasApiKey) await handleSelectKey();
      const videoUrl = await animateFamilyPhoto(resultImage, prompt || "Subtle cinematic movement", (msg) => setLoadingMsg(msg));
      setResultVideo(videoUrl);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const addMemory = (url: string, caption: string) => {
    const newMemory: MemoryItem = {
      id: Date.now().toString(),
      type: 'image',
      url: url,
      caption: caption,
      timestamp: Date.now()
    };
    setMemories(prev => [newMemory, ...prev]);
  };

  const handleEdit = async () => {
    if (!resultImage || !prompt) return;
    setLoading(true);
    setLoadingMsg("Refining memory details...");
    const edited = await editFamilyPhoto(resultImage, prompt);
    if (edited) {
      setResultImage(edited);
      setResultVideo(null);
    }
    setLoading(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setResultImage(reader.result as string);
        setResultVideo(null);
        setAnalysisResult(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!resultImage) return;
    setLoading(true);
    setLoadingMsg("Analyzing visual cues...");
    const res = await analyzePhoto(resultImage);
    setAnalysisResult(res || "Analysis failed.");
    
    const locationPrompt = `Show me maps for locations related to this analysis: ${res?.slice(0, 200)}`;
    const mapsRes = await findAncestralPlaces(locationPrompt);
    setGroundingInfo(mapsRes);
    
    setLoading(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 serif">Memory Studio</h2>
          <p className="text-slate-500">Bring family history to life with advanced AI generation.</p>
        </div>
        <div className="flex flex-wrap bg-slate-100 p-1 rounded-2xl gap-1">
          {(['generate', 'edit', 'analyze', 'video'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl text-sm font-bold capitalize transition-all ${activeTab === tab ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {tab === 'video' ? <div className="flex items-center"><Video size={16} className="mr-1.5" />Video</div> : tab}
            </button>
          ))}
        </div>
      </div>

      {!hasApiKey && (
        <div className="bg-blue-600 rounded-2xl p-6 text-white flex flex-col md:flex-row items-center justify-between shadow-lg">
          <div className="flex items-center space-x-4 mb-4 md:mb-0">
            <Key size={32} className="opacity-80" />
            <div>
              <h4 className="font-bold">Unlock High-Performance AI</h4>
              <p className="text-sm text-blue-100">Video generation and 4K images require a paid project API key.</p>
            </div>
          </div>
          <button 
            onClick={handleSelectKey}
            className="bg-white text-blue-600 font-bold px-6 py-2.5 rounded-xl hover:bg-blue-50 transition-colors flex items-center"
          >
            Select API Key
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Workspace */}
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="relative aspect-square bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 overflow-hidden flex items-center justify-center shadow-inner">
            {resultVideo ? (
              <video src={resultVideo} controls autoPlay loop className="w-full h-full object-cover" />
            ) : resultImage ? (
              <img src={resultImage} alt="Workspace" className="w-full h-full object-cover" />
            ) : (
              <div className="text-center space-y-2 opacity-20">
                <ImagePlus size={64} className="mx-auto" />
                <p className="font-medium">Workspace Empty</p>
              </div>
            )}
            {loading && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-md flex flex-col items-center justify-center space-y-4 px-8 text-center">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
                  <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-400" />
                </div>
                <p className="text-blue-600 font-bold">{loadingMsg}</p>
                <p className="text-xs text-slate-400">Generative processes are compute intensive. Please wait.</p>
              </div>
            )}
          </div>

          <div className="space-y-4">
            {activeTab === 'generate' && (
              <div className="flex space-x-2">
                {(["1K", "2K", "4K"] as const).map(size => (
                  <button 
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${selectedSize === size ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-slate-200 text-slate-500'}`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            )}

            <div className="relative">
              <textarea 
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder={
                  activeTab === 'video' ? "How should this photo come to life?" :
                  activeTab === 'generate' ? "Describe a family portrait..." : 
                  "What adjustments would you like to make?"
                }
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 pr-12 outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={3}
              />
            </div>

            <div className="flex gap-3">
              {(activeTab === 'edit' || activeTab === 'analyze' || activeTab === 'video') && !resultImage && (
                <label className="bg-slate-900 text-white flex-grow flex items-center justify-center p-4 rounded-2xl cursor-pointer hover:bg-slate-800 transition-colors font-bold space-x-2">
                  <Upload size={20} />
                  <span>Upload Photo</span>
                  <input type="file" className="hidden" onChange={handleFileUpload}/>
                </label>
              )}

              {activeTab === 'generate' && (
                <button onClick={handleGenerate} className="flex-grow bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl shadow-lg transition-all flex items-center justify-center space-x-2">
                  <Wand2 size={20} /> <span>Create Heritage Art</span>
                </button>
              )}
              
              {activeTab === 'video' && resultImage && (
                <button onClick={handleAnimate} className="flex-grow bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center space-x-2 shadow-lg">
                  <Video size={20} /> <span>Animate with Veo</span>
                </button>
              )}

              {activeTab === 'edit' && resultImage && (
                <button onClick={handleEdit} className="flex-grow bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center space-x-2 shadow-lg">
                  <Edit3 size={20} /> <span>Refine Memory</span>
                </button>
              )}

              {activeTab === 'analyze' && resultImage && (
                <button onClick={handleAnalyze} className="flex-grow bg-amber-600 hover:bg-amber-700 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center space-x-2 shadow-lg">
                  <Search size={20} /> <span>Decode Photograph</span>
                </button>
              )}

              {resultImage && (
                <button onClick={() => { setResultImage(null); setResultVideo(null); }} className="p-4 bg-rose-50 text-rose-600 rounded-2xl hover:bg-rose-100 transition-colors">
                  <Trash2 size={24} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Results Section */}
        <div className="space-y-6">
          {analysisResult ? (
             <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm animate-in slide-in-from-right-4 h-full flex flex-col">
                <h3 className="font-bold text-slate-800 flex items-center space-x-2 mb-4 shrink-0">
                   <Sparkles className="text-amber-500 w-5 h-5" />
                   <span>Genealogical Insights</span>
                </h3>
                <div className="prose prose-slate text-slate-600 text-sm leading-relaxed overflow-y-auto pr-4 flex-grow">
                   {analysisResult}
                </div>
                {groundingInfo && groundingInfo.groundingLinks && groundingInfo.groundingLinks.length > 0 && (
                   <div className="mt-6 pt-6 border-t border-slate-100 space-y-3 shrink-0">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Maps Discovery</p>
                      {groundingInfo.groundingLinks.map((l, i) => (
                         <a key={i} href={l.uri} target="_blank" className="flex items-center p-3 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 transition-colors">
                            <MapPin className="w-4 h-4 mr-2" />
                            <span className="text-sm font-medium truncate">{l.title}</span>
                            <Maximize2 className="w-3 h-3 ml-auto opacity-50" />
                         </a>
                      ))}
                   </div>
                )}
             </div>
          ) : resultVideo ? (
            <div className="bg-slate-900 rounded-3xl p-8 text-white h-full flex flex-col items-center justify-center text-center space-y-6">
               <Video size={64} className="text-indigo-400" />
               <div className="space-y-2">
                 <h3 className="text-xl font-bold">A Legacy in Motion</h3>
                 <p className="text-slate-400 text-sm">Your photo has been successfully animated using Veo AI.</p>
               </div>
               <a 
                 href={resultVideo} 
                 download="family-memory.mp4" 
                 className="bg-white text-slate-900 font-bold px-8 py-3 rounded-2xl flex items-center space-x-2 hover:bg-slate-100 transition-colors"
               >
                 <Download size={20} />
                 <span>Download Video</span>
               </a>
            </div>
          ) : (
            <div className="bg-slate-50 rounded-3xl p-8 border border-slate-200 border-dashed h-full flex items-center justify-center text-center">
              <div className="max-w-xs space-y-4 opacity-30">
                <Sparkles size={48} className="mx-auto" />
                <p className="font-medium">Studio results will be displayed here as you build your collection.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MemoryStudio;
