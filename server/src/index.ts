import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { GoogleGenAI } from '@google/genai';
import { randomUUID } from 'crypto';
import type { Request, Response } from 'express';
import { exportToGedcomString } from '../../utils/gedcom';
import { taskSchema, memberSchema, urlSchema, messageSchema, validateRequest } from './validation';
import { z } from 'zod';
import { logRequest, errorHandler } from './middleware';
import { trackTokenUsage, trackStorageUsage, trackFamilyMembersCount, getMonthlyUsage } from './usage-tracker';
import billingRouter from './billing-routes';
import {
  securityHeaders,
  securityContextMiddleware,
  corsConfig,
  requestSizeLimits,
  suspiciousRequestFilter,
  sanitizeForLogging,
} from './security-middleware';
import { optionalAuthMiddleware } from './auth';
import { validateEnvironment, getEnvironment } from './config';

// ============================================================================
// CONFIGURATION
// ============================================================================

// Validate environment variables before starting
validateEnvironment();
const env = getEnvironment();

const app = express();
const crypto = { randomUUID };

// ============================================================================
// CORE MIDDLEWARE
// ============================================================================

// Security headers first
app.use(securityHeaders);

// Body parsing with size limits
app.use(express.json(requestSizeLimits.json));
app.use(express.urlencoded(requestSizeLimits.urlencoded));

// Helmet for additional security headers
app.use(helmet());

// CORS with origin whitelist
app.use(cors(corsConfig));

// Security context and logging
app.use(securityContextMiddleware);

// Suspicious request filtering
app.use(suspiciousRequestFilter);

// Optional authentication (validates token if present)
app.use(optionalAuthMiddleware);

// Rate limiting (per-IP for now; will be per-user-tier in production)
const apiLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', apiLimiter);

// ============================================================================
// API ROUTES
// ============================================================================

// Register billing routes (before other API routes)
app.use(billingRouter);

// ============================================================================
// GEMINI AI CONFIGURATION
// ============================================================================

const API_KEY = env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error('❌ CRITICAL: GEMINI_API_KEY not configured. Set GEMINI_API_KEY environment variable.');
  process.exit(1);
}

const ai = () => new GoogleGenAI({ apiKey: API_KEY });

/**
 * Helper: Extract token count from Gemini response
 * Estimates based on text length (rough approximation)
 * In production, use Gemini's usageMetadata field if available
 */
function estimateTokenCount(text: string): number {
  // Rough estimate: 1 token ≈ 4 characters
  return Math.ceil(text.length / 4);
}

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/ai/chat-ancestor', async (req: Request, res: Response) => {
  try {
    const { member, message, history, userId } = req.body;
    const personaContext = `You are simulating ${member.name}. Biographical Context: Born ${member.birthDate} in ${member.location}.`;
    const response = await ai().models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: message,
      config: { systemInstruction: personaContext }
    });
    
    // Track token usage
    const responseText = response.text || '';
    const tokens = estimateTokenCount(message) + estimateTokenCount(responseText);
    if (userId) trackTokenUsage(userId, tokens, 'textGeneration');
    
    res.json({ role: 'model', text: responseText });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e.message || String(e) });
  }
});

app.post('/api/ai/analyze-evidence', async (req: Request, res: Response) => {
  try {
    const { url } = req.body;
    const response = await ai().models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analyze this archival URL for genealogical relevance: ${url}`,
      config: { tools: [{ googleSearch: {} }], responseMimeType: 'application/json' }
    });
    res.json(JSON.parse(response.text || '{}'));
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e.message || String(e) });
  }
});

app.post('/api/ai/perform-audit', async (req: Request, res: Response) => {
  try {
    const validated = validateRequest(z.object({ members: z.array(memberSchema) }), req.body);
    const { members } = validated as any;
    const prompt = `You are the FamilyConnect Autonomous Sentinel. Lineage: ${JSON.stringify(members)}`;
    const response = await ai().models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: { thinkingConfig: { thinkingBudget: 8000 }, responseMimeType: 'application/json' }
    });
    res.json(JSON.parse(response.text || '{}'));
  } catch (e: any) {
    console.error(e);
    res.status(e.message?.includes('Validation') ? 400 : 500).json({ error: e.message || String(e) });
  }
});

app.post('/api/ai/discovery', async (req: Request, res: Response) => {
  try {
    const { task, context } = req.body;
    const prompt = `RESEARCH DIRECTIVE: ${task} \nTREE CONTEXT: ${JSON.stringify((context || []).slice(-5))}`;
    const response = await ai().models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: { tools: [{ googleSearch: {} }], thinkingConfig: { thinkingBudget: 12000 }, responseMimeType: 'application/json' }
    });
    let results = [];
    try { results = JSON.parse(response.text || '[]'); } catch (e) { results = []; }
    res.json(results);
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e.message || String(e) });
  }
});

import { exportToGedcomString } from '../../utils/gedcom';

app.post('/api/ai/export-gedcom', (req: Request, res: Response) => {
  try {
    const { members } = req.body;
    const ged = exportToGedcomString(members || []);
    res.setHeader('Content-Type', 'text/plain');
    res.send(ged);
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e.message || String(e) });
  }
});

app.post('/api/ai/synthesize-report', async (req: Request, res: Response) => {
  try {
    const { task, findings } = req.body;
    const response = await ai().models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Analyze these research findings and synthesize a heritage report. Task: ${task}. Findings: ${JSON.stringify(findings)}`,
      config: { thinkingConfig: { thinkingBudget: 12000 }, responseMimeType: 'application/json' }
    });
    const data = JSON.parse(response.text || '{}');
    res.json({ ...data, id: crypto.randomUUID(), timestamp: Date.now() });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e.message || String(e) });
  }
});

app.post('/api/ai/generate-persona-preview', async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;
    const response = await ai().models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: `A highly realistic portrait of ${name}. ${description}. 8k resolution, cinematic lighting.` }] }
    });
    let image = null;
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if ((part as any).inlineData) { image = `data:image/png;base64,${(part as any).inlineData.data}`; break; }
    }
    res.json({ image });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e.message || String(e) });
  }
});

app.post('/api/ai/generate-family-portrait', async (req: Request, res: Response) => {
  try {
    const { prompt, size } = req.body;
    const model = size === '1K' ? 'gemini-2.5-flash-image' : 'gemini-3-pro-image-preview';
    const response = await ai().models.generateContent({
      model: model,
      contents: { parts: [{ text: `Heritage family portrait: ${prompt}. Hyper-realistic style.` }] },
      config: { imageConfig: { aspectRatio: '1:1', imageSize: size } }
    });
    let image = null;
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if ((part as any).inlineData) { image = `data:image/png;base64,${(part as any).inlineData.data}`; break; }
    }
    res.json({ image });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e.message || String(e) });
  }
});

app.post('/api/ai/edit-family-photo', async (req: Request, res: Response) => {
  try {
    const { image, prompt } = req.body;
    const response = await ai().models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ inlineData: { data: image.split(',')[1], mimeType: 'image/png' } }, { text: prompt }] }
    });
    let result = null;
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if ((part as any).inlineData) { result = `data:image/png;base64,${(part as any).inlineData.data}`; break; }
    }
    res.json({ image: result });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e.message || String(e) });
  }
});

app.post('/api/ai/animate-family-photo', async (req: Request, res: Response) => {
  try {
    const { image, prompt } = req.body;
    res.json({ videoUrl: null, message: 'Video generation queued (async). Check status later.' });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e.message || String(e) });
  }
});

app.post('/api/ai/chat-search', async (req: Request, res: Response) => {
  try {
    const { message } = req.body;
    const response = await ai().models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: message,
      config: { tools: [{ googleSearch: {} }] }
    });
    res.json({ role: 'model', text: response.text || '', groundingLinks: [] });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e.message || String(e) });
  }
});

app.post('/api/ai/solve-puzzle', async (req: Request, res: Response) => {
  try {
    const { puzzle } = req.body;
    const response = await ai().models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: puzzle,
      config: { thinkingConfig: { thinkingBudget: 24000 } }
    });
    res.json({ solution: response.text || '', text: response.text || '' });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e.message || String(e) });
  }
});

app.post('/api/ai/analyze-photo', async (req: Request, res: Response) => {
  try {
    const { image } = req.body;
    const response = await ai().models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: { parts: [{ inlineData: { data: image.split(',')[1], mimeType: 'image/jpeg' } }, { text: 'Provide detailed analysis.' }] }
    });
    res.json({ text: response.text || '' });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e.message || String(e) });
  }
});

app.post('/api/ai/generate-family-story', async (req: Request, res: Response) => {
  try {
    const { members } = req.body;
    if (!members || members.length === 0) {
      res.json({ text: 'The ledger awaits its first node.' });
      return;
    }
    const context = (members || []).map((m: any) => `${m.name} from ${m.location}`).join(', ');
    const response = await ai().models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Synthesize a poetic legacy overview: ${context}`
    });
    res.json({ text: response.text || 'Every family is a constellation of stories.' });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e.message || String(e) });
  }
});

app.post('/api/ai/find-places', async (req: Request, res: Response) => {
  try {
    const { query, lat, lng } = req.body;
    const response = await ai().models.generateContent({
      model: 'gemini-2.5-flash-preview-09-2025',
      contents: `Identify locations for: ${query}`,
      config: { tools: [{ googleMaps: {} }], toolConfig: lat && lng ? { retrievalConfig: { latLng: { latitude: lat, longitude: lng } } } : undefined }
    });
    res.json({ role: 'model', text: response.text || '', groundingLinks: [] });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e.message || String(e) });
  }
});

app.post('/api/ai/transcribe-audio', async (req: Request, res: Response) => {
  try {
    const { audio } = req.body;
    const response = await ai().models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [{ inlineData: { mimeType: 'audio/wav', data: audio.split(',')[1] } }, { text: 'Transcribe accurately.' }] }
    });
    res.json({ text: response.text || '' });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e.message || String(e) });
  }
});

app.post('/api/ai/speak-family-story', async (req: Request, res: Response) => {
  try {
    const { text } = req.body;
    res.json({ audio: null, message: 'TTS generation would go here. Stub for now.' });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e.message || String(e) });
  }
});

// ============================================================================
// ERROR HANDLING (must be last)
// ============================================================================

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not found',
    code: 'NOT_FOUND',
    path: req.path,
  });
});

// Global error handler
app.use(errorHandler as any);

// ============================================================================
// START SERVER
// ============================================================================

const PORT = env.PORT;
const server = app.listen(PORT, () => {
  console.log(`\n✓ Server running on http://localhost:${PORT}`);
  console.log(`✓ Environment: ${env.NODE_ENV}`);
  console.log(`✓ CORS enabled for: ${env.ALLOWED_ORIGINS}\n`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n⚠️  SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('✓ Server closed');
    process.exit(0);
  });
  // Force shutdown after 30 seconds
  setTimeout(() => {
    console.error('❌ Forced shutdown due to timeout');
    process.exit(1);
  }, 30000);
});

process.on('SIGINT', () => {
  console.log('\n⚠️  SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('✓ Server closed');
    process.exit(0);
  });
});
