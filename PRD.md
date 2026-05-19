# GeoHealth-JHCIS

> ระบบ GIS สำหรับเชื่อมโยงข้อมูล JHCIS และฐานข้อมูลสุขภาพ 43 แฟ้ม เข้ากับแผนที่เชิงพื้นที่ — รองรับการใช้งานระดับจังหวัด/รพ.สต.

**Version:** 1.0.0  
**Status:** Production Blueprint  
**Owner:** Digital Health Team  
**Target Users:** รพ.สต., สสอ., สสจ., เจ้าหน้าที่ FFC, ผู้บริหาร  
**Last Updated:** 2026-05-19

---

## Table of Contents

- [1. Executive Summary](#1-executive-summary)
- [2. Problem Statement](#2-problem-statement)
- [3. Objectives](#3-objectives)
- [4. Success Metrics](#4-success-metrics)
- [5. User Personas](#5-user-personas)
- [6. Functional Requirements](#6-functional-requirements)
- [7. Module Specifications](#7-module-specifications)
- [8. Non-Functional Requirements](#8-non-functional-requirements)
- [9. Security Requirements](#9-security-requirements)
- [10. Deployment Strategy](#10-deployment-strategy)
- [11. Data Migration & Sync](#11-data-migration--sync)
- [12. Future Roadmap](#12-future-roadmap)
- [13. Glossary](#13-glossary)

---

## 1. Executive Summary

**GeoHealth-JHCIS** คือระบบ GIS (Geographic Information System) ที่เชื่อมโยงข้อมูลสุขภาพจาก JHCIS และฐานข้อมูล 43 แฟ้ม เข้ากับแผนที่เชิงพื้นที่แบบ Real-time เพื่อให้หน่วยบริการสาธารณสุขสามารถ:

- **ติดตามประชากร ผู้ป่วย และครัวเรือน** ผ่านแผนที่ดิจิทัลแทนแผนที่เดินดินแบบกระดาษ
- **วิเคราะห์การกระจายโรค** เชิงพื้นที่ด้วย Heatmap และ Cluster Detection
- **สนับสนุนทีม FFC/อสม.** ในการเยี่ยมบ้านด้วยระบบ Offline-first PWA
- **รายงานผู้บริหาร** แบบ Interactive Dashboard
- **ลดภาระเอกสาร** และเพิ่มประสิทธิภาพการลงพื้นที่

---

## 2. Problem Statement

### ปัญหาปัจจุบัน

| ปัญหา | ผลกระทบ |
|--------|---------|
| แผนที่เดินดินแบบกระดาษ ค้นหายาก ไม่ทันสมัย | สิ้นเปลืองเวลา ค้นหาข้อมูลลำบาก |
| ตำแหน่งบ้านผู้ป่วยไม่แม่นยำ / ไม่มีพิกัด | เจ้าหน้าที่หลงทาง เสียเวลา |
| วิเคราะห์การกระจายโรคไม่ได้ | ขาดข้อมูลสนับสนุนการตัดสินใจ |
| เจ้าหน้าที่ต้องใช้หลายระบบ | ทำงานซ้ำซ้อน เสียประสิทธิภาพ |
| ลงพื้นที่ไม่มีข้อมูล Real-time | FFC/อสม. ทำงานไม่เต็มประสิทธิภาพ |
| ไม่มีระบบติดตาม FFC | ผู้บริหารติดตามผลงานไม่ได้ |

### Pain Points โดยละเอียด

1. **รพ.สต.:** ไม่มีแผนที่ผู้ป่วยในระบบ — ใช้สมุดจด + แผนที่กระดาษ
2. **FFC/อสม.:** ลงพื้นที่เยี่ยมบ้าน ไม่รู้พิกัดบ้าน ไม่รู้ประวัติผู้ป่วยล่าสุด
3. **สสจ./ผู้บริหาร:** ไม่สามารถดูภาพรวมโรคเชิงพื้นที่แบบ Real-time ได้
4. **งานระบาดวิทยา:** วิเคราะห์ cluster โรคไม่ได้ — ต้องรอรายงานล่าช้า

---

## 3. Objectives

### เป้าหมายหลัก

1. ✅ **แสดงตำแหน่งบ้านและผู้ป่วยบนแผนที่ดิจิทัล** — แทนที่แผนที่เดินดินแบบกระดาษ
2. ✅ **เชื่อมข้อมูล JHCIS (43 แฟ้ม) แบบ Real-time** — ไม่ต้องกรอกข้อมูลซ้ำ
3. ✅ **วิเคราะห์เชิงพื้นที่** — Heatmap, Cluster, Risk Zone
4. ✅ **รองรับมือถือสำหรับ FFC/อสม.** — Offline-first PWA
5. ✅ **ติดตามการเยี่ยมบ้าน (FFC)** — GPS Check-in, รูปภาพ, บันทึกข้อมูล
6. ✅ **Dashboard ผู้บริหาร** — ภาพรวม KPI เชิงพื้นที่
7. ✅ **ลดเอกสารและเพิ่มประสิทธิภาพ** — Paperless 100%

---

## 4. Success Metrics

| KPI | เป้าหมาย | การวัด |
|-----|----------|--------|
| ลดเวลาค้นหาบ้านผู้ป่วย | ≥ 70% | เทียบเวลาเฉลี่ยก่อน-หลัง |
| ความถูกต้องของพิกัด GPS | ≥ 95% | สุ่มตรวจ 100 ครัวเรือน |
| เวลาลงพื้นที่ลดลง | ≥ 50% | เทียบเวลาปฏิบัติงาน |
| เจ้าหน้าที่ใช้งานจริง | ≥ 80% | Active Users / Total Users |
| จำนวน FFC Visit ที่บันทึก | เพิ่มขึ้น ≥ 200% | เทียบเดือนต่อเดือน |
| ความพึงพอใจผู้ใช้งาน | ≥ 4.0/5.0 | แบบประเมินออนไลน์ |
| System Uptime | ≥ 99.9% | Uptime Monitor |

---

## 5. User Personas

### 5.1 เจ้าหน้าที่ รพ.สต.

- **บทบาท:** พยาบาล, นักวิชาการสาธารณสุข
- **อุปกรณ์:** PC + Tablet
- **ความต้องการ:**
  - ค้นหาบ้านผู้ป่วยจาก CID/ชื่อ/HN ได้รวดเร็ว
  - ดูประวัติผู้ป่วย + โรคประจำตัว + ยา
  - ดูแผนที่แสดงบ้านผู้ป่วยพร้อมข้อมูล
  - บันทึกการเยี่ยมบ้าน
  - จัดการข้อมูลประชากรในเขตรับผิดชอบ

### 5.2 ทีม FFC / อสม.

- **บทบาท:** อาสาสมัครสาธารณสุข, ทีม Fast Forward Crisis
- **อุปกรณ์:** มือถือ Android/iOS
- **ความต้องการ:**
  - ใช้ในพื้นที่ที่ไม่มีอินเตอร์เน็ตได้ (Offline)
  - GPS นำทางไปบ้านผู้ป่วย
  - แสดงรายชื่อผู้ป่วยที่ต้องเยี่ยมวันนี้
  - Check-in GPS อัตโนมัติ
  - บันทึกผลเยี่ยม + รูป + Voice note
  - Sync ข้อมูลเมื่อมีอินเตอร์เน็ต

### 5.3 ผู้บริหาร / สสจ.

- **บทบาท:** สาธารณสุขอำเภอ/จังหวัด, ผู้อำนวยการ
- **อุปกรณ์:** PC, Tablet, มือถือ
- **ความต้องการ:**
  - Dashboard KPI เชิงพื้นที่
  - Heatmap การกระจายโรค (DM, HT, TB, Dengue)
  - รายงานผู้ป่วยรายโรค
  - เปรียบเทียบแต่ละตำบล/หมู่บ้าน
  - Export รายงาน PDF / Excel

### 5.4 นักวิชาการ / ระบาดวิทยา

- **บทบาท:** นักระบาดวิทยา, เจ้าหน้าที่วิเคราะห์
- **อุปกรณ์:** PC
- **ความต้องการ:**
  - วิเคราะห์ Cluster โรค
  - Heatmap รายโรคย้อนหลัง
  - Export ข้อมูลเชิงพื้นที่ (GeoJSON, Shapefile)
  - เปรียบเทียบอัตราป่วยในพื้นที่

---

## 6. Functional Requirements

### Module Summary

| # | Module | Priority | Complexity |
|---|--------|----------|------------|
| A | Authentication & RBAC | 🔴 Critical | Medium |
| B | JHCIS Sync (43 แฟ้ม) | 🔴 Critical | High |
| C | GIS Mapping Engine | 🔴 Critical | High |
| D | Household Map Viewer | 🟡 High | Medium |
| E | Search Engine | 🟡 High | Medium |
| F | Patient Profile | 🟡 High | Medium |
| G | Spatial Analytics | 🟢 Medium | High |
| H | FFC Mobile (Offline-first) | 🟡 High | Very High |
| I | Dashboard | 🟡 High | Medium |
| J | Reports & Export | 🟢 Medium | Low |

---

## 7. Module Specifications

### Module A: Authentication & RBAC

| Feature | Description |
|---------|-------------|
| Login | JWT-based authentication with refresh token |
| Thai ID Login | รองรับการ Login ด้วยเลขบัตรประชาชน |
| Role Management | Admin, District, Hospital (รพ.สต.), FFC, Viewer |
| Permission Matrix | CRUD per module per role |
| Session Management | Token expiry, device tracking, force logout |
| Audit Log | Log ทุกการกระทำ (who, what, when, IP) |

### Module B: JHCIS Sync Engine

| Feature | Description |
|---------|-------------|
| Full Sync | นำเข้าข้อมูลทั้งหมดจาก JHCIS 43 แฟ้มครั้งแรก |
| Incremental Sync | Sync เฉพาะข้อมูลที่มีการเปลี่ยนแปลง |
| Real-time Sync | Webhook / Trigger จาก JHCIS (ถ้ารองรับ) |
| Manual Sync | ปุ่ม Sync ด้วยตนเอง |
| Scheduled Cron | Auto sync ทุกวันตามเวลาที่กำหนด |
| Conflict Resolution | จัดการกรณีข้อมูลซ้ำ / ขัดแย้ง |
| Sync Log | ตาราง log บันทึกการ sync แต่ละครั้ง |

**ตาราง 43 แฟ้มที่ต้อง Sync:**

| # | Table | Description | Priority |
|---|-------|-------------|----------|
| 1 | person | ข้อมูลบุคคล | 🔴 |
| 2 | house | ข้อมูลบ้าน | 🔴 |
| 3 | village | ข้อมูลหมู่บ้าน | 🔴 |
| 4 | chronic | โรคเรื้อรัง | 🔴 |
| 5 | visit | การรับบริการ | 🔴 |
| 6 | death | การตาย | 🟡 |
| 7 | drug | การใช้ยา | 🟡 |
| 8 | lab | ผล LAB | 🟡 |
| 9 | pregnancy | หญิงตั้งครรภ์ | 🟡 |
| 10 | newborn | ทารกแรกเกิด | 🟢 |
| 11 | vaccination | ประวัติการได้รับวัคซีน | 🟡 |
| 12 | community_activity | กิจกรรมชุมชน | 🟢 |
| 13 | rehabilitation | การฟื้นฟูสภาพ | 🟢 |
| 14 | nutrition | โภชนาการ | 🟢 |
| 15 | disability | ความพิการ | 🟡 |
| 16 | accident | อุบัติเหตุ | 🟢 |
| 17 | surveillance | โรคเฝ้าระวัง | 🟡 |
| 18 | mental_health | สุขภาพจิต | 🟢 |
| 19 | dental | ทันตสุขภาพ | 🟢 |
| 20 | family | ข้อมูลครอบครัว | 🟡 |
| 21 | environment | สิ่งแวดล้อม | 🟢 |
| 22 | risk_factor | ปัจจัยเสี่ยง | 🟡 |
| 23 | screening | การคัดกรอง | 🟡 |
| 24 | refer | การส่งต่อ | 🟢 |
| 25 | emergency | ฉุกเฉิน | 🟢 |
| 26 | anamalies | ความผิดปกติแต่กำเนิด | 🟢 |
| 27 | cancer | มะเร็ง | 🟡 |
| 28 | tb | วัณโรค | 🟡 |
| 29 | hiv | HIV/AIDS | 🟡 |
| 30 | std | กามโรค | 🟢 |
| 31 | leprosy | เรื้อน | 🟢 |
| 32 | filaria | โรคเท้าช้าง | 🟢 |
| 33 | hypertension | ความดันโลหิตสูง | 🔴 |
| 34 | diabetes | เบาหวาน | 🔴 |
| 35 | copd | COPD | 🟡 |
| 36 | asthma | หอบหืด | 🟡 |
| 37 | heart | โรคหัวใจ | 🟡 |
| 38 | stroke | โรคหลอดเลือดสมอง | 🟡 |
| 39 | kidney | โรคไต | 🟡 |
| 40 | thalassemia | ธาลัสซีเมีย | 🟢 |
| 41 | g6pd | G6PD | 🟢 |
| 42 | allergy | ภูมิแพ้/แพ้ยา | 🟡 |
| 43 | service | ข้อมูลบริการ | 🔴 |

### Module C: GIS Mapping Engine

| Feature | Description |
|---------|-------------|
| Base Maps | OpenStreetMap, Satellite (Mapbox/GIS), Terrain |
| Marker Clustering | Cluster ผู้ป่วยเมื่อ zoom out, แยกเมื่อ zoom in |
| Heatmap Layer | Heatmap การกระจายโรค (ปรับความเข้มตามจำนวน) |
| Polygon Layer | แสดงเขตหมู่บ้าน/ตำบล |
| Layer Control | เปิด/ปิด Layer ตามต้องการ (Toggle) |
| Map Legend | คำอธิบายสีและสัญลักษณ์ |
| GPS Geolocation | หาตำแหน่งปัจจุบันของผู้ใช้ |
| Offline Tiles | Cache แผนที่สำหรับใช้ Offline |
| Geocoding | ค้นหาตำแหน่งจากที่อยู่/พิกัด |

### Module D: Household Map

| Feature | Description |
|---------|-------------|
| House Markers | แสดงบ้านแต่ละหลังบนแผนที่ |
| Risk Color Coding | **แดง:** DM+HT+Stroke, **ส้ม:** Elderly, **เหลือง:** Risk, **เขียว:** ปกติ |
| Click to View | คลิกบ้าน → แสดงสมาชิกในบ้าน + โรค |
| Filter by Condition | กรองเฉพาะบ้านที่มีผู้ป่วยโรค X |
| Village Boundary | เส้นเขตหมู่บ้าน |
| Search by House No | ค้นหาบ้านเลขที่ |

### Module E: Search Engine

| Feature | Description |
|---------|-------------|
| CID Search | ค้นหาจากเลขบัตรประชาชน 13 หลัก |
| Name Search | ค้นหาจากชื่อ-นามสกุล (รองรับภาษาไทย) |
| HN Search | เลขประจำตัวผู้ป่วย |
| House No | บ้านเลขที่ |
| Village | หมู่บ้าน |
| QR Code | Scan QR ที่บ้าน → เปิดข้อมูลทันที |
| Fuzzy Search | ค้นหาแม้พิมพ์ผิดเล็กน้อย |
| Auto-complete | แนะนำรายชื่อขณะพิมพ์ |

### Module F: Patient Profile

**ข้อมูลที่แสดงใน Profile:**

- รูปผู้ป่วย (ถ้ามี)
- ชื่อ-นามสกุล, อายุ, เพศ
- CID, HN
- ที่อยู่: บ้านเลขที่, หมู่บ้าน, ตำบล
- โรคประจำตัว (Chronic)
- ยาที่ใช้ปัจจุบัน
- ผล LAB ล่าสุด
- ประวัติ Visit
- ประวัติการเยี่ยมบ้าน (FFC)
- พิกัด GPS ของบ้าน

### Module G: Spatial Analytics

| Feature | Description |
|---------|-------------|
| Disease Heatmap | DM, HT, TB, Dengue, Covid, Stroke, ANC Risk |
| Cluster Detection | จุดที่มีผู้ป่วยโรค X หนาแน่นผิดปกติ |
| Density Map | ความหนาแน่นประชากร/ผู้ป่วยต่อพื้นที่ |
| Risk Zone | โซนสีตามระดับความเสี่ยง (Red/Yellow/Green) |
| Temporal Analysis | เปรียบเทียบการเปลี่ยนแปลงรายเดือน/ปี |
| Filter by Date | เลือกช่วงเวลาที่ต้องการวิเคราะห์ |
| Export Map | Export เป็นภาพ/GeoJSON |

### Module H: FFC Mobile (Offline-first PWA)

| Feature | Description |
|---------|-------------|
| PWA Installable | ติดตั้งเป็น App บนมือถือได้ |
| Offline-first | ทำงานได้โดยไม่ต้องมีอินเตอร์เน็ต |
| Visit Schedule | รายการบ้านที่ต้องเยี่ยมวันนี้ |
| GPS Navigation | นำทางจากจุดปัจจุบันไปบ้านผู้ป่วย |
| GPS Check-in | บันทึกพิกัดเมื่อถึงบ้าน |
| Photo Capture | ถ่ายรูปขณะเยี่ยมบ้าน (เก็บใน Local ก่อน Sync) |
| Voice Note | อัดเสียงบันทึกข้อมูล |
| Checklist | แบบฟอร์มตรวจสอบ (structured form) |
| Offline Queue | เก็บข้อมูลใน Local Storage / IndexedDB |
| Auto Sync | Sync อัตโนมัติเมื่อมีการเชื่อมต่อ |
| Conflict Resolution | จัดการข้อมูลที่ Sync ซ้ำ |
| Battery Efficient | GPS แบบ Low-power mode |

### Module I: Dashboard

**Cards (Top Row):**
- ประชากรทั้งหมด
- ผู้ป่วยโรคเรื้อรัง
- ผู้ป่วยติดเตียง
- กลุ่มเสี่ยง
- FFC Visit วันนี้/เดือนนี้

**Charts & Maps:**
- Map Dashboard — แผนที่แสดงภาพรวม
- Village Ranking — อันดับหมู่บ้านตามจำนวนผู้ป่วย
- Trend Analysis — กราฟแนวโน้มรายโรค
- Coverage Rate — ความครอบคลุม FFC Visit

### Module J: Reports & Export

| Format | Features |
|--------|----------|
| PDF | รายงานผู้ป่วยรายโรค, รายงาน FFC, Dashboard Report |
| Excel | Export ข้อมูลตาราง (กรองตามเงื่อนไข) |
| CSV | Export raw data สำหรับนำไปวิเคราะห์ต่อ |
| GeoJSON | Export ข้อมูลเชิงพื้นที่ |
| Shapefile | Export สำหรับ GIS Desktop (QGIS) |
| Scheduled Report | ส่งรายงานทาง Email อัตโนมัติ (Future) |

---

## 8. Non-Functional Requirements

### Performance

| Requirement | Target |
|-------------|--------|
| API Response Time (P95) | < 2 วินาที |
| Map Load Time | < 3 วินาที (ครั้งแรก), < 1 วินาที (cache) |
| Concurrent Users | ≥ 1,000 users |
| Data Sync Time (Full) | < 30 นาที สำหรับ 100,000 records |
| Data Sync Time (Incremental) | < 2 นาที |
| Search Response | < 500 ms |

### Availability

| Requirement | Target |
|-------------|--------|
| System Uptime | ≥ 99.9% (< 8.76 ชม./ปี) |
| Planned Maintenance | นอกเวลาทำการ (20:00-06:00) |
| Disaster Recovery | RTO < 4 ชม., RPO < 15 นาที |

### Scalability

- **Horizontal:** API servers scale out with load balancer
- **Database:** Master-slave replication for read-heavy workloads
- **Caching:** Redis for session, map tiles, frequent queries
- **Static Assets:** CDN for map tiles, images

### Mobile Compatibility

- **PWA:** ติดตั้งบน Android/iOS ได้
- **Offline-first:** ใช้งานได้ไม่มีอินเตอร์เน็ต
- **Responsive:** Mobile, Tablet, Desktop
- **Touch-friendly:** ปุ่มใหญ่พอสำหรับนิ้วมือ
- **GPS:** ใช้งาน GPS ได้ทั้งในและนอกอาคาร
- **Battery:** GPS แบบ low-power เมื่อ background

### Browser Support

| Browser | Version |
|---------|---------|
| Chrome | Last 2 versions |
| Firefox | Last 2 versions |
| Safari | Last 2 versions |
| Edge | Last 2 versions |
| Line Browser | Chrome iOS/Android rendering |

### Accessibility

- WCAG 2.1 Level AA (สำหรับเว็บภาครัฐ)
- รองรับการใช้งานด้วยคีย์บอร์ด
- Screen reader friendly (ARIA labels)
- High contrast mode
- Font size adjustable

---

## 9. Security Requirements

| Requirement | Implementation |
|-------------|----------------|
| HTTPS | TLS 1.3, Let's Encrypt / Traefik |
| Authentication | JWT (access + refresh token) |
| Password Policy | Min 8 chars, hashed with bcrypt |
| Rate Limiting | 100 requests/min per IP |
| SQL Injection | Prisma ORM (parameterized queries) |
| XSS Protection | React's built-in XSS protection |
| CSRF | SameSite cookies + CSRF token |
| RBAC | Role-based access control per module |
| Row-Level Security (RLS) | ผู้ใช้เห็นเฉพาะข้อมูลในเขตตัวเอง |
| Audit Log | บันทึกทุกการกระทำที่ sensitive |
| Session Management | Token expiry 24h, refresh 7d |
| Credential Encryption | Encrypted at rest for JHCIS DB credentials |
| File Upload Validation | MIME type + size limit + malware scan |
| API Key Rotation | Quarterly rotation for external integrations |
| Data Backup | Encrypted backup daily |

### Data Privacy (PDPA Compliance)

- ข้อมูลสุขภาพ (sensitive data) เข้ารหัสใน DB
- Access log สำหรับทุกการดูข้อมูลผู้ป่วย
- ผู้ใช้เห็นเฉพาะข้อมูลในเขตที่รับผิดชอบ
- ข้อมูลผู้ป่วยไม่แสดงบนหน้าจอสาธารณะ
- Export ข้อมูลต้องมี audit trail

---

## 10. Deployment Strategy

### Phase 1: MVP (Month 1-2)
- Authentication & RBAC
- JHCIS Sync (core tables: person, house, village, chronic)
- Basic Map (marker, cluster, search)
- House Detail View
- **Target:** 1 รพ.สต. นำร่อง

### Phase 2: Core Features (Month 3-4)
- Full 43 แฟ้ม Sync
- Patient Profile
- FFC Visit (Web version)
- Dashboard (basic)
- **Target:** 3-5 รพ.สต.

### Phase 3: Advanced Features (Month 5-6)
- FFC Mobile PWA (Offline-first)
- Spatial Analytics (Heatmap, Cluster)
- QR Check-in
- Reports Export
- **Target:** 1 อำเภอ

### Phase 4: Production Scale (Month 7-8)
- Performance optimization
- Caching (Redis)
- Load balancing
- Monitoring (Prometheus + Grafana)
- Backup system
- **Target:** 1 จังหวัด หรือ หลายอำเภอ

### Infrastructure Architecture

```
Internet
   │
   ▼
Traefik (SSL termination)
   │
   ├── Frontend (Next.js Static)
   │
   ├── API (Next.js API Routes)
   │     │
   │     ├── MariaDB (Primary)
   │     ├── MariaDB (JHCIS Read-only)
   │     ├── Redis (Cache + Queue)
   │     └── MinIO (File Storage)
   │
   └── Cron Jobs
         ├── JHCIS Sync
         ├── Backup
         └── Report Scheduler
```

### Docker Architecture

| Service | Image | Resources |
|---------|-------|-----------|
| Frontend | node:20-alpine | 512MB RAM, 1 CPU |
| API | node:20-alpine | 1GB RAM, 2 CPU |
| MariaDB | mariadb:11 | 2GB RAM, 2 CPU |
| Redis | redis:7-alpine | 256MB RAM, 1 CPU |
| MinIO | minio/minio | 1GB RAM, 1 CPU |
| Cron | node:20-alpine | 256MB RAM, 1 CPU |

### Monitoring Stack

| Tool | Purpose |
|------|---------|
| Prometheus | Metrics collection |
| Grafana | Dashboards & visualization |
| Loki | Log aggregation |
| Sentry | Error tracking |
| Uptime Kuma | Availability monitoring |

---

## 11. Data Migration & Sync

### Initial Data Migration

1. **ตั้งค่าการเชื่อมต่อ JHCIS** — Config DB connection
2. **Full Sync 43 แฟ้ม** — Import ข้อมูลทั้งหมด
3. **Geo-coordinate Assignment** — ระบุพิกัดบ้าน (manual + batch)
4. **Data Validation** — ตรวจสอบความถูกต้องของข้อมูล
5. **Go Live** — เปิดให้เจ้าหน้าที่ใช้งาน

### Sync Strategy

| Table | Sync Mode | Frequency |
|-------|-----------|-----------|
| person, house, village | Incremental + Cron | ทุก 6 ชม. |
| chronic, hypertension, diabetes | Incremental + Cron | ทุก 6 ชม. |
| visit, service | Incremental + Cron | ทุก 1 ชม. |
| lab, drug | Incremental + Cron | ทุก 12 ชม. |
| death | Real-time / Immediate | ทันที |
| อื่นๆ | Cron | ทุก 24 ชม. |

### Conflict Resolution

- **Rule:** JHCIS = Source of Truth สำหรับข้อมูล 43 แฟ้ม
- **Exception:** Geo-coordinates, FFC Visit Data = GeoHealth Authoritative
- **Duplicate CID:** Merge policy (keep latest visit + oldest record)
- **Orphan Records:** จัดกลุ่มไว้รอการตรวจสอบ

---

## 12. Future Roadmap

### Q3 2026
- AI-powered risk prediction model
- Mobile App (Native) — Flutter/React Native
- Line OA Integration for citizen self-service
- Auto SMS/Line notify for high-risk patients
- Integration with Smart KPI Dashboard

### Q4 2026
- Machine Learning for disease outbreak prediction
- Telemedicine integration with async-telemed
- Blockchain for audit trail (กรณีต้องการความโปร่งใสสูง)
- Multi-province deployment
- API Marketplace สำหรับระบบอื่นๆ

### 2027
- National-scale deployment
- Real-time epidemic monitoring center
- Cross-border health data sharing
- Citizen mobile app (self health record)

---

## 13. Glossary

| Term | Definition |
|------|------------|
| JHCIS | Java Health Center Information System — ระบบฐานข้อมูลของ รพ.สต. |
| 43 แฟ้ม | มาตรฐานข้อมูลสุขภาพ 43 ตาราง ของกระทรวงสาธารณสุข |
| รพ.สต. | โรงพยาบาลส่งเสริมสุขภาพตำบล |
| สสอ. | สำนักงานสาธารณสุขอำเภอ |
| สสจ. | สำนักงานสาธารณสุขจังหวัด |
| FFC | Fast Forward Crisis — ทีมปฏิบัติการเชิงรุก |
| อสม. | อาสาสมัครสาธารณสุขประจำหมู่บ้าน |
| GIS | Geographic Information System |
| PWA | Progressive Web Application |
| CID | Citizen ID — เลขบัตรประจำตัวประชาชน 13 หลัก |
| HN | Hospital Number — เลขประจำตัวผู้ป่วย |
| DM | Diabetes Mellitus — เบาหวาน |
| HT | Hypertension — ความดันโลหิตสูง |
| TB | Tuberculosis — วัณโรค |
| ANC | Antenatal Care — ฝากครรภ์ |
| RTO | Recovery Time Objective |
| RPO | Recovery Point Objective |
| RLS | Row-Level Security |
| RBAC | Role-Based Access Control |
| PDPA | Personal Data Protection Act |
