# FamilyConnect | Global Roadmap 2025

## 1. Features Not Yet Envisaged
- **Heritage Audio Synthesis**: Using Gemini 2.5 Flash TTS to generate full multi-speaker dramatizations of family stories.
- **Genetic Signal Intersection**: A private, local-only module to cross-reference raw DNA data against the Sentinel's discovery reports without cloud uploads.
- **Legacy Circles**: Secure, peer-to-peer encrypted family groups where multiple users can contribute to a single lineage without a central server.
- **Historical Era Integration**: Automated overlay of historical events (wars, famines, industrial shifts) onto the migration timeline to explain "the why" behind ancestral moves.

## 2. Scaling & Reliability
- **IndexedDB Transition**: As users grow from 10 to 1,000+ nodes with high-res media, LocalStorage (5MB) will fail. We must migrate to IndexedDB for persistent, large-scale storage.
- **Worker-Thread Visualization**: For trees exceeding 2,000 nodes, D3.js rendering should move to a Web Worker to keep the UI at a buttery 60fps.
- **Lazy Archival Loading**: Implementation of a virtualized discovery feed to handle thousands of Sentinel leads efficiently.

## 3. Security & Trust Protocols
- **Vault MFA**: Implementing a secondary local challenge (Biometric or PIN) before decrypting the Master Key in the session.
- **Zero-Knowledge Cloud Sync**: A "Blind Backup" service where users can sync their encrypted vault to a server, but only they hold the key to decrypt it.
- **Audit Logs**: Transparent logging of all Sentinel research queries to ensure users know exactly what metadata is being used for archival scouting.
- **Patching Strategy**: Standardized automated vulnerability scanning for all third-party dependencies (CryptoJS, D3).
