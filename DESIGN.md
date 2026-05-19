# GeoHealth-JHCIS System Design

> สถาปัตยกรรมระบบ GIS สำหรับเชื่อมโยงข้อมูลสุขภาพ JHCIS เชิงพื้นที่

**Version:** 1.0.0  
**Status:** Production Blueprint  
**Stack:** Next.js 16 + TypeScript + Prisma + MariaDB + Leaflet

---

## Table of Contents

- [1. High-Level Architecture](#1-high-level-architecture)
- [2. Technology Stack (Detailed)](#2-technology-stack-detailed)
- [3. Directory Structure](#3-directory-structure)
- [4. Database Schema](#4-database-schema)
- [5. API Design](#5-api-design)
- [6. Frontend Architecture](#6-frontend-architecture)
- [7. Component Tree](#7-component-tree)
- [8. Data Flow Diagrams](#8-data-flow-diagrams)
- [9. Offline Strategy (FFC PWA)](#9-offline-strategy-ffc-pwa)
- [10. State Management](#10-state-management)
- [11. Caching Strategy](#11-caching-strategy)
- [12. Security Implementation](#12-security-implementation)
- [13. Docker Production Setup](#13-docker-production-setup)
- [14. Coolify Deployment](#14-coolify-deployment)
- [15. Monitoring & Observability](#15-monitoring--observability)
- [16. Performance Budget](#16-performance-budget)

---

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Users                                  │
│  (Browser / PWA / Mobile)                                   │
└─────────────────────────┬───────────────────────────────────┘
                          │ HTTPS
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              Traefik (SSL Termination)                      │
│              Rate Limiting / DDoS Protection                │
└──────────┬──────────────────────────────────┬───────────────┘
           │ Static Assets                    │ API Requests
           ▼                                  ▼
┌──────────────────────┐   ┌──────────────────────────────────┐
│  Next.js Static     │   │  Next.js API Routes              │
│  (CDN / Nginx)      │   │  ───────────────────────────    │
│                     │   │  Middleware: JWT + RBAC          │
│                     │   │  Pages Router / App Router       │
└──────────────────────┘   └──────────┬───────────────────────┘
                                       │
                          ┌────────────┼────────────┐
                          ▼            ▼            ▼
                  ┌────────────┐ ┌──────────┐ ┌──────────┐
                  │  Service   │ │  Redis   │ │  MinIO   │
                  │  Layer     │ │ (Cache)  │ │ (Files)  │
                  └─────┬──────┘ └──────────┘ └──────────┘
                        │
            ┌───────────┼───────────┐
            ▼           ▼           ▼
    ┌────────────┐ ┌──────────┐ ┌──────────┐
    │  MariaDB   │ │  JHCIS   │ │  PostGIS │
    │ (Primary)  │ │ (Read)   │ │ (Optional)│
    └────────────┘ └──────────┘ └──────────┘
                        │
                        ▼
                ┌──────────────────┐
                │  Cron Sync       │
                │  (BullMQ + Redis)│
                └──────────────────┘
```

### Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| **Next.js App Router** | Full-stack React, API routes co-located, SSR/SSG/ISR flexibility |
| **Prisma ORM** | Type-safe DB access, migration management, schema-generation |
| **MariaDB** | JHCIS uses MySQL/MariaDB — direct read connection without ETL overhead |
| **Redis + BullMQ** | Cron job queue for JHCIS sync, cache for map tiles & queries |
| **MinIO** | S3-compatible object storage for photos, shapefiles, export files |
| **Leaflet + OpenStreetMap** | Free, no API key required, lightweight, offline-capable |
| **JWT + RBAC** | Stateless auth, fine-grained permissions per module |
| **Offline-first PWA** | Service Worker + IndexedDB for FFC field operation |
| **PostGIS (Optional)** | For complex spatial queries when MariaDB Spatial isn't enough |

---

## 2. Technology Stack (Detailed)

### Frontend

| Technology | Version | Purpose |
|-----------|---------|---------|
| Next.js | 16 (latest) | Full-stack framework |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 4.x | Utility-first styling |
| shadcn/ui | latest | Accessible component library |
| Leaflet | 1.9.x | Map rendering |
| react-leaflet | 5.x | React bindings for Leaflet |
| leaflet.markercluster | 1.5.x | Marker clustering |
| leaflet.heat | latest | Heatmap layer |
| TanStack Query | 5.x | Server state & caching |
| Zustand | 5.x | Client state management |
| zustand-persist | — | Persist offline data |
| Zustand/middleware (IndexedDB) | — | Offline-first storage |
| PWA Asset Generator | latest | PWA icons & manifest |
| next-pwa | latest | Service worker generation |
| date-fns | 3.x | Date formatting |
| recharts | 2.x | Charts & graphs |
| react-hook-form | 7.x | Form handling |
| zod | 3.x | Form validation |
| sonner | latest | Toast notifications |
| lucide-react | latest | Icons |
| next-auth | 5.x (Auth.js) | Authentication framework |

### Backend

| Technology | Version | Purpose |
|-----------|---------|---------|
| Next.js API Routes | 16 | REST API endpoints |
| Prisma | 6.x | ORM & migrations |
| Prisma Pulse | — | Real-time DB change streaming |
| next-safe-action | latest | Type-safe server actions |
| BullMQ | 5.x | Background job queue |
| ioredis | 5.x | Redis client |
| zod | 3.x | API validation |
| jsonwebtoken | 9.x | JWT generation & verification |
| bcryptjs | 2.x | Password hashing |
| multer / busboy | — | File upload handling |
| puppeteer / puppeteer-core | latest | PDF generation |
| exceljs | 4.x | Excel export |
| csv-stringify | latest | CSV export |
| node-cron | 3.x | Cron scheduling |

### Database

| Component | Version | Purpose |
|-----------|---------|---------|
| MariaDB | 11.x | Primary application database |
| MariaDB (Spatial) | 11.x | Spatial queries (ST_* functions) |
| MariaDB (JHCIS) | MySQL 5.7+ | Read-only connection to existing JHCIS |
| Redis | 7.x | Cache + queue backend |
| MinIO | latest | Object storage (photos, exports) |

### DevOps

| Tool | Purpose |
|------|---------|
| Docker | Containerization |
| Docker Compose | Multi-service orchestration |
| Coolify | Production hosting |
| Traefik | Reverse proxy + SSL |
| GitHub Actions | CI/CD pipeline |
| Prometheus | Metrics |
| Grafana | Dashboards |
| Loki | Log aggregation |
| Sentry | Error tracking |

---

## 3. Directory Structure

```
geohealth-jhcis/
├── apps/
│   ├── web/                          # Next.js frontend + API
│   │   ├── public/
│   │   │   ├── icons/                # PWA icons
│   │   │   ├── manifest.json         # PWA manifest
│   │   │   ├── sw.js                 # Service worker (generated)
│   │   │   └── tiles/                # Offline map tiles
│   │   │
│   │   ├── src/
│   │   │   ├── app/                  # Next.js App Router
│   │   │   │   ├── (auth)/           # Auth route group
│   │   │   │   │   ├── login/
│   │   │   │   │   └── register/
│   │   │   │   │
│   │   │   │   ├── (dashboard)/      # Dashboard route group (requires auth)
│   │   │   │   │   ├── page.tsx      # Main dashboard
│   │   │   │   │   ├── map/
│   │   │   │   │   ├── households/
│   │   │   │   │   ├── patients/
│   │   │   │   │   ├── analytics/
│   │   │   │   │   ├── ffc/
│   │   │   │   │   ├── reports/
│   │   │   │   │   └── admin/
│   │   │   │   │
│   │   │   │   ├── api/              # API routes
│   │   │   │   │   ├── auth/
│   │   │   │   │   │   ├── login/
│   │   │   │   │   │   ├── refresh/
│   │   │   │   │   │   └── me/
│   │   │   │   │   ├── patients/
│   │   │   │   │   │   ├── search/
│   │   │   │   │   │   ├── [id]/
│   │   │   │   │   │   │   └── profile/
│   │   │   │   │   │   └── nearby/
│   │   │   │   │   ├── houses/
│   │   │   │   │   │   ├── [id]/
│   │   │   │   │   │   └── search/
│   │   │   │   │   ├── villages/
│   │   │   │   │   │   ├── [id]/
│   │   │   │   │   │   └── boundary/
│   │   │   │   │   ├── ffc/
│   │   │   │   │   │   ├── visits/
│   │   │   │   │   │   ├── schedule/
│   │   │   │   │   │   └── sync/
│   │   │   │   │   ├── analytics/
│   │   │   │   │   │   ├── heatmap/
│   │   │   │   │   │   ├── cluster/
│   │   │   │   │   │   └── dashboard/
│   │   │   │   │   ├── reports/
│   │   │   │   │   │   ├── pdf/
│   │   │   │   │   │   └── export/
│   │   │   │   │   ├── sync/
│   │   │   │   │   │   ├── run/
│   │   │   │   │   │   └── status/
│   │   │   │   │   ├── admin/
│   │   │   │   │   ├── upload/
│   │   │   │   │   └── webhooks/
│   │   │   │   │
│   │   │   │   ├── layout.tsx        # Root layout
│   │   │   │   └── providers.tsx     # React providers
│   │   │   │
│   │   │   ├── components/
│   │   │   │   ├── ui/               # shadcn/ui components
│   │   │   │   ├── map/              # Map components
│   │   │   │   │   ├── MapView.tsx
│   │   │   │   │   ├── MapMarker.tsx
│   │   │   │   │   ├── MapCluster.tsx
│   │   │   │   │   ├── HeatmapLayer.tsx
│   │   │   │   │   ├── VillageBoundary.tsx
│   │   │   │   │   ├── LayerControl.tsx
│   │   │   │   │   ├── SearchBox.tsx
│   │   │   │   │   └── Legend.tsx
│   │   │   │   ├── layout/           # Layout components
│   │   │   │   │   ├── Sidebar.tsx
│   │   │   │   │   ├── Header.tsx
│   │   │   │   │   ├── Navbar.tsx
│   │   │   │   │   └── AppShell.tsx
│   │   │   │   ├── dashboard/        # Dashboard components
│   │   │   │   │   ├── StatsCards.tsx
│   │   │   │   │   ├── DiseaseChart.tsx
│   │   │   │   │   └── VillageRanking.tsx
│   │   │   │   ├── patients/         # Patient components
│   │   │   │   │   ├── PatientCard.tsx
│   │   │   │   │   ├── PatientProfile.tsx
│   │   │   │   │   ├── PatientSearch.tsx
│   │   │   │   │   └── PatientHistory.tsx
│   │   │   │   ├── households/       # Household components
│   │   │   │   │   ├── HouseCard.tsx
│   │   │   │   │   ├── HouseMembers.tsx
│   │   │   │   │   └── HouseRiskBadge.tsx
│   │   │   │   ├── ffc/              # FFC components
│   │   │   │   │   ├── VisitForm.tsx
│   │   │   │   │   ├── VisitList.tsx
│   │   │   │   │   ├── VisitChecklist.tsx
│   │   │   │   │   ├── PhotoCapture.tsx
│   │   │   │   │   └── OfflineIndicator.tsx
│   │   │   │   ├── analytics/        # Analytics components
│   │   │   │   │   ├── HeatmapControl.tsx
│   │   │   │   │   ├── ClusterAnalysis.tsx
│   │   │   │   │   └── FilterPanel.tsx
│   │   │   │   └── shared/           # Shared components
│   │   │   │       ├── LoadingSpinner.tsx
│   │   │   │       ├── ErrorBoundary.tsx
│   │   │   │       ├── EmptyState.tsx
│   │   │   │       └── QRScanner.tsx
│   │   │   │
│   │   │   ├── hooks/
│   │   │   │   ├── useAuth.ts
│   │   │   │   ├── useMap.ts
│   │   │   │   ├── useGeolocation.ts
│   │   │   │   ├── useOffline.ts
│   │   │   │   ├── useSync.ts
│   │   │   │   ├── useDebounce.ts
│   │   │   │   └── usePWA.ts
│   │   │   │
│   │   │   ├── lib/
│   │   │   │   ├── prisma.ts         # Prisma client singleton
│   │   │   │   ├── redis.ts          # Redis client
│   │   │   │   ├── auth.ts           # JWT helpers
│   │   │   │   ├── middleware.ts     # Auth middleware
│   │   │   │   ├── rbac.ts           # Role-based access
│   │   │   │   ├── permissions.ts    # Permission definitions
│   │   │   │   ├── utils.ts          # Utilities
│   │   │   │   └── constants.ts      # App constants
│   │   │   │
│   │   │   ├── services/
│   │   │   │   ├── patient.service.ts
│   │   │   │   ├── house.service.ts
│   │   │   │   ├── village.service.ts
│   │   │   │   ├── ffc.service.ts
│   │   │   │   ├── analytics.service.ts
│   │   │   │   ├── sync.service.ts
│   │   │   │   ├── report.service.ts
│   │   │   │   └── auth.service.ts
│   │   │   │
│   │   │   ├── stores/
│   │   │   │   ├── auth.store.ts
│   │   │   │   ├── map.store.ts
│   │   │   │   ├── patient.store.ts
│   │   │   │   ├── ffc.store.ts
│   │   │   │   └── sync.store.ts
│   │   │   │
│   │   │   ├── types/
│   │   │   │   ├── prisma.ts         # Generated Prisma types
│   │   │   │   ├── api.ts            # API request/response types
│   │   │   │   ├── map.ts            # Map-specific types
│   │   │   │   └── jhcis.ts          # JHCIS 43 แฟ้ม types
│   │   │   │
│   │   │   └── workers/
│   │   │       ├── sync.worker.ts    # JHCIS sync worker
│   │   │       ├── report.worker.ts  # Report generation worker
│   │   │       └── backup.worker.ts  # Backup worker
│   │   │
│   │   ├── next.config.ts
│   │   ├── tailwind.config.ts
│   │   ├── tsconfig.json
│   │   ├── package.json
│   │   └── Dockerfile
│   │
│   └── api/                          # (optional) Separate API service
│
├── packages/
│   ├── ui/                           # Shared UI components
│   ├── shared/                       # Shared types & utilities
│   └── config/                       # Shared configs
│
├── services/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── migrations/
│   │   └── seed.ts
│   │
│   ├── sync-worker/
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── jhcis-connector.ts
│   │   │   ├── mappers/
│   │   │   ├── validators/
│   │   │   └── utils/
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   └── backup/
│       ├── backup.sh
│       └── README.md
│
├── infrastructure/
│   ├── docker-compose.yml
│   ├── docker-compose.prod.yml
│   ├── traefik/
│   │   ├── traefik.yml
│   │   └── dynamic.yml
│   ├── prometheus/
│   │   └── prometheus.yml
│   ├── grafana/
│   │   └── provisioning/
│   └── nginx/
│       └── default.conf
│
├── docs/
│   ├── PRD.md
│   ├── DESIGN.md (this file)
│   ├── API.md
│   ├── DEPLOYMENT.md
│   └── USER_GUIDE.md
│
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── deploy.yml
│
├── .gitignore
├── .env.example
├── package.json                    # Root workspace config
├── turbo.json                      # Turborepo config
├── Dockerfile                      # Root Dockerfile
└── README.md
```

---

## 4. Database Schema

### 4.1 Prisma Schema

```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["fullTextSearch", "postgresqlExtensions"]
}

datasource db {
  provider = "mysql"  // MariaDB 11.x
  url      = env("DATABASE_URL")
}

// ═══════════════════════════════════════
// AUTHENTICATION & AUTHORIZATION
// ═══════════════════════════════════════

model User {
  id            String   @id @default(cuid())
  username      String   @unique
  passwordHash  String
  displayName   String
  email         String?
  phone         String?
  role          Role     @default(VIEWER)
  villageCode   String?  // Restricted to this village (null = all)
  districtCode  String?  // Restricted to this district
  provinceCode  String?  // Restricted to this province
  isActive      Boolean  @default(true)
  lastLogin     DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  refreshTokens RefreshToken[]
  auditLogs     AuditLog[]
  ffcVisits     FFCVisit[]

  @@index([role])
  @@index([villageCode])
}

model RefreshToken {
  id        String   @id @default(cuid())
  userId    String
  token     String   @unique
  expiresAt DateTime
  device    String?
  ip        String?
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([token])
}

enum Role {
  ADMIN
  DISTRICT
  HOSPITAL
  FFC
  VIEWER
}

// ═══════════════════════════════════════
// GEOGRAPHIC HIERARCHY
// ═══════════════════════════════════════

model Province {
  code       String      @id
  nameTh     String      // ชื่อไทย
  nameEn     String?     // ชื่ออังกฤษ
  districts  District[]
  createdAt  DateTime    @default(now())
  updatedAt  DateTime    @updatedAt
}

model District {
  code         String      @id
  nameTh       String      // ชื่ออำเภอ
  nameEn       String?
  provinceCode String
  province     Province    @relation(fields: [provinceCode], references: [code])
  subDistricts SubDistrict[]
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt

  @@index([provinceCode])
}

model SubDistrict {
  code          String    @id           // รหัสตำบล 6 หลัก
  nameTh        String                  // ชื่อตำบล
  nameEn        String?
  districtCode  String
  district      District  @relation(fields: [districtCode], references: [code])
  villages      Village[]
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@index([districtCode])
}

model Village {
  id             String       @id @default(cuid())
  code           String       @unique     // รหัสหมู่บ้าน
  name           String                   // ชื่อหมู่บ้าน
  moo            Int?                     // หมู่ที่
  subDistrictCode String
  subDistrict    SubDistrict  @relation(fields: [subDistrictCode], references: [code])
  boundary       Unsupported("POLYGON")? // Village polygon
  centerLat      Float?
  centerLng      Float?
  houses         House[]
  riskZones      RiskZone[]
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  @@index([subDistrictCode])
  @@index([code])
  @@index([name])
}

// ═══════════════════════════════════════
// HOUSEHOLD & PATIENT
// ═══════════════════════════════════════

model House {
  id           String       @id @default(cuid())
  houseNo      String?                 // บ้านเลขที่
  moo          Int?                    // หมู่ที่
  villageId    String
  village      Village      @relation(fields: [villageId], references: [id])
  lat          Float?
  lng          Float?
  address      String?                 // ที่อยู่เต็ม
  riskLevel    RiskLevel    @default(NORMAL)
  qrCode       String?                 // QR code token for check-in
  patients     Patient[]
  ffcVisits    FFCVisit[]

  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt

  @@index([villageId])
  @@index([lat, lng])
  @@index([houseNo])
  @@index([qrCode])
}

enum RiskLevel {
  CRITICAL   // แดง: DM+HT+Stroke
  HIGH       // ส้ม: Elderly / High risk
  MEDIUM     // เหลือง: Risk factors
  NORMAL     // เขียว: ปกติ
}

model Patient {
  id            String        @id @default(cuid())
  cid           String?       @unique     // เลขบัตร 13 หลัก
  hn            String?       @unique     // Hospital number
  fullName      String                    // ชื่อ-นามสกุล
  firstName     String?
  lastName      String?
  birthDate     DateTime?
  age           Int?
  gender        Gender?
  phone         String?
  houseId       String?
  house         House?        @relation(fields: [houseId], references: [id])
  lat           Float?                    // If different from house
  lng           Float?                    // If GPS-pinned separately
  riskLevel     RiskLevel     @default(NORMAL)
  chronicDisease String?      // JSON array of chronic codes
  drugAllergy   String?
  disability    Boolean?
  bedridden     Boolean?
  imageUrl      String?
  lastSyncAt    DateTime?
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  chronicRecords   ChronicRecord[]
  visitRecords     VisitRecord[]
  labResults       LabResult[]
  drugRecords      DrugRecord[]
  ffcVisits        FFCVisit[]
  syncLogs         SyncLog[]

  @@index([cid])
  @@index([hn])
  @@index([fullName])
  @@index([houseId])
  @@index([lat, lng])
  @@index([riskLevel])

  @@fulltext([fullName, firstName, lastName])
}

enum Gender {
  MALE
  FEMALE
  UNKNOWN
}

// ═══════════════════════════════════════
// HEALTH DATA (from JHCIS 43 แฟ้ม)
// ═══════════════════════════════════════

model ChronicRecord {
  id            String   @id @default(cuid())
  patientId     String
  patient       Patient  @relation(fields: [patientId], references: [id])
  diseaseCode   String               // ICD-10
  diseaseName   String               // ชื่อโรค
  diagnosedDate DateTime?
  severity      String?              // severity level
  isActive      Boolean  @default(true)
  lastFollowUp  DateTime?
  hospitalCode  String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([patientId])
  @@index([diseaseCode])
}

model VisitRecord {
  id            String   @id @default(cuid())
  patientId     String
  patient       Patient  @relation(fields: [patientId], references: [id])
  visitDate     DateTime
  hospitalCode  String?
  diagnosisCode String?
  diagnosisName String?
  visitType     String?  // OPD / IPD / ER
  doctorName    String?
  createdAt     DateTime @default(now())

  @@index([patientId])
  @@index([visitDate])
}

model LabResult {
  id          String   @id @default(cuid())
  patientId   String
  patient     Patient  @relation(fields: [patientId], references: [id])
  labDate     DateTime
  labCode     String?
  labName     String
  result      String
  unit        String?
  normalRange String?
  abnormal    Boolean  @default(false)
  createdAt   DateTime @default(now())

  @@index([patientId])
  @@index([labDate])
}

model DrugRecord {
  id          String   @id @default(cuid())
  patientId   String
  patient     Patient  @relation(fields: [patientId], references: [id])
  drugCode    String?
  drugName    String
  dosage      String?
  frequency   String?
  startDate   DateTime?
  endDate     DateTime?
  prescriber  String?
  createdAt   DateTime @default(now())

  @@index([patientId])
}

// ═══════════════════════════════════════
// FFC (Home Visit)
// ═══════════════════════════════════════

model FFCVisit {
  id             String         @id @default(cuid())
  patientId      String
  patient        Patient        @relation(fields: [patientId], references: [id])
  houseId        String?
  house          House?         @relation(fields: [houseId], references: [id])
  userId         String?
  user           User?          @relation(fields: [userId], references: [id])
  visitDate      DateTime       @default(now())
  checkInLat     Float?                    // GPS check-in
  checkInLng     Float?
  checkInAccuracy Float?
  visitType      VisitType      @default(ROUTINE)
  status         VisitStatus    @default(PLANNED)
  notes          String?                   // บันทึกการเยี่ยม
  voiceNoteUrl   String?                   // Voice note (MinIO URL)
  photoUrls      String?                   // JSON array of photo URLs
  checklist      String?                   // JSON checklist results
  nextVisitDate  DateTime?
  isOfflineSync  Boolean        @default(false) // Synced from offline device
  offlineId      String?                   // Offline UUID for dedup
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt

  @@index([patientId])
  @@index([houseId])
  @@index([userId])
  @@index([visitDate])
  @@index([status])
  @@index([offlineId])
  @@index([checkInLat, checkInLng])
}

enum VisitType {
  ROUTINE
  FOLLOW_UP
  EMERGENCY
  ASSESSMENT
  OTHER
}

enum VisitStatus {
  PLANNED
  IN_PROGRESS
  COMPLETED
  CANCELLED
  MISSED
}

// ═══════════════════════════════════════
// GIS / SPATIAL
// ═══════════════════════════════════════

model RiskZone {
  id          String       @id @default(cuid())
  villageId   String
  village     Village      @relation(fields: [villageId], references: [id])
  name        String
  level       RiskLevel    @default(NORMAL)
  boundary    Unsupported("POLYGON")? // Zone polygon
  color       String       @default("#22c55e") // Green
  description String?
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  @@index([villageId])
}

model MapLayer {
  id          String   @id @default(cuid())
  name        String
  type        String   // heatmap, marker, polygon, cluster
  visible     Boolean  @default(true)
  opacity     Float    @default(1.0)
  config      String?  // JSON config
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

// ═══════════════════════════════════════
// SYNC MANAGEMENT
// ═══════════════════════════════════════

model SyncLog {
  id          String    @id @default(cuid())
  tableName   String               // 43 แฟ้ม table name
  patientId   String?
  patient     Patient?  @relation(fields: [patientId], references: [id])
  action      SyncAction           // CREATE, UPDATE, DELETE
  status      SyncStatus           // SUCCESS, FAILED, PENDING
  recordCount Int       @default(0)
  error       String?              // Error message if failed
  startedAt   DateTime
  completedAt DateTime?
  durationMs  Int?                 // How long it took
  createdAt   DateTime  @default(now())

  @@index([tableName])
  @@index([status])
  @@index([startedAt])
}

enum SyncAction {
  CREATE
  UPDATE
  DELETE
  FULL_SYNC
}

enum SyncStatus {
  PENDING
  RUNNING
  SUCCESS
  FAILED
}

// ═══════════════════════════════════════
// AUDIT
// ═══════════════════════════════════════

model AuditLog {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  action      String   // e.g. "PATIENT_VIEW", "FFC_CREATE", "SYNC_RUN"
  resource    String   // e.g. "patient", "ffc_visit"
  resourceId  String?  // ID of affected resource
  detail      String?  // JSON additional detail
  ipAddress   String?
  userAgent   String?
  createdAt   DateTime @default(now())

  @@index([userId])
  @@index([action])
  @@index([createdAt])
  @@index([resource, resourceId])
}
```

### 4.2 Spatial Index Notes

```sql
-- Add spatial indexes for GIS queries
CREATE SPATIAL INDEX idx_village_boundary ON Village(boundary);
CREATE SPATIAL INDEX idx_riskzone_boundary ON RiskZone(boundary);

-- Spatial query examples:
-- Find patients within 5km of a point:
SELECT p.* FROM Patient p
WHERE ST_Distance_Sphere(
  POINT(p.lng, p.lat),
  POINT(100.5, 13.7)
) <= 5000;

-- Find patients within a village polygon:
SELECT p.* FROM Patient p
JOIN House h ON p.house_id = h.id
JOIN Village v ON h.village_id = v.id
WHERE ST_Contains(v.boundary, POINT(p.lng, p.lat));

-- Heatmap query (count by grid cell):
SELECT
  ROUND(lat * 100) / 100 AS grid_lat,
  ROUND(lng * 100) / 100 AS grid_lng,
  COUNT(*) AS patient_count,
  GROUP_CONCAT(DISTINCT cr.disease_code) AS diseases
FROM Patient p
LEFT JOIN ChronicRecord cr ON cr.patient_id = p.id
GROUP BY grid_lat, grid_lng;
```

---

## 5. API Design

### 5.1 Base URL & Conventions

- **Base:** `/api/v1`
- **Format:** JSON
- **Auth:** Bearer JWT token in `Authorization` header
- **Pagination:** `?page=1&limit=50` — returned with `total`, `page`, `limit`, `totalPages`

### 5.2 Response Envelope

```typescript
// Success
{
  "success": true,
  "data": { ... },
  "pagination": { "total": 100, "page": 1, "limit": 50, "totalPages": 2 }
}

// Error
{
  "success": false,
  "error": {
    "code": "PATIENT_NOT_FOUND",
    "message": "ไม่พบผู้ป่วยในระบบ",
    "details": { "cid": "1234567890123" }
  }
}
```

### 5.3 Endpoints

#### Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/auth/login` | No | Login with username/password |
| POST | `/api/v1/auth/refresh` | No | Refresh JWT token |
| GET | `/api/v1/auth/me` | Yes | Get current user profile |
| POST | `/api/v1/auth/logout` | Yes | Invalidate refresh token |

**POST /api/v1/auth/login**
```json
{
  "username": "nurse01",
  "password": "********"
}
// → { "accessToken": "...", "refreshToken": "...", "user": { ... } }
```

#### Patients

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/patients` | Yes | List patients (paginated, filterable) |
| GET | `/api/v1/patients/search` | Yes | Search patients (CID, HN, name) |
| GET | `/api/v1/patients/:id` | Yes | Get patient details |
| GET | `/api/v1/patients/:id/profile` | Yes | Full patient profile (chronic, visits, labs) |
| GET | `/api/v1/patients/nearby` | Yes | Find patients near a GPS point |
| GET | `/api/v1/patients/heatmap` | Yes | Heatmap data for disease |

**Query Parameters for `/patients`:**

| Param | Type | Description |
|-------|------|-------------|
| page | int | Page number (default: 1) |
| limit | int | Items per page (default: 50, max: 200) |
| riskLevel | string | Filter by risk level |
| chronicCode | string | Filter by chronic disease (ICD-10) |
| villageId | string | Filter by village |
| ageMin | int | Minimum age |
| ageMax | int | Maximum age |
| gender | string | MALE / FEMALE |
| sort | string | Field to sort by |
| order | string | asc / desc |

**GET /api/v1/patients/search?q=1234567890123**
```json
{
  "success": true,
  "data": [
    {
      "id": "clx...",
      "cid": "1234567890123",
      "hn": "HN-001234",
      "fullName": "นาย สมชาย ใจดี",
      "age": 65,
      "gender": "MALE",
      "riskLevel": "CRITICAL",
      "house": { "houseNo": "123/4", "village": { "name": "หมู่ 3" } },
      "lat": 15.2345,
      "lng": 102.3456
    }
  ]
}
```

#### Houses

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/houses` | Yes | List houses (paginated) |
| GET | `/api/v1/houses/search` | Yes | Search by house no / address |
| GET | `/api/v1/houses/:id` | Yes | Get house with members |
| PATCH | `/api/v1/houses/:id` | Yes | Update house (lat/lng, risk level) |

#### Villages

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/villages` | Yes | List villages (by district) |
| GET | `/api/v1/villages/:id` | Yes | Village details + stats |
| GET | `/api/v1/villages/:id/boundary` | Yes | Village polygon GeoJSON |

#### Map / GIS

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/map/markers` | Yes | All house/patient markers for map |
| GET | `/api/v1/map/markers/:bbox` | Yes | Markers within bounding box |
| GET | `/api/v1/map/clusters` | Yes | Cluster data for zoom level |
| GET | `/api/v1/map/heatmap` | Yes | Heatmap data |
| GET | `/api/v1/map/heatmap/:disease` | Yes | Heatmap by disease code |
| GET | `/api/v1/map/legend` | No | Map legend configuration |

**GET /api/v1/map/heatmap/diabetes**
```json
{
  "success": true,
  "data": [
    { "lat": 15.234, "lng": 102.345, "intensity": 12 },
    { "lat": 15.235, "lng": 102.346, "intensity": 8 }
  ]
}
```

#### FFC (Home Visits)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/ffc/visits` | Yes | List visits (filterable) |
| POST | `/api/v1/ffc/visits` | Yes | Create a new visit |
| GET | `/api/v1/ffc/visits/:id` | Yes | Get visit detail |
| PATCH | `/api/v1/ffc/visits/:id` | Yes | Update visit |
| GET | `/api/v1/ffc/schedule` | Yes | Today's schedule for logged-in user |
| POST | `/api/v1/ffc/sync` | Yes | Sync offline visits (batch) |

**POST /api/v1/ffc/visits**
```json
{
  "patientId": "clx...",
  "houseId": "clx...",
  "visitDate": "2026-05-19T09:00:00Z",
  "checkInLat": 15.2345,
  "checkInLng": 102.3456,
  "visitType": "ROUTINE",
  "notes": "ผู้ป่วยอาการดีขึ้น",
  "photos": ["data:image/jpeg;base64,..."],
  "voiceNote": "data:audio/ogg;base64,...",
  "checklist": {
    "bloodPressure": "120/80",
    "bloodSugar": 140,
    "medicationAdherence": true,
    "woundCondition": "normal"
  }
}
```

#### Analytics

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/analytics/dashboard` | Yes | Dashboard stats |
| GET | `/api/v1/analytics/disease-stats` | Yes | Disease statistics |
| GET | `/api/v1/analytics/cluster` | Yes | Cluster detection results |
| GET | `/api/v1/analytics/village-ranking` | Yes | Village ranking by metrics |
| GET | `/api/v1/analytics/trends` | Yes | Trend analysis |

#### Reports

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/reports/pdf` | Yes | Generate PDF report |
| POST | `/api/v1/reports/excel` | Yes | Export Excel |
| POST | `/api/v1/reports/csv` | Yes | Export CSV |
| POST | `/api/v1/reports/geojson` | Yes | Export GeoJSON |
| POST | `/api/v1/reports/shapefile` | Yes | Export Shapefile (zip) |

#### Sync

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/sync/run` | Admin | Trigger JHCIS sync manually |
| GET | `/api/v1/sync/status` | Admin | Sync status & last run |
| GET | `/api/v1/sync/log` | Admin | Sync log history |
| POST | `/api/v1/sync/schedule` | Admin | Update sync schedule |

---

## 6. Frontend Architecture

### 6.1 App Router Layout

```
app/
├── layout.tsx          ← Root layout (metadata, fonts, providers)
├── providers.tsx       ← React context providers
│
├── (auth)/
│   └── login/
│       └── page.tsx    ← Login page (no sidebar)
│
├── (dashboard)/        ← All authenticated pages
│   ├── layout.tsx      ← Dashboard layout (sidebar + header)
│   │
│   ├── page.tsx        ← Main map view (default landing)
│   ├── loading.tsx     ← Loading state
│   ├── error.tsx       ← Error boundary
│   │
│   ├── map/
│   │   └── page.tsx    ← Full screen map
│   │
│   ├── households/
│   │   └── page.tsx    ← Household list + map
│   │
│   ├── patients/
│   │   ├── page.tsx    ← Patient list + search
│   │   └── [id]/
│   │       └── page.tsx ← Patient profile
│   │
│   ├── analytics/
│   │   └── page.tsx    ← Heatmap + clusters
│   │
│   ├── ffc/
│   │   ├── page.tsx    ← FFC dashboard
│   │   ├── visits/
│   │   │   └── page.tsx ← Visit list
│   │   └── schedule/
│   │       └── page.tsx ← Today's schedule
│   │
│   ├── reports/
│   │   └── page.tsx    ← Report center
│   │
│   ├── admin/
│   │   ├── page.tsx    ← Admin dashboard
│   │   ├── users/
│   │   │   └── page.tsx ← User management
│   │   ├── sync/
│   │   │   └── page.tsx ← Sync management
│   │   └── settings/
│   │       └── page.tsx ← System settings
│   │
│   └── profile/
│       └── page.tsx    ← User profile
```

### 6.2 Route Groups & Middleware

```typescript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { checkPermission } from '@/lib/rbac';

const publicPaths = ['/login', '/api/v1/auth/login', '/api/v1/auth/refresh'];
const rolePaths: Record<string, string[]> = {
  '/admin': ['ADMIN'],
  '/ffc': ['ADMIN', 'DISTRICT', 'HOSPITAL', 'FFC'],
  '/analytics': ['ADMIN', 'DISTRICT', 'HOSPITAL'],
  '/reports': ['ADMIN', 'DISTRICT', 'HOSPITAL'],
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip public paths
  if (publicPaths.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Verify JWT
  const token = request.cookies.get('accessToken')?.value
    || request.headers.get('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const payload = verifyToken(token);
  if (!payload) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Check role-based access
  for (const [path, roles] of Object.entries(rolePaths)) {
    if (pathname.startsWith(path) && !roles.includes(payload.role)) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}
```

---

## 7. Component Tree

### 7.1 Main Map View (Default Landing)

```
AppShell
├── Header
│   ├── Logo
│   ├── SearchBox (global search)
│   │   ├── SearchType (CID / Name / HN / HouseNo)
│   │   ├── QueryInput
│   │   ├── SearchResults (dropdown)
│   │   └── QRScannerButton
│   ├── RoleBadge
│   ├── OfflineIndicator
│   └── UserMenu
│       ├── ProfileLink
│       ├── AdminLink (if ADMIN)
│       └── LogoutButton
│
├── Sidebar (collapsible)
│   ├── NavLinks
│   │   ├── Map (active)
│   │   ├── Households
│   │   ├── Patients
│   │   ├── Analytics
│   │   ├── FFC
│   │   ├── Reports
│   │   └── Admin (if ADMIN)
│   └── QuickStats
│       ├── PopulationCount
│       ├── ChronicCount
│       └── FFCVisitToday
│
└── MainContent
    └── MapView (full height, fills remaining space)
        ├── BaseMap (OpenStreetMap tiles)
        ├── VillageBoundary (Polygon layer)
        ├── MarkerCluster
        │   ├── HouseMarker (color by risk level)
        │   │   └── Popup
        │   │       ├── HouseInfo (house no, address)
        │   │       └── PatientList (members in house)
        │   └── MarkerCount
        ├── HeatmapLayer (toggle)
        ├── LayerControl (bottom-right)
        │   ├── LayerToggle[]
        │   └── OpacitySlider
        ├── MapLegend (bottom-left)
        ├── ZoomControl
        ├── GPSLocateButton
        ├── FullScreenButton
        └── MapTooltip (on hover)
```

### 7.2 Dashboard View

```
DashboardPage
├── StatsCards
│   ├── PopulationCard
│   ├── ChronicCard
│   ├── BedriddenCard
│   ├── RiskGroupCard
│   └── FFCCard
│
├── DashboardGrid
│   ├── MiniMap (small overview map with markers)
│   ├── DiseaseChart (bar/line chart by disease)
│   ├── VillageRanking (table sorted by metric)
│   ├── FFCToday (recent visits list)
│   └── TrendChart (30-day trend)
│
└── FilterBar
    ├── DistrictFilter
    ├── VillageFilter
    ├── DateRangePicker
    └── RefreshButton
```

### 7.3 Patient Profile View

```
PatientProfilePage
├── PatientHeader
│   ├── PatientPhoto
│   ├── PatientName
│   ├── AgeGender
│   ├── RiskLevelBadge
│   └── QuickActions
│       ├── ViewOnMap
│       ├── ScheduleFFCVisit
│       └── PrintReport
│
├── PatientTabs
│   ├── Tab: Overview
│   │   ├── PersonalInfo (CID, HN, DOB, phone)
│   │   ├── AddressInfo (house no, village, GPS)
│   │   ├── ChronicDiseaseList (with active/inactive)
│   │   └── RiskAssessment
│   │
│   ├── Tab: Medical
│   │   ├── MedicationList
│   │   ├── LabResults (table)
│   │   └── VisitHistory (timeline)
│   │
│   ├── Tab: FFC
│   │   ├── VisitHistory (timeline)
│   │   ├── ChecklistHistory
│   │   └── NextScheduledVisit
│   │
│   └── Tab: Map
│       └── MiniMap (patient's house location)
```

### 7.4 FFC Visit Flow

```
FFCSchedulePage
├── ScheduleHeader
│   ├── DateSelector
│   ├── VisitCount
│   └── SyncButton
│
├── VisitList
│   └── VisitCard[]
│       ├── PatientInfo (name, age, risk level)
│       ├── HouseAddress
│       ├── Distance (from current GPS)
│       ├── VisitStatus (planned/in-progress/completed)
│       └── ActionButton
│           ├── "Start Visit"
│           ├── "Continue" (if in-progress)
│           └── "View" (if completed)
│
└── CreateVisitButton (floating action)

VisitForm (modal)
├── PatientSelector (search + select)
├── VisitDatePicker
├── GPSLocation (auto from device)
├── VisitTypeSelect
├── ChecklistForm (structured)
│   ├── BloodPressureInput
│   ├── BloodSugarInput
│   ├── WeightInput
│   ├── MedicationAdherenceToggle
│   ├── WoundConditionSelect
│   └── CustomFields
├── NotesTextarea
├── PhotoCapture (camera)
├── VoiceNoteRecord (mic)
├── NextVisitDatePicker
└── SaveButton (online: save to API, offline: save to IndexedDB)
```

---

## 8. Data Flow Diagrams

### 8.1 Map Load Flow

```
User opens Map
     │
     ▼
[MapView] mounts
     │
     ├── Initialize Leaflet map
     │   ├── Load OpenStreetMap tiles
     │   └── Set default center (user's district)
     │
     ├── Fetch village boundaries
     │   └── GET /api/v1/villages/:districtId/boundary
     │       └── Prisma: Village.findMany({ where: { districtCode } })
     │       └── Response: GeoJSON FeatureCollection
     │
     ├── Fetch patient markers
     │   └── GET /api/v1/map/markers?bbox=...&village=...
     │       └── Prisma: Patient.findMany({ where: { house: { villageId } } })
     │       └── Apply RLS: filter by user's scope
     │       └── Response: { markers: [...], clusters: [...] }
     │
     ├── Apply MarkerCluster
     │   └── leaflet.markercluster groups nearby markers
     │
     └── Render legend + controls
```

### 8.2 Search Flow

```
User types in SearchBox
     │
     ▼
[SearchBox] (debounced 300ms)
     │
     ├── Detect search type:
     │   ├── 13 digits → CID search
     │   ├── Starts with "HN-" → HN search
     │   ├── Has "/" or "." → house number
     │   └── Otherwise → name search (fuzzy)
     │
     ├── GET /api/v1/patients/search?q=...
     │   └── Prisma:
     │     └── CID: findUnique({ where: { cid } })
     │     └── Name: findMany({ where: { fullName: { contains: q } } })
     │     └── Apply RLS
     │   └── Response: Patient[]
     │
     ├── Show dropdown results
     │   └── PatientCard (name, cid, risk badge, address)
     │
     └── User selects result
         ├── Fly map to patient's house
         ├── Open PatientProfile (if desktop) OR
         └── Navigate to /patients/:id (if mobile)
```

### 8.3 FFC Visit Flow

```
FFC opens app
     │
     ▼
[FFCSchedulePage] loads
     │
     ├── Check online status
     │   ├── Online → GET /api/v1/ffc/schedule
     │   │   └── Save to IndexedDB (cache for offline)
     │   └── Offline → Load from IndexedDB
     │
     ├── User selects a visit → "Start Visit"
     │
     ├── [VisitForm] opens
     │   ├── GPS Check-in
     │   │   └── navigator.geolocation.getCurrentPosition()
     │   │
     │   ├── User fills checklist
     │   ├── Takes photo
     │   ├── Records voice note
     │   └── Saves
     │
     ├── Save logic:
     │   ├── Online → POST /api/v1/ffc/visits
     │   │   └── Save photo to MinIO
     │   │   └── Save voice note to MinIO
     │   └── Offline → Save to IndexedDB
     │       └── { ...visit, isOfflineSync: true, offlineId: uuid }
     │
     └── Sync flow (when online):
         └── POST /api/v1/ffc/sync
             └── Body: [offlineVisit[], ...]
             └── Server: dedup by offlineId, save photo/voice
             └── Response: { synced: [...], failed: [...] }
```

### 8.4 JHCIS Sync Flow

```
[Cron: Every 6 hours]
     │
     ▼
[BullMQ Queue: jhcis-sync]
     │
     ├── SyncWorker picks up job
     │
     ├── Connect to JHCIS (read-only MariaDB)
     │   └── credentials from env (encrypted)
     │
     ├── For each table in sync priority:
     │   ├── person → INSERT/UPDATE in Patient table
     │   ├── house → INSERT/UPDATE in House table
     │   ├── chronic → INSERT/UPDATE in ChronicRecord
     │   └── ...
     │
     ├── Sync strategy:
     │   ├── Full sync: TRUNCATE + INSERT (first time only)
     │   ├── Incremental: WHERE updated_at > last_sync_at
     │   └── Using batch: 1000 records per INSERT
     │
     ├── Conflict resolution:
     │   ├── Newer updated_at wins (JHCIS = source of truth)
     │   ├── GeoHealth-specific fields NOT overwritten
     │   │   └── (lat, lng, qr_code, risk_level from FFC visits)
     │
     ├── Log result to SyncLog table
     │
     └── Emit event: Redis PUBLISH + WebSocket notify
         └── Frontend: Show toast "Sync complete: 1,234 records updated"
```

---

## 9. Offline Strategy (FFC PWA)

### 9.1 Service Worker

```typescript
// public/sw.ts (compiled to sw.js)
// Strategy: Cache-first for static assets, Network-first with cache fallback for API

const CACHE_VERSION = 'v1';
const STATIC_CACHE = `geohealth-static-${CACHE_VERSION}`;
const TILES_CACHE = `geohealth-tiles-${CACHE_VERSION}`;
const API_CACHE = `geohealth-api-${CACHE_VERSION}`;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll([
        '/',
        '/manifest.json',
        '/icons/icon-192.png',
        '/icons/icon-512.png',
        '/fallback-offline.html',
      ]);
    })
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Map tiles: cache-first (huge performance gain)
  if (request.url.includes('tile.openstreetmap.org')) {
    event.respondWith(cacheFirst(request, TILES_CACHE));
    return;
  }

  // API: network-first with cache fallback
  if (request.url.startsWith('/api/')) {
    event.respondWith(networkFirst(request, API_CACHE));
    return;
  }

  // Static assets: cache-first
  event.respondWith(cacheFirst(request, STATIC_CACHE));
});

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
    return response;
  } catch {
    return caches.match('/fallback-offline.html');
  }
}

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ error: 'offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
```

### 9.2 IndexedDB Schema

```typescript
// stores/ffc.store.ts — Zustand with IndexedDB persist

interface FFCStore {
  // Pending visits (not yet synced)
  pendingVisits: OfflineVisit[];

  // Cached schedule (for offline viewing)
  cachedSchedule: VisitSchedule[];

  // Sync queue
  syncQueue: OfflineAction[];

  // Operations
  addPendingVisit: (visit: OfflineVisit) => void;
  syncAll: () => Promise<SyncResult>;
  getCachedSchedule: () => Promise<VisitSchedule[]>;
}

interface OfflineVisit {
  offlineId: string;     // UUID generated on device
  patientId: string;
  houseId: string;
  visitDate: string;
  checkInLat: number;
  checkInLng: number;
  visitType: VisitType;
  notes?: string;
  photos: string[];      // base64 (compressed)
  voiceNote?: string;    // base64 (compressed)
  checklist: Record<string, unknown>;
  createdAt: string;
  syncedAt?: string;
}
```

### 9.3 Background Sync

```typescript
// hooks/useSync.ts
export function useSync() {
  const { isOnline } = useOffline();
  const { pendingVisits, syncQueue } = useFFCStore();

  useEffect(() => {
    if (!isOnline || pendingVisits.length === 0) return;

    const syncInterval = setInterval(async () => {
      try {
        const result = await fetch('/api/v1/ffc/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ visits: pendingVisits }),
        });

        if (result.ok) {
          const { synced } = await result.json();
          // Remove synced items from queue
          useFFCStore.getState().removeSynced(synced);
        }
      } catch (error) {
        console.warn('Sync failed, will retry:', error);
      }
    }, 30000); // Retry every 30 seconds

    return () => clearInterval(syncInterval);
  }, [isOnline, pendingVisits.length]);
}
```

---

## 10. State Management

### 10.1 State Architecture

```
┌─────────────────────────────────────────────────┐
│                   Server State                    │
│            (TanStack Query / React Query)         │
│  ┌───────────┐ ┌──────────┐ ┌──────────────────┐ │
│  │ Patients  │ │ Houses   │ │ FFC Visits       │ │
│  │ Cache     │ │ Cache    │ │ Cache            │ │
│  └───────────┘ └──────────┘ └──────────────────┘ │
└─────────────────────┬─────────────────────────────┘
                      │
┌─────────────────────▼─────────────────────────────┐
│                   Client State                     │
│             (Zustand + IndexedDB persist)          │
│  ┌───────────┐ ┌──────────┐ ┌──────────────────┐ │
│  │ Map State │ │ Auth     │ │ FFC (Offline)    │ │
│  │ (zoom,    │ │ (user,   │ │ (pending visits, │ │
│  │  center,  │ │  token)  │ │  sync queue)     │ │
│  │  layers)  │ │          │ │                  │ │
│  └───────────┘ └──────────┘ └──────────────────┘ │
└───────────────────────────────────────────────────┘
```

### 10.2 TanStack Query Setup

```typescript
// hooks/queries/usePatients.ts
export function usePatients(filters: PatientFilters) {
  return useQuery({
    queryKey: ['patients', filters],
    queryFn: () => fetchPatients(filters),
    staleTime: 5 * 60 * 1000,      // 5 minutes
    gcTime: 30 * 60 * 1000,         // 30 minutes
    placeholderData: keepPreviousData,
  });
}

export function usePatientSearch(query: string) {
  return useQuery({
    queryKey: ['patients', 'search', query],
    queryFn: () => searchPatients(query),
    enabled: query.length >= 3,
    staleTime: 60 * 1000,            // 1 minute (fresh data)
    debounce: 300,
  });
}

export function useHeatmapData(disease: string, dateRange: DateRange) {
  return useQuery({
    queryKey: ['heatmap', disease, dateRange],
    queryFn: () => fetchHeatmap(disease, dateRange),
    staleTime: 15 * 60 * 1000,       // 15 minutes
    gcTime: 60 * 60 * 1000,          // 1 hour
  });
}
```

### 10.3 Zustand Stores

```typescript
// stores/map.store.ts
interface MapState {
  center: [number, number];
  zoom: number;
  activeLayers: string[];
  selectedMarkerId: string | null;

  setCenter: (center: [number, number]) => void;
  setZoom: (zoom: number) => void;
  toggleLayer: (layer: string) => void;
  selectMarker: (id: string | null) => void;
  flyToPatient: (patientId: string) => void;
  flyToHouse: (houseId: string) => void;
}

// stores/auth.store.ts
interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;

  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refreshSession: () => Promise<void>;
}
```

---

## 11. Caching Strategy

### 11.1 Redis Cache Layout

| Key Pattern | Type | TTL | Purpose |
|-------------|------|-----|---------|
| `tile:{z}:{x}:{y}` | String (binary) | 7 days | Map tile cache |
| `village:{id}:boundary` | String (GeoJSON) | 1 day | Village polygon |
| `heatmap:{disease}:{date}` | String (JSON) | 15 min | Heatmap data |
| `patient:{id}:profile` | String (JSON) | 5 min | Full patient profile |
| `search:{query}` | String (JSON) | 1 min | Search results |
| `dashboard:{district}` | String (JSON) | 5 min | Dashboard stats |
| `session:{token}` | String (JSON) | 24h | Session cache |
| `rate:limit:{ip}` | Counter | 1 min | Rate limiting |

### 11.2 Cache Implementation

```typescript
// services/cache.service.ts
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL!);

export const cache = {
  async get<T>(key: string): Promise<T | null> {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  },

  async set<T>(key: string, value: T, ttl: number): Promise<void> {
    await redis.setex(key, ttl, JSON.stringify(value));
  },

  async invalidate(pattern: string): Promise<void> {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) await redis.del(...keys);
  },

  // For map tiles: binary cache (no JSON parse overhead)
  async getTile(key: string): Promise<Buffer | null> {
    const data = await redis.getBuffer(key);
    return data || null;
  },

  async setTile(key: string, tile: Buffer, ttl: number): Promise<void> {
    await redis.setex(key, ttl, tile);
  },
};
```

---

## 12. Security Implementation

### 12.1 Authentication Middleware

```typescript
// lib/auth.ts
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET!;
const ACCESS_TOKEN_TTL = '24h';
const REFRESH_TOKEN_TTL = '7d';

export function generateTokens(user: User) {
  const accessToken = jwt.sign(
    { userId: user.id, role: user.role, scope: { village: user.villageCode, district: user.districtCode } },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_TTL }
  );

  const refreshToken = jwt.sign(
    { userId: user.id, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: REFRESH_TOKEN_TTL }
  );

  return { accessToken, refreshToken };
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
```

### 12.2 RBAC Implementation

```typescript
// lib/permissions.ts
export type Permission =
  | 'patient:read'
  | 'patient:write'
  | 'house:read'
  | 'house:write'
  | 'ffc:read'
  | 'ffc:write'
  | 'analytics:read'
  | 'reports:create'
  | 'admin:users'
  | 'admin:sync'
  | 'admin:settings';

const rolePermissions: Record<Role, Permission[]> = {
  ADMIN: [
    'patient:read', 'patient:write',
    'house:read', 'house:write',
    'ffc:read', 'ffc:write',
    'analytics:read', 'reports:create',
    'admin:users', 'admin:sync', 'admin:settings',
  ],
  DISTRICT: [
    'patient:read', 'patient:write',
    'house:read', 'house:write',
    'ffc:read', 'ffc:write',
    'analytics:read', 'reports:create',
  ],
  HOSPITAL: [
    'patient:read', 'patient:write',
    'house:read', 'house:write',
    'ffc:read', 'ffc:write',
    'analytics:read', 'reports:create',
  ],
  FFC: [
    'patient:read',
    'house:read',
    'ffc:read', 'ffc:write',
  ],
  VIEWER: [
    'patient:read',
    'house:read',
    'ffc:read',
    'analytics:read',
  ],
};

export function hasPermission(user: User, permission: Permission): boolean {
  return rolePermissions[user.role]?.includes(permission) ?? false;
}

// Row-Level Security by geographic scope
export function getScopeFilter(user: User) {
  if (user.role === 'ADMIN') return {};  // No filter
  if (user.role === 'DISTRICT' && user.districtCode) {
    return { districtCode: user.districtCode };
  }
  if (user.villageCode) {
    return { villageCode: user.villageCode };
  }
  return {}; // Viewer can still see limited data
}
```

### 12.3 Rate Limiting

```typescript
// lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL!);

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, '60 s'),  // 100 requests per minute
  analytics: true,
});

export async function checkRateLimit(ip: string): Promise<{ success: boolean; remaining: number }> {
  return ratelimit.limit(ip);
}
```

---

## 13. Docker Production Setup

### 13.1 Docker Compose

```yaml
version: '3.8'

services:
  app:
    image: geohealth-jhcis:latest
    build:
      context: .
      dockerfile: Dockerfile
      args:
        - NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
        - NEXT_PUBLIC_MAPBOX_TOKEN=${NEXT_PUBLIC_MAPBOX_TOKEN}
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - JHCIS_DATABASE_URL=${JHCIS_DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - JWT_SECRET=${JWT_SECRET}
      - MINIO_ENDPOINT=${MINIO_ENDPOINT}
      - MINIO_ACCESS_KEY=${MINIO_ACCESS_KEY}
      - MINIO_SECRET_KEY=${MINIO_SECRET_KEY}
      - NEXTAUTH_URL=${NEXTAUTH_URL}
      - SENTRY_DSN=${SENTRY_DSN}
      - NODE_ENV=production
    depends_on:
      database:
        condition: service_healthy
      redis:
        condition: service_started
      minio:
        condition: service_started
    volumes:
      - uploads:/app/uploads
    restart: unless-stopped
    networks:
      - geohealth-network
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 15s
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '2.0'

  database:
    image: mariadb:11
    environment:
      - MARIADB_ROOT_PASSWORD=${MARIADB_ROOT_PASSWORD}
      - MARIADB_DATABASE=geohealth
      - MARIADB_USER=geohealth
      - MARIADB_PASSWORD=${MARIADB_PASSWORD}
    volumes:
      - mariadb_data:/var/lib/mysql
      - ./infrastructure/mariadb/init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "3307:3306"  # Different port to avoid conflict with local MariaDB
    restart: unless-stopped
    networks:
      - geohealth-network
    healthcheck:
      test: ["CMD", "healthcheck.sh", "--connect", "--innodb_initialized"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '2.0'

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    restart: unless-stopped
    networks:
      - geohealth-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    deploy:
      resources:
        limits:
          memory: 256M
          cpus: '0.5'

  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      - MINIO_ROOT_USER=${MINIO_ACCESS_KEY}
      - MINIO_ROOT_PASSWORD=${MINIO_SECRET_KEY}
    volumes:
      - minio_data:/data
    ports:
      - "9000:9000"
      - "9001:9001"
    restart: unless-stopped
    networks:
      - geohealth-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 10s
      retries: 3
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '1.0'

  sync-worker:
    image: geohealth-sync-worker:latest
    build:
      context: ./services/sync-worker
      dockerfile: Dockerfile
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - JHCIS_DATABASE_URL=${JHCIS_DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
    depends_on:
      database:
        condition: service_healthy
      redis:
        condition: service_started
    restart: unless-stopped
    networks:
      - geohealth-network
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '1.0'

  # Optional: Reverse proxy (if not using Coolify's Traefik)
  nginx:
    image: nginx:alpine
    volumes:
      - ./infrastructure/nginx/default.conf:/etc/nginx/conf.d/default.conf
      - uploads:/uploads
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - app
    restart: unless-stopped
    networks:
      - geohealth-network
    profiles:
      - standalone  # Don't start by default (use Coolify's Traefik instead)

networks:
  geohealth-network:
    driver: bridge

volumes:
  mariadb_data:
  redis_data:
  minio_data:
  uploads:
```

### 13.2 Next.js Dockerfile (Production)

```dockerfile
# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --only=production

# Stage 2: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 3: Production
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

### 13.3 .env.example

```bash
# Application
NEXT_PUBLIC_API_URL=https://geohealth.phoubon.in.th
NEXTAUTH_URL=https://geohealth.phoubon.in.th
JWT_SECRET=your-jwt-secret-at-least-32-chars-long

# Database
DATABASE_URL=mysql://geohealth:password@database:3306/geohealth
JHCIS_DATABASE_URL=mysql://jhcis_user:password@jhcis-server:3306/jhcis_db

# Redis
REDIS_URL=redis://:password@redis:6379
REDIS_PASSWORD=your-redis-password

# MinIO (File Storage)
MINIO_ENDPOINT=minio:9000
MINIO_ACCESS_KEY=your-minio-access-key
MINIO_SECRET_KEY=your-minio-secret-key
MINIO_BUCKET=geohealth-uploads

# MariaDB (for Docker)
MARIADB_ROOT_PASSWORD=your-root-password
MARIADB_PASSWORD=your-db-password

# Monitoring
SENTRY_DSN=https://xxxx@sentry.phoubon.in.th/1

# Map (optional — OpenStreetMap is free and default)
NEXT_PUBLIC_MAPBOX_TOKEN=
```

---

## 14. Coolify Deployment

### 14.1 Coolify Configuration

| Setting | Value |
|---------|-------|
| **Type** | Docker Compose |
| **Compose File** | `infrastructure/docker-compose.yml` |
| **Domain** | `geohealth.phoubon.in.th` |
| **SSL** | Traefik (auto via Coolify) |
| **Health Check** | `/api/health` |
| **Auto Deploy** | GitHub push → `main` branch |
| **Backup** | Daily DB dump to MinIO |

### 14.2 GitHub Actions CI/CD

```yaml
# .github/workflows/deploy.yml
name: Deploy to Coolify

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install dependencies
        run: npm ci

      - name: TypeScript check
        run: npx tsc --noEmit

      - name: Lint
        run: npm run lint

      - name: Run tests
        run: npm test

      - name: Build
        run: npm run build
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}

      - name: Trigger Coolify Deploy
        run: |
          curl -X POST "https://coolify.phoubon.in.th/api/v1/deploy?uuid=${{ secrets.COOLIFY_UUID }}" \
            -H "Authorization: Bearer ${{ secrets.COOLIFY_API_TOKEN }}" \
            -H "Content-Type: application/json"
```

### 14.3 Database Migration Strategy

```bash
# In production, run migrations as a one-off container:
# Method 1: Prisma migrate
docker run --rm \
  --network geohealth-network \
  -e DATABASE_URL="${DATABASE_URL}" \
  geohealth-jhcis:latest \
  npx prisma migrate deploy

# Method 2: Prisma push (for dev/staging only)
docker run --rm \
  --network geohealth-network \
  -e DATABASE_URL="${DATABASE_URL}" \
  geohealth-jhcis:latest \
  npx prisma db push

# Backup MariaDB
docker exec geohealth-jhcis-database-1 \
  mysqldump -u root -p"${MARIADB_ROOT_PASSWORD}" geohealth \
  | gzip > /backups/geohealth-$(date +%Y%m%d-%H%M%S).sql.gz
```

---

## 15. Monitoring & Observability

### 15.1 Health Check Endpoint

```typescript
// app/api/health/route.ts
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { NextResponse } from 'next/server';

export async function GET() {
  const checks = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  };

  // Database check
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks['database'] = 'connected';
  } catch {
    checks['database'] = 'disconnected';
    checks['status'] = 'degraded';
  }

  // Redis check
  try {
    await redis.ping();
    checks['redis'] = 'connected';
  } catch {
    checks['redis'] = 'disconnected';
    checks['status'] = 'degraded';
  }

  const statusCode = checks.status === 'ok' ? 200 : 503;
  return NextResponse.json(checks, { status: statusCode });
}
```

### 15.2 Prometheus Metrics

```typescript
// lib/metrics.ts (export endpoint for Prometheus)
import { Counter, Histogram, Registry } from 'prom-client';

const registry = new Registry();

export const httpRequestDuration = new Histogram({
  name: 'geohealth_http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.1, 0.5, 1, 2, 5],
  registers: [registry],
});

export const apiCallCount = new Counter({
  name: 'geohealth_api_calls_total',
  help: 'Total API calls',
  labelNames: ['method', 'route', 'status'],
  registers: [registry],
});

export const syncJobCount = new Counter({
  name: 'geohealth_sync_jobs_total',
  help: 'Total JHCIS sync jobs',
  labelNames: ['table', 'status'],
  registers: [registry],
});
```

### 15.3 Grafana Dashboard Panels

| Panel | Metric | Query |
|-------|--------|-------|
| API Latency (P95) | `geohealth_http_request_duration_seconds` | `histogram_quantile(0.95, ...)` |
| Requests per minute | `geohealth_api_calls_total` | `rate(...[5m])` |
| Active users | Custom | `count(active_sessions)` |
| Sync status | `geohealth_sync_jobs_total` | `sum by(status) (...)` |
| Database connections | MariaDB | `max_connections` |
| Memory usage | Docker | `container_memory_usage_bytes` |

---

## 16. Performance Budget

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| First Contentful Paint (FCP) | < 1.5s | > 2.5s | > 4s |
| Largest Contentful Paint (LCP) | < 2.5s | > 4s | > 6s |
| Time to Interactive (TTI) | < 3.5s | > 5s | > 8s |
| First Input Delay (FID) | < 100ms | > 200ms | > 300ms |
| Map Load (initial) | < 3s | > 5s | > 8s |
| API Response (P95) | < 500ms | > 1s | > 2s |
| Bundle Size (JS) | < 200KB | > 350KB | > 500KB |
| Bundle Size (CSS) | < 50KB | > 100KB | > 150KB |
| Lighthouse Score | > 90 | > 70 | < 50 |
| Offline-first Sync | < 30s | > 60s | > 120s |

---

## Appendix A: Key Technical Decisions

### Why MariaDB over PostGIS?
- **JHCIS uses MySQL/MariaDB** — direct read connection without ETL
- MariaDB 11 has solid spatial support (ST_* functions)
- PostGIS can be added later for complex spatial queries
- Less operational overhead (one DB engine for both app + JHCIS)

### Why Next.js API Routes over Separate Backend?
- Simplified deployment (one container instead of two)
- Type sharing between frontend and backend
- Sufficient for 1,000 concurrent users
- Can extract to separate service later if needed

### Why Zustand over Redux?
- Lighter bundle (1KB vs 12KB+)
- Simpler API, less boilerplate
- IndexedDB persist middleware available
- Works well with React Server Components

### Why TanStack Query over RTK Query?
- Framework-agnostic (can be reused)
- Excellent offline support
- Built-in caching, refetch, pagination
- Smaller bundle when not using Redux

### Why Offline-first PWA over Native App?
- No app store review
- Instant updates (no APK/IPA redistribution)
- Broader device support (even low-end Android)
- Service Worker + IndexedDB sufficient for FFC use case
- Can build native app later for advanced features

---

## Appendix B: Migration Checklist

### Pre-Migration
- [ ] Set up Coolify project with Docker Compose
- [ ] Configure environment variables in Coolify
- [ ] Test JHCIS read-only connection
- [ ] Run Prisma migration (create tables)
- [ ] Create initial admin user
- [ ] Set up SSL certificate

### Migration Steps
1. **Phase 1:** Deploy MVP stack (auth + basic map + search)
2. **Phase 2:** Run full JHCIS sync (person, house, village, chronic)
3. **Phase 3:** Assign geo-coordinates (batch import + manual)
4. **Phase 4:** Validate data correctness with stakeholders
5. **Phase 5:** Train users and go live

### Post-Migration
- [ ] Monitor sync logs for errors
- [ ] Verify map accuracy (random sample 100 houses)
- [ ] Collect user feedback (first 2 weeks)
- [ ] Optimize slow queries
- [ ] Set up backup schedule
- [ ] Configure monitoring alerts

---

> **Document Status:** ✅ Production Blueprint  
> **Next Action:** Create repository → Bootstrap via Codex/CLI → Deploy MVP
