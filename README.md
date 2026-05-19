# 🗺️ GeoHealth-JHCIS

> ระบบ GIS สำหรับเชื่อมโยงข้อมูล JHCIS และฐานข้อมูลสุขภาพ 43 แฟ้ม เข้ากับแผนที่เชิงพื้นที่ — รองรับการใช้งานระดับจังหวัด/รพ.สต.

[![Status](https://img.shields.io/badge/Status-Production%20Blueprint-blue)](PRD.md)
[![Stack](https://img.shields.io/badge/Stack-Next.js%2016%20%7C%20TypeScript%20%7C%20Prisma%20%7C%20MariaDB-brightgreen)]()
[![License](https://img.shields.io/badge/License-MIT-yellow)]()

---

## ✨ ความสามารถหลัก

| Feature | Description |
|---------|-------------|
| 🗺️ **แผนที่ผู้ป่วย** | แสดงตำแหน่งบ้านผู้ป่วยบนแผนที่พร้อมสีบอกความเสี่ยง |
| 🔍 **ค้นหาอัจฉริยะ** | ค้นหาด้วย CID, ชื่อ, HN, บ้านเลขที่, QR Code |
| 📊 **วิเคราะห์เชิงพื้นที่** | Heatmap โรค, Cluster Detection, Risk Zone |
| 📱 **FFC Mobile (PWA)** | ใช้งาน Offline, GPS Check-in, บันทึกข้อมูลภาคสนาม |
| 📈 **Dashboard** | ภาพรวม KPI, เปรียบเทียบรายหมู่บ้าน, แนวโน้มโรค |
| 🔄 **JHCIS Sync** | Sync ข้อมูล 43 แฟ้ม อัตโนมัติตามเวลาที่กำหนด |
| 📄 **รายงาน** | Export เป็น PDF, Excel, CSV, GeoJSON, Shapefile |

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 16, TypeScript, Tailwind CSS, shadcn/ui |
| **Map** | Leaflet, OpenStreetMap, MarkerCluster, Heatmap |
| **Backend** | Next.js API Routes, Prisma ORM |
| **Database** | MariaDB 11 (MySQL Spatial) |
| **Cache** | Redis |
| **Storage** | MinIO (S3-compatible) |
| **Auth** | JWT + RBAC |
| **Queue** | BullMQ |
| **Monitoring** | Prometheus + Grafana + Sentry |
| **Deploy** | Docker + Coolify |

## 📂 โครงสร้างโปรเจ็ค

```
geohealth-jhcis/
├── apps/web/               # Next.js frontend + API
├── packages/               # Shared packages
│   ├── ui/                 # Shared UI components
│   └── shared/             # Shared types & utilities
├── services/
│   ├── prisma/             # Database schema & migrations
│   └── sync-worker/        # JHCIS sync worker
├── infrastructure/         # Docker, monitoring configs
└── docs/
    ├── PRD.md              # Product Requirements Document
    └── DESIGN.md           # System Design Document
```

## 🚀 Quick Start

```bash
# 1. Clone
git clone https://github.com/suphotsudsee/geohealth-jhcis
cd geohealth-jhcis

# 2. Environment
cp .env.example .env
# → แก้ไข .env ให้ถูกต้อง

# 3. Install dependencies
npm install

# 4. Setup database
npx prisma generate
npx prisma db push

# 5. Run dev
npm run dev
# → http://localhost:3000

# 6. หรือใช้ Docker
npm run docker:up
```

## 📚 Documentation

- **[PRD.md](docs/PRD.md)** — Product Requirements Document
- **[DESIGN.md](docs/DESIGN.md)** — System Architecture & Design
- **[API.md](docs/API.md)** — API Reference (Coming Soon)

## 🗺️ Deployment

Deploy ผ่าน Coolify ด้วย Docker Compose:

```bash
# Build and deploy
npm run docker:up
```

หรืออัตโนมัติผ่าน GitHub Actions (push to `main`).

## 👥 Target Users

- 🏥 เจ้าหน้าที่ รพ.สต.
- 🚑 FFC Team / อสม.
- 📊 ผู้บริหาร สสจ./สสอ.
- 🔬 นักระบาดวิทยา

## 🤝 Contributing

อยู่ระหว่างการพัฒนา — รอรายละเอียดเพิ่มเติม

## 📝 License

MIT License
