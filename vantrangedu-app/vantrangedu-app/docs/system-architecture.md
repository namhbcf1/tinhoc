# System Architecture

## Overview
VantrangEdu operates on a modern, high-performance edge infrastructure designed for maximum scalability, reduced latency, and a smooth development experience.

## Technology Stack
- **Framework**: Next.js 15 App Router (Monorepo architecture)
- **Database**: Cloudflare D1 (Serverless SQLite) with DrizzleORM
- **Object Storage**: Cloudflare R2 (for media, documents, and static assets)
- **Key-Value Store**: Cloudflare KV (for fast caching, sessions, and configuration)
- **Styling**: Tailwind CSS v4
- **Language**: TypeScript 5+

## Core Components
### 1. Frontend & API (Next.js 15 Monorepo)
- Utilizes React Server Components (RSC) heavily for reduced client-side Javascript.
- API Routes running on the edge, enabling low-latency responses.

### 2. Data Layer (DrizzleORM + D1)
- **DrizzleORM** ensures type-safe database queries.
- **Cloudflare D1** offers distributed, edge-native SQL storage, eliminating traditional database bottlenecks.

### 3. Edge Storage (R2 & KV)
- **R2 Storage** provides S3-compatible, zero-egress-fee asset storage for high-availability content delivery.
- **KV Store** is utilized for ephemeral state, caching API responses, and rapid configuration delivery.

## Deployment
Deployed seamlessly onto Cloudflare Pages / Workers, bridging the frontend and backend into a single hyper-fast global network.
