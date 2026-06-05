import { ForbiddenException, Injectable } from '@nestjs/common';
import { UserRole } from '../prisma-client';
import { R2Service } from '../r2/r2.service';
import { PresignImageDto } from './dto/presign-image.dto';

@Injectable()
export class UploadsService {
  constructor(private readonly r2: R2Service) {}

  presignForGirl(userId: string, role: UserRole, dto: PresignImageDto) {
    if (role !== UserRole.GIRL) {
      throw new ForbiddenException('Only girls can upload profile images');
    }
    return this.r2.presignProfileUpload({
      userId,
      kind: dto.kind,
      contentType: dto.contentType,
    });
  }
}
