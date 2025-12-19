# FamilyConnect Scalability Analysis

## 📊 Current Architecture Limitations

### ❌ **Critical Bottlenecks** (Blocks scaling beyond ~1,000 users)

#### 1. **Client-Side Storage (localStorage)**
- **Limit:** ~5-10 MB per domain (browser-dependent)
- **Current Usage:** Family data stored as encrypted JSON
- **Impact:** 
  - 100 family members → ~50KB (uncompressed)
  - 1,000 family members → ~500KB (still safe)
  - 10,000+ members → localStorage overflow
- **User Scenarios:** Power users with extensive research hit limits quickly
- **Session Loss:** All data lost if localStorage is cleared or user switches devices

**Real-world impact:** A genealogist researching a large clan (500+ members) will hit storage limits. Data doesn't sync across devices.

#### 2. **Stateless Express Backend (No Database)**
- **Current:** All AI computation proxied; no persistent data layer
- **Limitation:** Cannot track user progress, history, or preferences across sessions
- **Scaling Problem:** 
  - No shared state across multiple server instances
  - No audit trail or historical data
  - Each user is isolated (good for privacy, bad for scaling)
- **API Calls:** Every request to `/api/ai/*` calls Gemini API in real-time
  - No caching layer
  - No batch processing
  - Full cost per request (no bulk discounts)

**Cost Impact at Scale:**
- 100 users × 10 AI calls/day = 1,000 API calls/day = ~$30/day at Gemini pricing

#### 3. **Single-Instance Deployment**
- **Docker Setup:** Runs on 1 server (port 5174)
- **No Load Balancing:** All users hit the same instance
- **Scaling Limit:** ~50-100 concurrent users per instance (Express CPU-bound)
- **No High Availability:** Server crash = app down

#### 4. **No Database Query Optimization**
- **AI Models:** Each Gemini call generates fresh responses
  - `gemini-3-pro-preview` has ~2 second latency
  - No response caching
  - No semantic search/similarity matching
- **Duplicate Work:** Multiple users asking same question = duplicate API calls

---

## 📈 Scalability by User Count

| Users | Frontend | Backend | Data | Status |
|-------|----------|---------|------|--------|
| **1-10** | ✅ Perfect | ✅ Perfect | ✅ 50-500KB localStorage | **MVP Ready** |
| **10-100** | ✅ Good | ⚠️ Single instance bottleneck | ⚠️ localStorage OK (~5MB max) | **Requires load balancer** |
| **100-1,000** | ⚠️ Scaling concerns | ❌ Database needed | ❌ localStorage overflow | **Major refactor required** |
| **1,000+** | ❌ Not viable | ❌ Must add DB + caching | ❌ Impossible | **Complete redesign** |

---

## 🚀 Scaling Strategy (Roadmap)

### **Phase 1: 10-100 Users (Next 3 months)**

**Changes Needed:** Load balancer only

```
┌─────────────┐
│   Nginx     │ (Load balancer)
└──────┬──────┘
       │
   ┌───┴───┬────────┐
   │       │        │
┌──▼──┐ ┌─▼──┐ ┌──▼──┐
│ API │ │ API│ │ API │  (3 instances)
│ Srv │ │Srv │ │ Srv │
└─────┘ └────┘ └─────┘
```

**Implementation:**
- Deploy 3 Express instances behind Nginx
- Add sticky sessions (route user to same instance)
- Keep localStorage as-is (per-user isolation)
- Monitor: memory, CPU, latency

**Effort:** 1-2 days
**Cost increase:** +2 server instances

---

### **Phase 2: 100-1,000 Users (3-6 months)**

**Changes Needed:** Database + API changes + caching

#### **Add PostgreSQL Backend**

```typescript
// Instead of: localStorage
// Use: POST /api/members/{userId}

app.post('/api/members', authMiddleware, async (req, res) => {
  const { name, birthDate, location } = validateRequest(memberSchema, req.body);
  const member = await db.members.create({
    userId: req.user.id,
    name, birthDate, location,
    createdAt: new Date()
  });
  res.json(member);
});
```

**Database Schema:**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR UNIQUE,
  masterKeyHash TEXT,  -- Never store plaintext
  createdAt TIMESTAMP
);

CREATE TABLE family_members (
  id UUID PRIMARY KEY,
  userId UUID REFERENCES users,
  name VARCHAR,
  birthDate DATE,
  location VARCHAR,
  birthLocation VARCHAR,
  deathDate DATE,
  deathLocation VARCHAR,
  notes TEXT,
  encryptedData TEXT,  -- Optional: encrypt sensitive fields
  createdAt TIMESTAMP,
  INDEX (userId)
);

CREATE TABLE ai_responses (
  id UUID PRIMARY KEY,
  userId UUID REFERENCES users,
  query TEXT,
  response TEXT,
  model VARCHAR,
  tokensUsed INT,
  cached BOOLEAN,
  createdAt TIMESTAMP,
  INDEX (userId, createdAt)
);

CREATE TABLE audit_log (
  id UUID PRIMARY KEY,
  userId UUID REFERENCES users,
  action VARCHAR,
  resource VARCHAR,
  details JSON,
  createdAt TIMESTAMP,
  INDEX (userId, createdAt)
);
```

**Changes to Services:**

```typescript
// OLD (services/gemini.ts)
export async function exportToGedcom(members: FamilyMember[]) {
  const response = await fetch('/api/ai/export-gedcom', {
    method: 'POST',
    body: JSON.stringify({ members })
  });
  return response.text();
}

// NEW (with database)
export async function exportToGedcom(userId: string, cacheKey?: string) {
  // Check cache first
  const cached = await db.aiResponses.findOne({
    userId, query: `gedcom_export_${cacheKey}`, cached: true
  });
  if (cached) return cached.response;
  
  // Get members from database
  const members = await db.familyMembers.find({ userId });
  
  // Call API
  const response = await fetch('/api/ai/export-gedcom', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ members })
  });
  
  // Cache result
  await db.aiResponses.create({
    userId, query: `gedcom_export_${cacheKey}`,
    response, cached: true, ttl: 86400 // 24 hours
  });
  
  return response.text();
}
```

**API Additions:**

```typescript
// Authentication endpoints
POST /api/auth/signup              // Create account
POST /api/auth/login               // JWT token
POST /api/auth/logout              // Invalidate token
POST /api/auth/refresh             // Refresh JWT

// Member CRUD
GET /api/members                   // List user's members
POST /api/members                  // Create member
PUT /api/members/:id               // Update member
DELETE /api/members/:id            // Delete member

// Evidence/documents
POST /api/evidence                 // Upload document/photo
GET /api/evidence/:id              // Retrieve evidence
DELETE /api/evidence/:id           // Delete evidence

// AI with caching
POST /api/ai/perform-audit?cached  // Check cache first
POST /api/ai/analyze?fromCache=true
```

**Architecture:**

```
┌────────────────────────────────────────┐
│         Browser (React App)            │
│  - Local state only (no vault)         │
│  - Login form (email/password)         │
│  - JWT token storage (sessionStorage)  │
└────────────┬─────────────────────────┘
             │
        ┌────┴────────────────────────────┐
        │     Express + Load Balancer      │
        │  (3 instances)                   │
        │  - JWT verification              │
        │  - Request logging               │
        └────────┬────────────────┬────────┘
                 │                │
        ┌────────▼──────┐  ┌────┬─▼───┐
        │  PostgreSQL   │  │ Redis    │
        │  (Members,    │  │ (Cache)  │
        │   Evidence,   │  │          │
        │   Audit Log)  │  └──────────┘
        └───────────────┘
```

**Effort:** 3-4 weeks
**Cost increase:** +1 database server, +1 cache server

---

### **Phase 3: 1,000+ Users (6-12 months)**

**Changes Needed:** Microservices, CDN, advanced caching

#### **Architecture Redesign**

```
┌─────────────────────────────────────┐
│    CloudFlare/AWS CloudFront        │  (CDN for static assets)
└──────────────┬──────────────────────┘
               │
     ┌─────────┴─────────┐
     │                   │
┌────▼────────┐   ┌─────▼────────┐
│ API Gateway │   │ Auth Service │
│ (Kong/AWS)  │   │ (JWT/OAuth)  │
└────┬────────┘   └──────────────┘
     │
     ├─► Members Service (member CRUD)
     ├─► Evidence Service (file upload/retrieval)
     ├─► AI Service (Gemini proxy + caching)
     ├─► Search Service (Elasticsearch for genealogy queries)
     └─► Analytics Service (usage tracking)
     │
┌────▼──────────────────────────────┐
│      Data Layer                    │
│ ┌──────────┐  ┌──────────┐        │
│ │PostgreSQL│  │ DynamoDB │        │
│ │(members) │  │(sessions)│        │
│ └──────────┘  └──────────┘        │
│ ┌──────────┐  ┌──────────┐        │
│ │   Redis  │  │   S3     │        │
│ │ (cache)  │  │(evidence)│        │
│ └──────────┘  └──────────┘        │
└───────────────────────────────────┘
```

**Key Services:**

1. **Members Service**
   - Horizontal scaling (stateless)
   - Database replication (read replicas)
   - Batch imports (genealogy files)

2. **AI Service**
   - Response caching (Redis)
   - Semantic similarity matching (embeddings)
   - Batch Gemini API calls (queue system)
   - Rate limiting per user (not per IP)

3. **Evidence Service**
   - S3 object storage (unlimited scale)
   - Image optimization (thumbnails)
   - OCR pipeline (extract text from documents)

4. **Search Service**
   - Elasticsearch for genealogy queries
   - Full-text search on documents
   - Faceted search (location, date, name)

**Effort:** 3-6 months
**Cost increase:** +$5,000-10,000/month infrastructure

---

## 💰 Cost Analysis by Scale

### **Current Setup (localStorage)**
- Hosting: $10-50/month (1 server)
- Gemini API: ~$0.10/1M tokens (~$5-20/month for light use)
- **Total: $15-70/month**

### **Phase 1 (100 users)**
- Load balancer: $50/month
- 3 API servers: $150/month
- Gemini API: $50-100/month
- **Total: $250-300/month**

### **Phase 2 (1,000 users)**
- Load balancer: $100/month
- 5 API servers: $250/month
- PostgreSQL (RDS): $150/month
- Redis cache: $80/month
- Gemini API: $200-500/month
- S3 storage: $50-200/month
- **Total: $830-1,280/month**

### **Phase 3 (10,000+ users)**
- Microservices infrastructure: $2,000-5,000/month
- Database (sharded PostgreSQL): $500-1,000/month
- Cache (Redis Cluster): $300-500/month
- CDN: $200-500/month
- Gemini API: $1,000-3,000/month
- Elasticsearch: $200-500/month
- S3 + CloudFront: $500-1,500/month
- **Total: $5,700-12,500/month**

---

## 🔴 Current Blocker Fixes (Priority Order)

### **Blocker #1: No Cross-Device Sync**
**Problem:** User adds 50 family members on phone, nothing syncs to desktop

**Solution (Quick):** Add cloud backup
```typescript
// Add simple sync endpoint
POST /api/backup/export  // Download encrypted vault JSON
POST /api/backup/import  // Upload encrypted JSON
```
Effort: 2-3 hours | Cost: $0

---

### **Blocker #2: Data Loss on Browser Clear**
**Problem:** localStorage cleared → all family data lost

**Solution (Quick):** Email export feature
```typescript
POST /api/export/email
- Generate GEDCOM/JSON export
- Email to user as attachment
- Include recovery instructions
```
Effort: 4-5 hours | Cost: $10-20/month (email service)

---

### **Blocker #3: Offline Access Impossible**
**Problem:** No internet = app is useless

**Solution (Medium):** Add Service Worker
```typescript
// Cache AI responses offline
// Queue user edits (sync when online)
// Use IndexedDB (500MB+ instead of 5MB)
```
Effort: 1-2 weeks | Cost: $0

---

### **Blocker #4: Rate Limiting Blocks Heavy Users**
**Problem:** Power user hits 100 req/15min limit

**Solution (Quick):** User-based rate limiting
```typescript
// OLD: 100 req/15min per IP
// NEW: Tier 1: 100/15min, Tier 2: 1,000/15min, Tier 3: unlimited
```
Effort: 4-6 hours | Cost: $0

---

## ✅ What Scales Well Now

### **Frontend (React + Vite)**
- ✅ Handles 10,000+ members in D3 tree (with virtual scrolling)
- ✅ Component rendering performant with React 19
- ✅ Tailwind CSS scales linearly
- **Optimization:** Add react-window for large lists

### **API Proxy Pattern**
- ✅ Secure secret management (API key server-side)
- ✅ Rate limiting prevents abuse
- ✅ Input validation at boundary
- **Optimization:** Add response compression, ETags

### **TypeScript & Type Safety**
- ✅ No runtime type errors
- ✅ Refactoring safe (full coverage)
- **Optimization:** Keep strict mode enabled

---

## 🎯 Recommendation: Next Steps

### **For MVP (1-100 users) → Do Nothing Extra**
- Current setup is fine
- Monitor storage and costs
- Get user feedback on core features

### **For Growth Phase (100-1,000 users) → Execute Phase 1 + Phase 2**
1. **Month 1-2:** Implement Nginx load balancer + sticky sessions
2. **Month 2-4:** Design PostgreSQL schema + migration plan
3. **Month 4-8:** Implement database layer + JWT auth
4. **Month 8+:** Implement caching + Elasticsearch search

### **For Scale Phase (1,000+ users) → Full Microservices**
- Requires dedicated DevOps team
- Estimated effort: 6-12 months
- ROI only makes sense with significant revenue

---

## 📋 Quick Wins (Do These Now)

1. **Add export/backup feature** (2 hours)
   - User can download encrypted GEDCOM file
   - Email backup on demand

2. **Increase rate limits** (30 mins)
   - Query string param: `?tier=pro` doubles limits
   - Prepares for freemium model

3. **Add response caching headers** (1 hour)
   - Static assets: 1 year cache (Vite adds hashes)
   - API responses: 5-minute cache where safe

4. **Implement Service Worker** (1-2 weeks)
   - Offline mode for read access
   - Background sync for edits
   - Local IndexedDB (500MB+)

5. **Add metrics collection** (2-3 hours)
   - Track active users, API calls, storage usage
   - Identify bottlenecks early

---

## Summary

| Aspect | Current | Bottleneck at | Path Forward |
|--------|---------|---------------|--------------|
| **Users** | 1-100 | 100-1,000 | Add load balancer, then database |
| **Storage** | 5-10MB | 10-100MB | Migrate to PostgreSQL |
| **API calls** | Real-time, no cache | 100+ req/sec | Add Redis cache + queue system |
| **Cost/user** | <$1 | Increases to $1-10 at scale | Implement caching + batch processing |
| **Availability** | Single instance | Yes, single point of failure | Add HA + monitoring |

**Bottom line:** App is production-ready for **MVP (1-100 users)**. For scaling to 1,000+ users, plan a **6-12 month roadmap** and budget **$5,000-10,000/month** in infrastructure + team time.
