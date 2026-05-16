import { Request, Response } from 'express';
import prisma from '../config/prisma';

export const createStory = async (req: Request, res: Response) => {
  const { mediaUrl, mediaType, caption } = req.body;
  const userId = (req as any).userId;

  try {
    const story = await prisma.story.create({
      data: {
        mediaUrl,
        mediaType,
        caption,
        userId,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h
      }
    });
    res.status(201).json(story);
  } catch (error) {
    res.status(500).json({ message: 'Error creating story' });
  }
};

export const getStories = async (req: Request, res: Response) => {
  const userId = (req as any).userId;

  try {
    // Find all unique users the current user has exchanged messages with
    const messagedUsers = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId },
          { receiverId: userId }
        ]
      },
      select: {
        senderId: true,
        receiverId: true
      }
    });

    const contactIds = new Set<string>();
    contactIds.add(userId); // Always show own stories

    messagedUsers.forEach(msg => {
      if (msg.senderId) contactIds.add(msg.senderId);
      if (msg.receiverId) contactIds.add(msg.receiverId);
    });

    const stories = await prisma.story.findMany({
      where: {
        expiresAt: { gt: new Date() },
        userId: { in: Array.from(contactIds) }
      },
      include: {
        user: {
          select: { username: true, userCode: true, profilePic: true }
        },
        likes: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.status(200).json(stories);
  } catch (error) {
    console.error('Error fetching stories:', error);
    res.status(500).json({ message: 'Error fetching stories' });
  }
};

export const likeStory = async (req: Request, res: Response) => {
  const storyId = req.params.storyId as string;
  const userId = (req as any).userId;

  try {
    const existingLike = await prisma.storyLike.findFirst({
      where: { storyId, userId }
    });

    if (existingLike) {
      await prisma.storyLike.delete({ where: { id: existingLike.id } });
      return res.status(200).json({ liked: false });
    }

    await prisma.storyLike.create({
      data: { storyId, userId }
    });
    res.status(200).json({ liked: true });
  } catch (error) {
    res.status(500).json({ message: 'Error toggling like' });
  }
};
