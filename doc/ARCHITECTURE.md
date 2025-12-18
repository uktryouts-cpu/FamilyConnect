# Architecture & Logic Flow

## Data Flow
- **Encryption**: Data is serialized to JSON, encrypted via AES-256 (CryptoJS), and stored in LocalStorage.
- **State Management**: React 19 StrictMode with context-aware hooks for real-time Agent updates.
- **Visualization**: D3.js hierarchical layouts (Horizontal, Radial, Treemap) with hardware-accelerated SVG transitions.

## The Sentinel Agent (Autonomous AI)
The Sentinel operates as a stateful agent with the following loop:
1. **Perception**: Scans the current Family Tree nodes and User Profile context.
2. **Reasoning**: Uses Gemini 3.0 Pro with a high thinking budget to identify gaps in the lineage.
3. **Action**: Executes Google Search grounding to discover external records or social footprints.
4. **Integration**: Presents findings as "Leads" for the user to verify and integrate.

## Multimodal Services
- **Gemini 2.5 Flash Image**: Persona portrait generation and photo editing.
- **Veo 3.1**: Video animation for heritage photographs.
- **Gemini 2.5 Native Audio**: Low-latency voice interaction for oral history capture.
