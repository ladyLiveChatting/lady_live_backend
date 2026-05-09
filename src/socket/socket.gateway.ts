import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PrismaClient } from '../prisma-client';
import { ChatService } from '../chat/chat.service';
import { CallsService } from '../calls/calls.service';

type AuthedSocket = Socket & { data: { userId?: string } };

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  transports: ['websocket', 'polling'],
})
export class AppSocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly log = new Logger(AppSocketGateway.name);

  constructor(
    private jwt: JwtService,
    private config: ConfigService,
    private readonly prisma: PrismaClient,
    private chat: ChatService,
    private calls: CallsService,
  ) {}

  private accessSecret() {
    return this.config.get<string>('JWT_SECRET') ?? 'dev-secret-change-me';
  }

  private tokenFrom(client: Socket) {
    const a = client.handshake.auth as { token?: string } | undefined;
    if (a?.token) return a.token as string;
    const h = client.handshake.headers.authorization;
    if (h?.startsWith('Bearer ')) return h.slice(7);
    return null;
  }

  async handleConnection(client: AuthedSocket) {
    const raw = this.tokenFrom(client);
    if (!raw) {
      client.disconnect(true);
      return;
    }
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string; role: string }>(
        raw,
        { secret: this.accessSecret() },
      );
      client.data.userId = payload.sub;
      client.join(`user:${payload.sub}`);
      await this.prisma.profile.updateMany({
        where: { userId: payload.sub },
        data: { isOnline: true, lastSeenAt: new Date() },
      });
      this.server.emit('presence:update', {
        userId: payload.sub,
        online: true,
      });
    } catch (e) {
      this.log.warn(`Socket auth failed: ${e}`);
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: AuthedSocket) {
    const uid = client.data.userId;
    if (!uid) return;
    await this.prisma.profile.updateMany({
      where: { userId: uid },
      data: { isOnline: false, lastSeenAt: new Date() },
    });
    this.server.emit('presence:update', { userId: uid, online: false });
  }

  @SubscribeMessage('join_conversation')
  async joinConv(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { conversationId: string },
  ) {
    const uid = client.data.userId;
    if (!uid) return { error: 'unauthorized' };
    await this.chat.listMessages(body.conversationId, uid);
    await client.join(`conversation:${body.conversationId}`);
    return { ok: true };
  }

  @SubscribeMessage('chat:typing')
  typing(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { conversationId: string; typing: boolean },
  ) {
    const uid = client.data.userId;
    if (!uid) return;
    client
      .to(`conversation:${body.conversationId}`)
      .emit('chat:typing', { userId: uid, typing: body.typing });
  }

  @SubscribeMessage('chat:message')
  async chatMessage(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { conversationId: string; body: string },
  ) {
    const uid = client.data.userId;
    if (!uid) return { error: 'unauthorized' };
    const msg = await this.chat.appendMessage(
      body.conversationId,
      uid,
      body.body,
    );
    this.server
      .to(`conversation:${body.conversationId}`)
      .emit('chat:message', msg);
    return { ok: true, message: msg };
  }

  @SubscribeMessage('chat:read')
  async chatRead(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { conversationId: string },
  ) {
    const uid = client.data.userId;
    if (!uid) return { error: 'unauthorized' };
    await this.chat.markRead(body.conversationId, uid);
    this.server.to(`conversation:${body.conversationId}`).emit('chat:read', {
      conversationId: body.conversationId,
      readerId: uid,
      readAt: new Date().toISOString(),
    });
    return { ok: true };
  }

  @SubscribeMessage('call:request')
  async callRequest(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { calleeId: string },
  ) {
    const uid = client.data.userId;
    if (!uid) return { error: 'unauthorized' };
    const { call, rate } = await this.calls.request(uid, body.calleeId);
    this.server.to(`user:${body.calleeId}`).emit('call:incoming', {
      call,
      rate,
      callerId: uid,
    });
    return { ok: true, call, rate };
  }

  @SubscribeMessage('call:accept')
  async callAccept(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { callId: string },
  ) {
    const uid = client.data.userId;
    if (!uid) return { error: 'unauthorized' };
    const updated = await this.calls.accept(uid, body.callId);
    this.server
      .to(`user:${updated.callerId}`)
      .emit('call:accepted', { call: updated });
    return { ok: true, call: updated };
  }

  @SubscribeMessage('call:reject')
  async callReject(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { callId: string },
  ) {
    const uid = client.data.userId;
    if (!uid) return { error: 'unauthorized' };
    const updated = await this.calls.reject(uid, body.callId);
    this.server
      .to(`user:${updated.callerId}`)
      .emit('call:rejected', { call: updated });
    return { ok: true, call: updated };
  }

  @SubscribeMessage('call:end')
  async callEnd(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { callId: string; durationSeconds: number },
  ) {
    const uid = client.data.userId;
    if (!uid) return { error: 'unauthorized' };
    try {
      const { call, billing } = await this.calls.end(
        uid,
        body.callId,
        body.durationSeconds,
      );
      this.server
        .to(`user:${call.calleeId}`)
        .emit('call:ended', { call, billing });
      this.server
        .to(`user:${call.callerId}`)
        .emit('call:ended', { call, billing });
      return { ok: true, call, billing };
    } catch (e) {
      return { error: String(e) };
    }
  }
}
