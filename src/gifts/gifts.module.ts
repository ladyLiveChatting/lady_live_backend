import { Module } from '@nestjs/common';
import { RolesGuard } from '../common/guards/roles.guard';
import { SocketModule } from '../socket/socket.module';
import { GiftsController } from './gifts.controller';
import { GiftsService } from './gifts.service';

@Module({
  imports: [SocketModule],
  controllers: [GiftsController],
  providers: [GiftsService, RolesGuard],
})
export class GiftsModule {}
