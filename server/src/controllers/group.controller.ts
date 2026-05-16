import { Request, Response } from 'express';
import prisma from '../config/prisma';

export const createGroup = async (req: Request, res: Response) => {
  const { name, description, memberIds, icon } = req.body;
  const adminId = (req as any).userId;

  try {
    const group = await prisma.group.create({
      data: {
        name,
        description,
        icon,
        adminId,
        members: {
          create: [
            { userId: adminId, role: 'ADMIN' },
            ...(memberIds || []).map((id: string) => ({ userId: id, role: 'MEMBER' }))
          ]
        }
      },
      include: {
        members: {
          include: {
            user: {
              select: { username: true, profilePic: true }
            }
          }
        }
      }
    });
    res.status(201).json(group);
  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).json({ message: 'Error creating group' });
  }
};

export const getGroups = async (req: Request, res: Response) => {
  const userId = (req as any).userId;

  try {
    const groupMemberships = await prisma.groupMember.findMany({
      where: { userId },
      include: {
        group: {
          include: {
            members: {
              include: {
                user: {
                  select: { username: true, profilePic: true, isOnline: true }
                }
              }
            },
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 1
            }
          }
        }
      }
    });

    const groups = groupMemberships.map(gm => ({
      ...gm.group,
      lastMessage: gm.group.messages[0] || null
    }));

    res.status(200).json(groups);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching groups' });
  }
};

export const updateGroup = async (req: Request, res: Response) => {
  const { groupId } = req.params;
  const { name, description, icon } = req.body;
  const userId = (req as any).userId;

  try {
    const group = await prisma.group.findUnique({ where: { id: groupId as string } });
    if (!group || group.adminId !== userId) {
      return res.status(403).json({ message: 'Only admin can update group' });
    }

    const updatedGroup = await prisma.group.update({
      where: { id: groupId as string },
      data: { name: name as string, description: description as string, icon: icon as string }
    });
    res.status(200).json(updatedGroup);
  } catch (error) {
    res.status(500).json({ message: 'Error updating group' });
  }
};

export const addMembers = async (req: Request, res: Response) => {
  const { groupId } = req.params;
  const { memberIds } = req.body;
  const userId = (req as any).userId;

  try {
    const group = await prisma.group.findUnique({ where: { id: groupId as string } });
    if (!group || group.adminId !== userId) {
      return res.status(403).json({ message: 'Only admin can add members' });
    }

    await prisma.groupMember.createMany({
      data: (memberIds as string[]).map((id: string) => ({
        userId: id,
        groupId: groupId as string,
        role: 'MEMBER'
      })),
      skipDuplicates: true
    });

    res.status(200).json({ message: 'Members added successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error adding members' });
  }
};

export const removeMember = async (req: Request, res: Response) => {
  const { groupId, memberId } = req.params;
  const userId = (req as any).userId;

  try {
    const group = await prisma.group.findUnique({ where: { id: groupId as string } });
    if (!group || group.adminId !== userId) {
      return res.status(403).json({ message: 'Only admin can remove members' });
    }

    if (memberId === userId) {
      return res.status(400).json({ message: 'Admin cannot be removed' });
    }

    await prisma.groupMember.delete({
      where: {
        userId_groupId: {
          userId: memberId as string,
          groupId: groupId as string
        }
      }
    });

    res.status(200).json({ message: 'Member removed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error removing member' });
  }
};

export const getGroupMessages = async (req: Request, res: Response) => {
  const { groupId } = req.params;
  const userId = (req as any).userId;

  try {
    // Check if user is a member
    const membership = await prisma.groupMember.findUnique({
      where: { userId_groupId: { userId, groupId: groupId as string } }
    });

    if (!membership) {
      return res.status(403).json({ message: 'Not a member of this group' });
    }

    const messages = await prisma.message.findMany({
      where: { groupId: groupId as string },
      include: {
        sender: {
          select: { username: true, profilePic: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    });
    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching group messages' });
  }
};
