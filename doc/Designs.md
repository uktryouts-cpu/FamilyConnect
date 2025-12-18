# Design Philosophy: The Luminous Horizon

FamilyConnect is designed to feel like a high-end museum or a premium private archive, moving away from the "utility-only" look of traditional genealogy software.

## Visual Identity
- **Primary Aesthetic**: "Luminous Horizon" — A blend of depth, soft light, and clarity.
- **Colors**: 
  - `Indigo-600`: The color of the ledger and logic.
  - `Emerald-500`: The color of security and verified nodes.
  - `Slate-900`: The color of the deep archives.
- **Typography**:
  - `Playfair Display`: Used for the "Legacy" (titles/names), providing a human-expert, historical feel.
  - `Inter`: Used for the "System" (data/labels), ensuring readability and modern tech precision.

## Motion & Transitions
- **Cinematic Pacing**: Transitions use 700ms-1200ms durations with `cubic-bezier` curves to feel deliberate and premium.
- **Feedback Loops**: Hovering over lineage nodes triggers a "pulsing" scale effect, suggesting a live, interconnected network.
- **Background Motion**: The fixed "Horizon Glow" pulses slowly (20s cycle) to create a sense of hope and progress without being distracting.

## UX Patterns
- **The "Vault" Metaphor**: Security is front-and-center, using physical metaphors (Master Keys, Sealing, Gated Access) to build trust.
- **Context-Aware Sidebar**: The Intelligence Sidebar on the Tree view provides a deep-dive into metadata without leaving the visualization context.
- **Staggered Reveals**: Discovery leads fade in with a sequence animation, making the AI's "finding" feel like a moment of discovery rather than a data dump.
