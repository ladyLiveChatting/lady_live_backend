import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppSocketGateway } from './socket.gateway';
import { ChatModule } from '../chat/chat.module';
import { CallsModule } from '../calls/calls.module';

@Module({
  imports: [
    ChatModule,
    CallsModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET') ?? 'dev-secret-change-me',
      }),
    }),
  ],
  providers: [AppSocketGateway],
})
export class SocketModule {}
