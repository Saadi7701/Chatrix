# AURA ELITE - Futuristic AI Social Chat

A high-performance, production-ready social chat application built with React, Node.js, and AI.

## Features
- **Futuristic UI**: Glassmorphism, 3D backgrounds (Three.js), and high-end animations (GSAP/Framer Motion).
- **Personal AI**: Train your own AI assistant with custom commands and document knowledge.
- **Real-time Messaging**: Ultra-low latency chat using Socket.IO.
- **Offline-First**: Continuous operation even without internet via IndexedDB caching.
- **Unique User Codes**: Custom futuristic handles for every user.
- **Secure**: JWT-based authentication and quantum-inspired design.

## Tech Stack
- **Frontend**: React, Vite, TypeScript, TailwindCSS, Three.js, Zustand.
- **Backend**: Node.js, Express, Socket.IO, Prisma ORM, PostgreSQL.
- **AI**: OpenAI GPT-4, LangChain.
- **Storage**: Cloudinary/S3 for media.

## Setup
1. Clone the repository.
2. Install dependencies:
   ```bash
   cd server && npm install
   cd ../client && npm install
   ```
3. Configure `.env` in `server/`.
4. Run Prisma migrations:
   ```bash
   npx prisma migrate dev
   ```
5. Start development servers:
   ```bash
   # Server
   npm run dev
   # Client
   npm run dev
   ```

## Deployment
Use Docker for easy deployment:
```bash
docker-compose up --build
```
