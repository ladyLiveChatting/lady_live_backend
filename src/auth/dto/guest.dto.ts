import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class GuestDto {
  @ApiPropertyOptional({ description: 'Optional display name for guest' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  displayName?: string;

  @ApiPropertyOptional({ description: 'Stable install / device id from the boys app' })
  @IsOptional()
  @IsString()
  @MaxLength(191)
  deviceId?: string;

  @ApiPropertyOptional({ description: 'FCM token for push notifications' })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  fcmToken?: string;
}
