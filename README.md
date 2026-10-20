# NIVA — Pregnancy Intelligence Platform

**NIVA** is a scientific, interactive, AI-assisted pregnancy & postpartum intelligence platform built for Persian (RTL) and English (LTR) audiences, designed to be extensible to additional languages.

> **NIVA** — پلتفرم هوشمند بارداری: یک پلتفرم علمی، تعاملی و هوشمند برای دوران بارداری و پس از زایمان، با پشتیبانی کامل از زبان فارسی (راست‌به‌چپ) و انگلیسی.

---

## ✨ Features / امکانات

| Module | توضیح |
| --- | --- |
| 🗓 **Pregnancy Core** — pregnancy profiles, gestational age calculation, week-by-week timeline | پروفایل بارداری، محاسبه سن بارداری و تایم‌لاین هفته‌به‌هفته |
| 🔬 **Scientific 3D Fetal Studio** — parametric, stage-accurate 3D fetal renders (Three.js / React Three Fiber) | استودیوی سه‌بعدی علمی جنین با رندر پارامتریک متناسب با هر هفته |
| 🫀 **Anatomy Education** — natural 3D anatomical visualizations (educational, non-diagnostic) | آموزش آناتومی با بصیرت سه‌بعدی طبیعی (آموزشی، غیرتشخیصی) |
| 🤖 **Evidence-based AI Assistant** — RAG over curated medical knowledge, deterministic safety rules, emergency red-flag escalation | دستیار هوشمند مبتنی بر شواهد با قواعد ایمنی قطعی و ارجاع اورژانسی |
| 📊 **Health Tracking** — symptoms, vitals, appointments, reminders, medical records | ثبت علائم، ویزیت‌ها، یادآورها و پرونده پزشکی |
| 🥗 **Nutrition · Fitness · Mood** — daily guidance and journaling | تغذیه، فعالیت بدنی و ثبت خلق و خو |
| 👨‍👩‍👧 **Partner & Family Access** — consent-based, strictly scoped sharing | دستور خانواده فقط با رضایت صریح کاربر و دسترسی محدود |
| 🌍 **Community** — moderated peer support | جامعه کاربری با نظارت و مدیریت محتوا |
| 💳 **Subscriptions & Entitlements** — Free / Premium / Family tiers, server-side entitlements as source of truth | اشتراک رایگان/پرمیوم/خانواده با منبع حقیقت سمت سرور |
| 🛡 **Admin Console** — clinical review, moderation, audit, flags, finance | کنسول مدیریت: بازبینی بالینی، نظارت، ممیزی و مالی |
| 🔐 **Privacy & Consent** — consent records, data export, account deletion | ثبت رضایت، برون‌سپاری داده و حذف حساب |

## 🚀 Tech Stack

- **Next.js 16 (App Router) + TypeScript (strict)**
- **Tailwind CSS 4 + shadcn/ui** (New York) + Lucide icons
- **Three.js / React Three Fiber** for the scientific 3D studio
- **Prisma ORM + SQLite** (dev) — swappable to PostgreSQL in production
- **PWA** — installable, offline shell, service worker
- **Zustand** client state · TanStack Query-ready server state

## 📦 Getting Started / راه‌اندازی

```bash
# 1. install dependencies / نصب وابستگی‌ها
bun install

# 2. configure environment / تنظیم محیط
cp .env.example .env

# 3. create & seed the database / ساخت و پُرکردن پایگاه داده
bun run db:push
bunx prisma db exec --file prisma/seed.ts

# 4. start the dev server / اجرای سرور توسعه
bun run dev
```

Open the app at `http://localhost:3000`.

## 📁 Project Structure

```
├── docs/                    # Architecture, data model, API spec, design system,
│                            # 3D asset spec, medical safety, security, AI evaluation,
│                            # test plan, backlog & risk register (00–10)
├── prisma/                  # Schema + seed data
├── db/                      # Local SQLite database (gitignored, generated)
├── public/                  # PWA manifest, icons, logo, service worker
├── download/                # Scientific 3D render assets
├── src/app/api/             # REST API routes (auth, pregnancy, AI, tracking, admin, …)
├── src/components/views/    # Feature views (timeline, studio, tracking, family, …)
├── src/components/studio/   # 3D fetal studio (R3F scene, parametric model)
├── src/lib/                 # Auth, safety, RAG, gestational math, entitlements, i18n
└── src/data/                # Curated medical knowledge & weekly content
```

## 📚 Documentation / مستندات

| # | Document | سند |
| --- | --- | --- |
| 00 | Executive Summary | خلاصه اجرایی |
| 01 | System Architecture | معماری سیستم |
| 02 | Data Model | مدل داده |
| 03 | API Specification | مشخصات API |
| 04 | Design System | سیستم طراحی |
| 05 | 3D Asset Specification | مشخصه دارایی‌های سه‌بعدی |
| 06 | Medical Safety | ایمنی پزشکی |
| 07 | Security & Privacy | امنیت و حریم خصوصی |
| 08 | AI Evaluation | ارزیابی هوش مصنوعی |
| 09 | Test Plan | برنامه تست |
| 10 | Backlog & Risk Register | بک‌لاگ و ریسک |

## ⚠️ Medical Disclaimer / سلب مسئولیت پزشکی

> **NIVA is an educational and organizational tool — it is NOT a medical device and does not provide diagnosis, prescriptions, or treatment.** All 3D visualizations are educational illustrations, not diagnostic reconstructions. Always consult a qualified healthcare professional. In an emergency, contact your local emergency services immediately.
>
> **NIVA یک ابزار آموزشی و سازمان‌دهنده است — نه یک دستگاه پزشکی؛ تشخیص، نسخه یا درمان ارائه نمی‌دهد.** همه تصویرسازی‌های سه‌بعدی آموزشی هستند و بازسازی تشخیصی محسوب نمی‌شوند. در موارد اورژانسی فوراً با خدمات اورژانس تماس بگیرید.

## 🔐 Security Notes

- Never commit real secrets — use `.env` (gitignored) from `.env.example`
- Service-side entitlements & audit logs are the single source of truth
- Emergency red-flag guidance operates independently of the AI layer

---

Made with ❤️ for mothers and families · ساخته‌شده با ❤️ برای مادران و خانواده‌ها
