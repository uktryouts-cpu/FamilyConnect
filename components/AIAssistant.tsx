
import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Mic, MicOff, Send, X, ExternalLink, Sparkles, BrainCircuit, Play, Volume2, UserCircle, Users } from 'lucide-react';
import { chatWithSearch, transcribeAudio, speakFamilyStory, solveAncestryPuzzle, chatWithAncestorPersona } from '../services/gemini';
import { LiveAncestrySession } from '../services/live-api';
import { ChatMessage, FamilyMember } from '../types';
import { loadFamilyData } from '../utils/storage';

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const AIAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'chat' | 'live' | 'persona' | 'select-persona'>('chat');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState<FamilyMember | null>(null);
  const [availableMembers, setAvailableMembers] = useState<FamilyMember[]>([]);
  
  const liveSession = useRef<LiveAncestrySession | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  useEffect(() => {
    // Brittle method for MVP context retrieval, improved with props in larger scale
    const inputs = document.querySelectorAll('input[type="password"]');
    const keyInput = inputs[inputs.length - 1] as HTMLInputElement;
    if (keyInput?.value) {
        const data = loadFamilyData(keyInput.value);
        if (data) setAvailableMembers(data);
    }
  }, [isOpen]);

  const handleSend = async (textOverride?: string) => {
    const text = textOverride || input;
    if (!text.trim()) return;
    
    const userMsg: ChatMessage = { role: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      let response: ChatMessage;
      if (mode === 'persona' && selectedPersona) {
         response = await chatWithAncestorPersona(selectedPersona, text, messages);
      } else if (text.toLowerCase().includes('puzzle') || text.toLowerCase().includes('think')) {
         const result = await solveAncestryPuzzle(text);
         response = { role: 'model', text: result || '' };
      } else {
         response = await chatWithSearch(text);
      }
      setMessages(prev => [...prev, response]);
    } catch (e) {
      console.error(e);
      setMessages(prev => [...prev, { role: 'model', text: 'Archives connectivity interrupted.' }]);
    } finally {
      setLoading(false);
    }
  };

  const toggleRecording = async () => {
    if (isRecording) {
      mediaRecorder.current?.stop();
      setIsRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder.current = new MediaRecorder(stream);
        chunks.current = [];
        mediaRecorder.current.ondataavailable = (e) => chunks.current.push(e.data);
        mediaRecorder.current.onstop = async () => {
          const blob = new Blob(chunks.current, { type: 'audio/wav' });
          const reader = new FileReader();
          reader.readAsDataURL(blob);
          reader.onloadend = async () => {
            const base64 = (reader.result as string).split(',')[1];
            setLoading(true);
            const transcript = await transcribeAudio(base64);
            if (transcript) handleSend(transcript);
            setLoading(false);
          };
        };
        mediaRecorder.current.start();
        setIsRecording(true);
      } catch (err) {
        console.error("Mic access denied", err);
      }
    }
  };

  const playTTS = async (text: string) => {
    try {
      const audioBytes = await speakFamilyStory(text);
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
      const buffer = await decodeAudioData(audioBytes, audioContext, 24000, 1);
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContext.destination);
      source.start();
    } catch (e) {
      console.error("TTS failed", e);
    }
  };

  const startLive = () => {
    setMode('live');
    liveSession.current = new LiveAncestrySession();
    liveSession.current.start();
  };

  const stopLive = () => {
    liveSession.current?.stop();
    setMode('chat');
  };

  const selectPersona = (member: FamilyMember) => {
    setSelectedPersona(member);
    setMode('persona');
    setMessages([{ role: 'model', text: `Greetings. I am ${member.name}. What shall we explore about our heritage?` }]);
  };

  if (!isOpen) {
    return (
      <button onClick={() => setIsOpen(true)} className="fixed bottom-4 right-4 md:bottom-6 md:right-6 w-14 h-14 md:w-16 md:h-16 bg-indigo-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-[140] group">
        <Sparkles className="w-7 h-7 md:w-8 md:h-8 group-hover:rotate-12 transition-transform" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-0 right-0 md:bottom-6 md:right-6 w-full md:w-96 h-full md:h-[600px] bg-white md:rounded-3xl shadow-5xl flex flex-col border border-slate-200 z-[300] overflow-hidden animate-in slide-in-from-bottom-10">
      <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
        <div className="flex items-center space-x-2">
          {mode === 'persona' ? <UserCircle className="w-5 h-5 text-indigo-400" /> : <BrainCircuit className="w-5 h-5 text-indigo-400" />}
          <h3 className="font-bold truncate max-w-[120px] md:max-w-[150px]">{mode === 'persona' ? selectedPersona?.name : 'Ancestry Assistant'}</h3>
        </div>
        <div className="flex items-center space-x-2">
          {mode === 'chat' ? (
            <div className="flex items-center space-x-1 md:space-x-2">
              <button onClick={() => setMode('select-persona')} className="text-[8px] md:text-[10px] bg-white/10 px-2 md:px-3 py-1.5 rounded-full hover:bg-white/20 transition-all flex items-center"><Users className="w-3 h-3 mr-1" /> Persona</button>
              <button onClick={startLive} className="text-[8px] md:text-[10px] bg-indigo-600 px-2 md:px-3 py-1.5 rounded-full flex items-center hover:bg-indigo-700 transition-all"><Play className="w-3 h-3 mr-1" /> Live</button>
            </div>
          ) : (
            <button onClick={() => { stopLive(); setMode('chat'); setSelectedPersona(null); setMessages([]); }} className="text-[10px] md:text-xs bg-slate-700 px-2 py-1 rounded-full hover:bg-slate-600">Back</button>
          )}
          <button onClick={() => setIsOpen(false)} className="ml-1 md:ml-2 p-1"><X className="w-5 h-5" /></button>
        </div>
      </div>

      <div className="flex-grow overflow-y-auto p-4 space-y-4 bg-slate-50/30 custom-scrollbar">
        {mode === 'select-persona' ? (
           <div className="space-y-4">
              <p className="text-[10px] md:text-xs font-black uppercase tracking-heritage text-slate-400 mb-4 md:mb-6">Select an Ancestor Persona</p>
              {availableMembers.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-sm">Add members to tree for persona interactions.</div>
              ) : (
                availableMembers.map(m => (
                  <button key={m.id} onClick={() => selectPersona(m)} className="w-full flex items-center p-3 md:p-4 bg-white border border-slate-200 rounded-2xl hover:border-indigo-500 transition-all text-left shadow-sm hover:shadow-md">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-indigo-100 rounded-xl mr-3 md:mr-4 flex items-center justify-center overflow-hidden shrink-0">
                       {m.imageUrl ? <img src={m.imageUrl} className="w-full h-full object-cover" /> : <UserCircle className="text-indigo-400 w-6 h-6 md:w-8 md:h-8" />}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-sm md:text-base">{m.name}</p>
                      <p className="text-[8px] md:text-[10px] font-black uppercase text-indigo-500">{m.relation}</p>
                    </div>
                  </button>
                ))
              )}
           </div>
        ) : mode === 'live' ? (
          <div className="h-full flex flex-col items-center justify-center space-y-4">
             <div className="w-20 h-20 md:w-24 md:h-24 bg-indigo-100 rounded-full flex items-center justify-center animate-pulse"><Mic className="w-8 h-8 md:w-10 md:h-10 text-indigo-600" /></div>
             <p className="text-slate-500 font-medium text-sm md:text-base">Real-time Session Active</p>
          </div>
        ) : (
          <>
            {messages.length === 0 && (
              <div className="text-center py-10 md:py-16 opacity-40">
                <Sparkles size={40} className="mx-auto mb-4 text-indigo-400 md:w-12 md:h-12" />
                <p className="text-xs md:text-sm font-bold">Ask about lineage or history.</p>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                <div className={`max-w-[90%] md:max-w-[85%] p-3 md:p-4 rounded-2xl ${m.role === 'user' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-800 shadow-sm border border-slate-100'}`}>
                  <p className="text-xs md:text-sm whitespace-pre-wrap leading-relaxed">{m.text}</p>
                  {m.groundingLinks && m.groundingLinks.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-1">
                      {m.groundingLinks.map((l, idx) => (
                        <a key={idx} href={l.uri} target="_blank" className="text-[9px] md:text-[10px] flex items-center text-indigo-500 hover:underline">
                          <ExternalLink className="w-2 h-2 mr-1" /> {l.title}
                        </a>
                      ))}
                    </div>
                  )}
                  {m.role === 'model' && (
                    <button onClick={() => playTTS(m.text)} className="mt-2 text-slate-300 hover:text-indigo-500 transition-colors">
                      <Volume2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
            {loading && <div className="text-indigo-400 text-[9px] md:text-[10px] font-black uppercase tracking-widest animate-pulse ml-2">Archiving...</div>}
          </>
        )}
      </div>

      {(mode === 'chat' || mode === 'persona') && (
        <div className="p-3 md:p-4 bg-white border-t border-slate-100 flex items-center space-x-2 pb-8 md:pb-4">
          <button onClick={toggleRecording} className={`p-2.5 md:p-3 rounded-xl transition-all ${isRecording ? 'bg-rose-500 text-white shadow-lg' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
            {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
          <input value={input} onChange={e => setInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleSend()} placeholder={mode === 'persona' ? `Speak with ${selectedPersona?.name}...` : "Ask assistant..."} className="flex-grow bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 md:py-3 outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium text-xs md:text-sm" />
          <button onClick={() => handleSend()} disabled={!input.trim()} className="p-2.5 md:p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-lg disabled:opacity-50 transition-all">
            <Send className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
};

export default AIAssistant;
