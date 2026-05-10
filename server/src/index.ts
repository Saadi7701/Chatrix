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
import { setupSocket } from './socket/socket.handler';

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
  }
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

// Routes
app.get('/', (req, res) => {
  res.status(200).send('API is running perfectly! Database connection may be pending.');
});
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/stories', storyRoutes);
app.use('/api/upload', uploadRoutes);

// Socket Handler
setupSocket(io);

const PORT = parseInt(process.env.PORT || '5000', 10);
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`[server]: Futuristic AI Chat Server is running at port ${PORT}`);
});
