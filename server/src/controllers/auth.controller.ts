import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/prisma';

export const register = async (req: Request, res: Response) => {
  try {
    const { username, fullName, password, userCode } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ username }, { userCode }] }
    });

    if (existingUser) {
      return res.status(400).json({ message: 'Identity already initialized with this username or 6-digit code.' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Generate a dummy email to satisfy unique constraint if not provided
    const email = `${username.toLowerCase()}@aura.elite`;

    const user = await prisma.user.create({
      data: {
        username,
        fullName,
        email,
        password: hashedPassword,
        userCode,
      }
    });

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || 'secret_key',
      { expiresIn: '7d' }
    );

    res.status(201).json({ token, user: { id: user.id, username: user.username, userCode: user.userCode, stealthCode: user.stealthCode } });
  } catch (error) {
    console.error('[Register Error]:', error);
    res.status(500).json({ message: 'Neural registration failed.', error });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      return res.status(404).json({ message: 'Neural identity not found.' });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(400).json({ message: 'Neural bridge rejected. Invalid credentials.' });
    }

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || 'secret_key',
      { expiresIn: '7d' }
    );

    res.status(200).json({ token, user: { id: user.id, username: user.username, userCode: user.userCode, stealthCode: user.stealthCode } });
  } catch (error) {
    console.error('[Login Error]:', error);
    res.status(500).json({ message: 'Neural link failed.' });
  }
};

export const searchUser = async (req: Request, res: Response) => {
  const code = req.params.code as string;
  try {
    const user = await prisma.user.findUnique({
      where: { userCode: code },
      select: {
        id: true,
        username: true,
        fullName: true,
        userCode: true,
        profilePic: true,
        isOnline: true,
        lastSeen: true
      }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error searching user' });
  }
};

export const getConversation = async (req: Request, res: Response) => {
  const otherUserId = req.params.otherUserId as string;
  const userId = (req as any).userId;

  try {
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: userId }
        ]
      },
      orderBy: { createdAt: 'asc' }
    });
    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching conversation' });
  }
};

export const getConversations = async (req: Request, res: Response) => {
  const userId = (req as any).userId;

  try {
    const sentMessages = await prisma.message.findMany({
      where: { senderId: userId },
      select: { receiverId: true },
      distinct: ['receiverId']
    });

    const receivedMessages = await prisma.message.findMany({
      where: { receiverId: userId },
      select: { senderId: true },
      distinct: ['senderId']
    });

    const userIds = Array.from(new Set([
      ...sentMessages.map(m => m.receiverId),
      ...receivedMessages.map(m => m.senderId)
    ])).filter(id => id !== null) as string[];

    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        username: true,
        fullName: true,
        userCode: true,
        profilePic: true,
        isOnline: true,
        lastSeen: true
      }
    });

    // Fetch last message for each user
    const conversations = await Promise.all(users.map(async (u) => {
      const lastMsg = await prisma.message.findFirst({
        where: {
          OR: [
            { senderId: userId, receiverId: u.id },
            { senderId: u.id, receiverId: userId }
          ]
        },
        orderBy: { createdAt: 'desc' }
      });
      return { ...u, lastMessage: lastMsg };
    }));

    // Sort by last message date
    conversations.sort((a, b) => {
      const dateA = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
      const dateB = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
      return dateB - dateA;
    });

    res.status(200).json(conversations);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching contacts' });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  const { username, fullName, bio } = req.body;
  const userId = (req as any).userId;

  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { username, fullName, bio }
    });
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: 'Neural update failed. Identity conflict?' });
  }
};

export const updateSettings = async (req: Request, res: Response) => {
  const { 
    ghostMode, 
    quantumEncryption, 
    notificationsEnabled, 
    callTransmissions, 
    storyInjections, 
    darkTheme, 
    networkCache, 
    biometricLock 
  } = req.body;
  const userId = (req as any).userId;

  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { 
        ghostMode, 
        quantumEncryption, 
        notificationsEnabled, 
        callTransmissions, 
        storyInjections, 
        darkTheme, 
        networkCache, 
        biometricLock 
      }
    });
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error updating settings' });
  }
};

export const updateStealthCode = async (req: Request, res: Response) => {
  const { code } = req.body;
  const userId = (req as any).userId;

  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { stealthCode: code }
    });
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error updating stealth code' });
  }
};

export const sendMessage = async (req: Request, res: Response) => {
  const { receiverId, content, type } = req.body;
  const userId = (req as any).userId;

  try {
    const message = await prisma.message.create({
      data: {
        content,
        senderId: userId,
        receiverId,
        type: type || 'TEXT',
        status: 'SENT'
      }
    });
    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ message: 'Error sending message' });
  }
};

export const checkUserCode = async (req: Request, res: Response) => {
  try {
    const code = req.params.code as string;
    const user = await prisma.user.findUnique({
      where: { userCode: code }
    });
    res.status(200).json({ exists: !!user });
  } catch (error) {
    res.status(500).json({ message: 'Error checking code' });
  }
};
