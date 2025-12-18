
export interface LifeEvent {
  year: number;
  type: 'Migration' | 'Birth' | 'Marriage' | 'Military' | 'Death' | 'Other';
  location: string;
  description: string;
}

export interface EvidenceLink {
  id: string;
  title: string;
  url: string;
  snippet?: string;
  sourceType: string;
  verificationStatus: 'unverified' | 'verified' | 'disputed';
}

export interface FamilyMember {
  id: string;
  name: string;
  relation: string;
  customRelation?: string;
  birthDate: string;
  location: string;
  contactInfo: string;
  notes: string;
  parentId?: string;
  childrenIds: string[];
  occupations?: string[];
  lifeEvents?: LifeEvent[];
  evidenceLinks?: EvidenceLink[];
  dnaMarkers?: string;
  imageUrl?: string;
  privacyLevel: 'Private' | 'Family Only' | 'Public';
  verificationScore?: number;
}

export interface DiscoveryReport {
  id: string;
  title: string;
  summary: string;
  findings: string[];
  confidence: number;
  sources: Array<{ title: string; uri: string }>;
  timestamp: number;
}

export interface AgentTask {
  id: string;
  status: 'pending' | 'working' | 'completed' | 'failed';
  goal: string;
  logs: string[];
  findings?: MatchSuggestion[];
  report?: DiscoveryReport;
  timestamp: number;
}

export interface AgentState {
  isAutonomous: boolean;
  currentTask: string | null;
  thoughtStream: string[];
  lastScanTimestamp: number;
}

export interface WebDiscovery {
  title: string;
  uri: string;
  snippet?: string;
  sourceType: 'Social Media' | 'Public Record' | 'Archive' | 'News';
  imageUrl?: string;
}

export interface MatchSuggestion {
  id: string;
  name: string;
  reason: string;
  confidence: number;
  potentialLocation: string;
  sourceType: 'Public Record' | 'Community Match' | 'Web Discovery';
  sharedTraits?: string[];
  externalLinks?: WebDiscovery[];
  imageUrl?: string;
}

export interface UserProfile {
  username: string;
  maidenName?: string;
  location: string;
  language: string;
  heritageFocus?: string;
  grandparentsInfo?: string;
  avatarUrl?: string;
  personaTags?: string[];
}

export type ViewType = 'dashboard' | 'tree' | 'matches' | 'profile' | 'memories' | 'agent' | 'timeline' | 'distribution';

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  groundingLinks?: Array<{ title: string; uri: string }>;
}

export interface MemoryItem {
  id: string;
  type: 'image' | 'analysis';
  url: string;
  caption: string;
  timestamp: number;
}
