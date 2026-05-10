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
  try {
    const stories = await prisma.story.findMany({
      where: {
        expiresAt: { gt: new Date() }
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
    res.status(500).json({ message: 'Error fetching stories' });
  }
};

export const likeStory = async (req: Request, res: Response) => {
  const { storyId } = req.params;
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
