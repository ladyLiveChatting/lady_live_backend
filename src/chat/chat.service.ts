import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaClient } from '../prisma-client';

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaClient) {}

  private async findDmBetween(a: string, b: string) {
    const convs = await this.prisma.conversation.findMany({
      include: { members: true },
    });
    return convs.find(
      (c) =>
        c.members.length === 2 &&
        c.members.some((m) => m.userId === a) &&
        c.members.some((m) => m.userId === b),
    );
  }

  async ensureDm(userId: string, peerId: string) {
    if (userId === peerId) throw new ForbiddenException();
    const peer = await this.prisma.user.findUnique({ where: { id: peerId } });
    if (!peer) throw new NotFoundException('Peer not found');
    const existing = await this.findDmBetween(userId, peerId);
    if (existing) return existing;
    return this.prisma.conversation.create({
      data: {
        members: {
          create: [{ userId: userId }, { userId: peerId }],
        },
      },
      include: { members: true },
    });
  }

  async listConversations(userId: string) {
    const convs = await this.prisma.conversation.findMany({
      where: { members: { some: { userId } } },
      include: {
        members: { include: { user: { include: { profile: true } } } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { updatedAt: 'desc' },
    });
    // Add unreadCount for each conversation (simple MVP implementation).
    return Promise.all(
      convs.map(async (c) => {
        const unreadCount = await this.prisma.message.count({
          where: {
            conversationId: c.id,
            senderId: { not: userId },
            readAt: null,
          },
        });
        return { ...c, unreadCount };
      }),
    );
  }

  async listMessages(conversationId: string, userId: string) {
    const member = await this.prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: { conversationId, userId },
      },
    });
    if (!member) throw new ForbiddenException();
    return this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: 200,
    });
  }

  async appendMessage(conversationId: string, senderId: string, body: string) {
    const member = await this.prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: { conversationId, userId: senderId },
      },
    });
    if (!member) throw new ForbiddenException();
    const msg = await this.prisma.message.create({
      data: { conversationId, senderId, body },
    });
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });
    return msg;
  }

  async markRead(conversationId: string, readerId: string) {
    await this.prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: readerId },
        readAt: null,
      },
      data: { readAt: new Date() },
    });
    return { ok: true };
  }
}
