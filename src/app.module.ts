import { join } from 'path';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ChatModule } from './chat/chat.module';
import { DiscoveryModule } from './discovery/discovery.module';
import { WalletModule } from './wallet/wallet.module';
import { CallsModule } from './calls/calls.module';
import { SocketModule } from './socket/socket.module';
import { AgoraModule } from './agora/agora.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Load .env from backend root even when cwd / debugger differs from `backend/`
      envFilePath: [join(__dirname, '..', '.env'), join(__dirname, '..', '.env.local')],
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    ChatModule,
    DiscoveryModule,
    WalletModule,
    CallsModule,
    SocketModule,
    AgoraModule,
  ],
})
export class AppModule {}
