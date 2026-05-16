import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import authRoutes from './routes/auth';
import chatRoutes from './routes/chat';
import storyRoutes from './routes/story';
import uploadRoutes from './routes/upload';
import groupRoutes from './routes/group';
import { setupSocket } from './socket/socket.handler';
import prisma from './config/prisma';

dotenv.config();

const app = express();
const httpServer = createServer(app);

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const io = new Server(httpServer, {
  cors: {
    origin: [
      CLIENT_URL,
      'https://chatrix-nrg5.vercel.app',
      'https://chatrix.vercel.app',
      'http://localhost:5173'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  },
  transports: ['polling', 'websocket'],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000,
  upgradeTimeout: 30000,
  allowUpgrades: true
});

app.set('trust proxy', 1);

app.use(cors({
  origin: [
    CLIENT_URL,
    'https://chatrix-nrg5.vercel.app',
    'https://chatrix.vercel.app',
    'http://localhost:5173'
  ],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use((req, res, next) => {
  (req as any).io = io;
  next();
});

// Routes
app.get('/', (req, res) => {
  res.status(200).send('API is running perfectly! Database connection may be pending.');
});
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/stories', storyRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/groups', groupRoutes);

// Socket Handler
setupSocket(io);

const PORT = parseInt(process.env.PORT || '5000', 10);

// Start listening immediately to pass Railway Health Checks
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`[server]: Futuristic AI Chat Server is running at port ${PORT}`);
  
  // Initialize database in the background
  prisma.$connect()
    .then(() => {
      console.log('✅ Database connected successfully!');
    })
    .catch((error) => {
      console.error('❌ FATAL: Database connection failed!', error);
      // Don't exit, allow the server to stay up so we can see logs
    });
});
