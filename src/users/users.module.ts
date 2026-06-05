import { Module } from '@nestjs/common';
import { RolesGuard } from '../common/guards/roles.guard';
import { UploadsModule } from '../uploads/uploads.module';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

@Module({
  imports: [UploadsModule],
  controllers: [UsersController],
  providers: [UsersService, RolesGuard],
  exports: [UsersService],
})
export class UsersModule {}
