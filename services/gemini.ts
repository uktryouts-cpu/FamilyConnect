
import { FamilyMember, MatchSuggestion, ChatMessage, WebDiscovery, AgentTask, DiscoveryReport, EvidenceLink } from "../types";

async function postJson(path: string, body: any) {
  const res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

/**
 * Simulates a conversation with an ancestor based on their node data via server proxy.
 */
export const chatWithAncestorPersona = async (member: FamilyMember, userMessage: string, history: ChatMessage[]): Promise<ChatMessage> => {
  return postJson('/api/ai/chat-ancestor', { member, message: userMessage, history });
};

/**
 * Analyzes a potential evidence link for genealogical value via server proxy.
 */
export const analyzeEvidenceLink = async (url: string): Promise<Partial<EvidenceLink>> => {
  return postJson('/api/ai/analyze-evidence', { url });
};

/**
 * Agent Brain: Performs an end-to-end audit of the user flow and tree data via server proxy.
 */
export const performAutonomousReasoning = async (members: FamilyMember[]): Promise<{ task: string; reason: string }> => {
  return postJson('/api/ai/perform-audit', { members });
};

export const synthesizeDiscoveryReport = async (task: string, findings: MatchSuggestion[]): Promise<DiscoveryReport> => {
  return postJson('/api/ai/synthesize-report', { task, findings });
};

export const executeAgentDiscovery = async (task: string, context: FamilyMember[]): Promise<MatchSuggestion[]> => {
  return postJson('/api/ai/discovery', { task, context });
};

export const exportToGedcom = async (members: FamilyMember[]): Promise<string> => {
  const res = await fetch('/api/ai/export-gedcom', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ members }) });
  if (!res.ok) throw new Error(await res.text());
  return res.text();
};

export const deepResearchRelative = async (member: FamilyMember): Promise<MatchSuggestion[]> => {
  return executeAgentDiscovery(`Conduct a comprehensive deep-dive into the lineage and life events of ${member.name}.`, [member]);
};

export const visualEvidenceSearch = async (searchTerm: string, context?: string): Promise<MatchSuggestion[]> => {
  return executeAgentDiscovery(`Search for visual records: ${searchTerm}`, []);
};

export const generatePersonaPreview = async (name: string, description: string): Promise<string | null> => {
  const data = await postJson('/api/ai/generate-persona-preview', { name, description });
  return data?.image || null;
};

export const generateFamilyPortrait = async (prompt: string, size: "1K" | "2K" | "4K"): Promise<string | null> => {
  const data = await postJson('/api/ai/generate-family-portrait', { prompt, size });
  return data?.image || null;
};

export const editFamilyPhoto = async (base64Image: string, prompt: string): Promise<string | null> => {
  const data = await postJson('/api/ai/edit-family-photo', { image: base64Image, prompt });
  return data?.image || null;
};

export const animateFamilyPhoto = async (base64Image: string, prompt: string, onProgress?: (msg: string) => void) => {
  // For long-running tasks, the server can return a job id; for now, call discovery endpoint which will return a URL when ready.
  const data = await postJson('/api/ai/animate-family-photo', { image: base64Image, prompt });
  return data?.videoUrl || null;
};

export const chatWithSearch = async (message: string): Promise<ChatMessage> => {
  return postJson('/api/ai/chat-search', { message });
};

export const solveAncestryPuzzle = async (puzzle: string) => {
  const data = await postJson('/api/ai/solve-puzzle', { puzzle });
  return data?.solution || data?.text || '';
};

export const analyzePhoto = async (base64Image: string) => {
  const data = await postJson('/api/ai/analyze-photo', { image: base64Image });
  return data?.text || '';
};

export const generateFamilyStory = async (members: FamilyMember[]): Promise<string> => {
  const data = await postJson('/api/ai/generate-family-story', { members });
  return data?.text || "Every family is a constellation of stories.";
};

export const findAncestralPlaces = async (query: string, lat?: number, lng?: number): Promise<ChatMessage> => {
  return postJson('/api/ai/find-places', { query, lat, lng });
};

export const getPotentialMatches = async (members: FamilyMember[]): Promise<MatchSuggestion[]> => {
  if (members.length < 1) return [];
  return postJson('/api/ai/discovery', { task: 'Identify potential matches', context: members });
};

export const transcribeAudio = async (base64Audio: string): Promise<string> => {
  const data = await postJson('/api/ai/transcribe-audio', { audio: base64Audio });
  return data?.text || '';
};

export const speakFamilyStory = async (text: string): Promise<Uint8Array | null> => {
  const data = await postJson('/api/ai/speak-family-story', { text });
  if (data?.audio) {
    const binary = atob(data.audio);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }
  return null;
};

