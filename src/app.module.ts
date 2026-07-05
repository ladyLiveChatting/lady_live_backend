import { join } from 'path';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { nestConfigEnvFilePaths } from './config/load-env';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ChatModule } from './chat/chat.module';
import { DiscoveryModule } from './discovery/discovery.module';
import { WalletModule } from './wallet/wallet.module';
import { CallsModule } from './calls/calls.module';
import { SocketModule } from './socket/socket.module';
import { AgoraModule } from './agora/agora.module';
import { HealthModule } from './health/health.module';
import { NotificationsModule } from './notifications/notifications.module';
import { R2Module } from './r2/r2.module';
import { UploadsModule } from './uploads/uploads.module';
import { GiftsModule } from './gifts/gifts.module';
import { PaymentsModule } from './payments/payments.module';

const backendRoot = join(__dirname, '..');
const envFilePaths = nestConfigEnvFilePaths(backendRoot);

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      ...(envFilePaths.length ? { envFilePath: envFilePaths } : {}),
    }),
    HealthModule,
    PrismaModule,
    AuthModule,
    UsersModule,
    ChatModule,
    DiscoveryModule,
    WalletModule,
    CallsModule,
    SocketModule,
    AgoraModule,
    NotificationsModule,
    R2Module,
    UploadsModule,
    GiftsModule,
    PaymentsModule,
  ],
})
export class AppModule {}
