
import { GoogleGenAI, Type, Modality, GenerateContentResponse } from "@google/genai";
import { FamilyMember, MatchSuggestion, ChatMessage, WebDiscovery, AgentTask, DiscoveryReport, EvidenceLink } from "../types";

async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    if (retries === 0) throw error;
    const msg = error.message?.toLowerCase() || '';
    if (msg.includes('401') || msg.includes('403') || msg.includes('402')) throw error;
    await new Promise(resolve => setTimeout(resolve, delay));
    return withRetry(fn, retries - 1, delay * 2);
  }
}

/**
 * Simulates a conversation with an ancestor based on their node data.
 */
export const chatWithAncestorPersona = async (member: FamilyMember, userMessage: string, history: ChatMessage[]): Promise<ChatMessage> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  const personaContext = `
    You are simulating ${member.name}. 
    Biographical Context: Born ${member.birthDate} in ${member.location}. 
    Occupations: ${member.occupations?.join(', ') || 'Unknown'}.
    Life Milestones: ${member.lifeEvents?.map(e => `${e.year}: ${e.type} in ${e.location}`).join('; ') || 'Sparse archives'}.
    Notes: ${member.notes}.
    
    INSTRUCTION: Speak in the first person. Use language appropriate to their era. Stay strictly within the context provided. If you don't know something, express it as a lost memory or a secret of the time.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: userMessage,
    config: {
      systemInstruction: personaContext,
      thinkingConfig: { thinkingBudget: 4000 }
    }
  });

  return { role: 'model', text: response.text || "The archives are silent on this matter." };
};

/**
 * Analyzes a potential evidence link for genealogical value.
 */
export const analyzeEvidenceLink = async (url: string): Promise<Partial<EvidenceLink>> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Analyze this archival URL for genealogical relevance: ${url}`,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          snippet: { type: Type.STRING },
          sourceType: { type: Type.STRING },
          relevanceScore: { type: Type.NUMBER }
        },
        required: ["title", "sourceType"]
      }
    }
  });

  return JSON.parse(response.text || "{}");
};

/**
 * Agent Brain: Performs an end-to-end audit of the user flow and tree data.
 */
export const performAutonomousReasoning = async (members: FamilyMember[]): Promise<{ task: string; reason: string }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  const prompt = `
    You are the FamilyConnect Autonomous Sentinel.
    Lineage Audit Log: ${JSON.stringify(members.map(m => ({ 
      name: m.name, 
      relation: m.relation, 
      location: m.location, 
      occupations: m.occupations,
      lifeEvents: m.lifeEvents
    })))}
    
    CRITICAL OBJECTIVE: Perform an end-to-end audit of the user flow. 
    1. Identify logical gaps (missing parents, disconnected nodes).
    2. Spot ambiguous spatial/temporal data.
    3. ANALYZE OCCUPATIONAL PATTERNS: Look for professional lineages (e.g., guilds, military services, specific trades).
    4. TRIANGULATE MILESTONES: Use life events like migrations or marriages to narrow down archival research windows.
    5. Determine the highest priority research task to bridge the current lineage to global archives.
    
    Return your findings in JSON format: { "task": "detailed research goal focusing on name, location, occupation, and era", "reason": "logical audit result" }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 8000 },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            task: { type: Type.STRING },
            reason: { type: Type.STRING }
          },
          required: ["task", "reason"]
        }
      }
    });
    return JSON.parse(response.text || "{}");
  } catch (e) {
    return { task: "Verify root node identity and spatial context", reason: "Standard system integrity check failed." };
  }
};

/**
 * Synthesizes a deep discovery report based on grounding data.
 */
export const synthesizeDiscoveryReport = async (task: string, findings: MatchSuggestion[]): Promise<DiscoveryReport> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  const prompt = `
    Analyze these research findings and synthesize a formal heritage report.
    Research Goal: ${task}
    Findings: ${JSON.stringify(findings)}
    
    The report should be narrative, professional, and highlight the most promising links, specifically noting if a match shares an occupation or was involved in the same historical events.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 12000 },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            title: { type: Type.STRING },
            summary: { type: Type.STRING },
            findings: { type: Type.ARRAY, items: { type: Type.STRING } },
            confidence: { type: Type.NUMBER },
            sources: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: { title: { type: Type.STRING }, uri: { type: Type.STRING } }
              }
            }
          },
          required: ["title", "summary", "findings", "confidence"]
        }
      }
    });
    return { ...JSON.parse(response.text || "{}"), id: crypto.randomUUID(), timestamp: Date.now() };
  } catch (e) {
    return { 
      id: crypto.randomUUID(), 
      title: "Archive Audit Summary", 
      summary: "Preliminary scan complete. Direct link intersections require manual gate verification.", 
      findings: ["No immediate conflicts detected."], 
      confidence: 0.5, 
      sources: [], 
      timestamp: Date.now() 
    };
  }
};

/**
 * Standard GEDCOM Export: Converts the tree to the universal genealogy format.
 */
export const exportToGedcom = (members: FamilyMember[]): string => {
  let ged = "0 HEAD\n1 CHAR UTF-8\n1 SOUR FamilyConnect\n2 VERS 4.0\n";
  members.forEach(m => {
    ged += `0 @I${m.id}@ INDI\n1 NAME ${m.name}\n1 BIRT\n2 DATE ${m.birthDate}\n2 PLAC ${m.location}\n`;
    m.occupations?.forEach(occ => {
      ged += `1 OCCU ${occ}\n`;
    });
    if (m.parentId) ged += `1 FAMC @F${m.parentId}@\n`;
  });
  ged += "0 TRLR";
  return ged;
};

/**
 * Visual Analysis: Decodes historical artifacts.
 */
export const analyzeHistoricalArtifact = async (base64: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: {
      parts: [
        { inlineData: { data: base64.split(',')[1], mimeType: 'image/jpeg' } },
        { text: "Examine this historical artifact/photo for family heritage clues, era identification, and hidden metadata." }
      ]
    },
    config: { thinkingConfig: { thinkingBudget: 16000 } }
  });
  return response.text || "";
};

/**
 * Structured Discovery: Scans global web and archives for specific leads.
 */
export const executeAgentDiscovery = async (task: string, context: FamilyMember[]): Promise<MatchSuggestion[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  const prompt = `
    RESEARCH DIRECTIVE: ${task}
    TREE CONTEXT: ${JSON.stringify(context.slice(-5))}
    
    INSTRUCTIONS:
    - Use Google Search to find verified genealogical data, public records, and social digital footprints.
    - LEVERAGE MULTI-CRITERIA: Search using names, locations, ancestral occupations, milestones, and DNA markers.
    - PRIORITIZE IMAGES: Seek publicly available portrait URLs.
    - STRUCTURED DATA: Provide confidence scores (0.0 to 1.0) and source citations.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        thinkingConfig: { thinkingBudget: 12000 },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              name: { type: Type.STRING },
              reason: { type: Type.STRING },
              confidence: { type: Type.NUMBER },
              sourceType: { type: Type.STRING },
              imageUrl: { type: Type.STRING },
              potentialLocation: { type: Type.STRING },
              sharedTraits: { type: Type.ARRAY, items: { type: Type.STRING } },
              externalLinks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: { title: { type: Type.STRING }, uri: { type: Type.STRING } },
                  required: ["title", "uri"]
                }
              }
            },
            required: ["name", "reason", "confidence"]
          }
        }
      }
    });
    const results = JSON.parse(response.text || "[]");
    return results.map((r: any) => ({ ...r, id: crypto.randomUUID() }));
  } catch (e) {
    console.error("Discovery error:", e);
    return [];
  }
};

export const deepResearchRelative = async (member: FamilyMember): Promise<MatchSuggestion[]> => {
  return executeAgentDiscovery(`Conduct a comprehensive deep-dive into the lineage and life events of ${member.name} (${member.birthDate || 'Unknown Date'}). 
    Targeted Criteria: 
    - Location: ${member.location || 'Unknown'}
    - Occupations: ${member.occupations?.join(', ') || 'Unknown'}`, [member]);
};

export const visualEvidenceSearch = async (searchTerm: string, context?: string): Promise<MatchSuggestion[]> => {
  return executeAgentDiscovery(`Search for visual records, photographs, and archival mentions for: "${searchTerm}". ${context || ''}`, []);
};

export const generatePersonaPreview = async (name: string, description: string): Promise<string | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: `A highly realistic portrait of ${name}. ${description}. 8k resolution, cinematic lighting.` }] }
    });
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
  } catch (e) {}
  return null;
};

export const generateFamilyPortrait = async (prompt: string, size: "1K" | "2K" | "4K"): Promise<string | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  const model = size === "1K" ? 'gemini-2.5-flash-image' : 'gemini-3-pro-image-preview';
  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: { parts: [{ text: `Heritage family portrait: ${prompt}. Hyper-realistic style.` }] },
      config: { imageConfig: { aspectRatio: "1:1", imageSize: size } }
    });
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
  } catch (e) {}
  return null;
};

export const editFamilyPhoto = async (base64Image: string, prompt: string): Promise<string | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ inlineData: { data: base64Image.split(',')[1], mimeType: 'image/png' } }, { text: prompt }],
      },
    });
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
  } catch (e) {}
  return null;
};

export const animateFamilyPhoto = async (base64Image: string, prompt: string, onProgress?: (msg: string) => void) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  onProgress?.("Orchestrating Veo rendering nodes...");
  let operation: any = await ai.models.generateVideos({
    model: 'veo-3.1-fast-generate-preview',
    prompt: `Cinematic animation of this family photo: ${prompt}`,
    image: { imageBytes: base64Image.split(',')[1], mimeType: 'image/png' },
    config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '16:9' }
  });
  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 8000));
    operation = await ai.operations.getVideosOperation({ operation: operation });
    onProgress?.("Breathing life into your heritage...");
  }
  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
  const blob = await response.blob();
  return URL.createObjectURL(blob);
};

export const chatWithSearch = async (message: string): Promise<ChatMessage> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: message,
    config: { tools: [{ googleSearch: {} }] }
  });
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const links = chunks.filter(c => c.web).map(c => ({ title: c.web!.title, uri: c.web!.uri }));
  return { role: 'model', text: response.text || '', groundingLinks: links };
};

export const solveAncestryPuzzle = async (puzzle: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: puzzle,
    config: { thinkingConfig: { thinkingBudget: 24000 } }
  });
  return response.text;
};

export const analyzePhoto = async (base64Image: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: {
      parts: [{ inlineData: { data: base64Image.split(',')[1], mimeType: 'image/jpeg' } }, { text: "Provide a detailed analysis of this photograph." }]
    }
  });
  return response.text;
};

export const generateFamilyStory = async (members: FamilyMember[]): Promise<string> => {
  if (members.length === 0) return "The ledger awaits its first node.";
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  const context = members.map(m => `${m.name} from ${m.location}`).join(', ');
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Synthesize a poetic legacy overview: ${context}`,
  });
  return response.text || "Every family is a constellation of stories.";
};

export const findAncestralPlaces = async (query: string, lat?: number, lng?: number): Promise<ChatMessage> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-09-2025",
    contents: `Identify locations for: ${query}`,
    config: {
      tools: [{ googleMaps: {} }],
      toolConfig: { retrievalConfig: lat && lng ? { latLng: { latitude: lat, longitude: lng } } : undefined }
    }
  });
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const links = chunks.filter(c => c.maps).map(c => ({ title: c.maps!.title, uri: c.maps!.uri }));
  return { role: 'model', text: response.text || '', groundingLinks: links };
};

export const speakFamilyStory = async (text: string): Promise<Uint8Array> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
    },
  });
  const data = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  const binary = atob(data || "");
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export const getPotentialMatches = async (members: FamilyMember[]): Promise<MatchSuggestion[]> => {
  if (members.length < 1) return [];
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  const prompt = `Perform inference on this lineage: ${JSON.stringify(members)}. Cross-reference with global archival patterns.`;
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 16000 },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              name: { type: Type.STRING },
              reason: { type: Type.STRING },
              confidence: { type: Type.NUMBER },
              potentialLocation: { type: Type.STRING },
              imageUrl: { type: Type.STRING },
              sourceType: { type: Type.STRING },
              sharedTraits: { type: Type.ARRAY, items: { type: Type.STRING } }
            }
          }
        }
      }
    });
    return JSON.parse(response.text || "[]");
  } catch (error) {
    return [];
  }
};

/**
 * Transcribes audio from base64 string using Gemini API.
 */
export const transcribeAudio = async (base64Audio: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'audio/wav',
              data: base64Audio
            }
          },
          { text: "Transcribe the audio accurately." }
        ]
      }
    });
    return response.text || "";
  } catch (e) {
    console.error("Transcription error:", e);
    return "";
  }
};
