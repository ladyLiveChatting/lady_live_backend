import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class SendGirlsPushDto {
  @ApiProperty({ example: 'Meet & Connect' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title!: string;

  @ApiProperty({ example: 'You earned bonus coins today!' })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  body!: string;

  @ApiPropertyOptional({
    description:
      'Send to one girl user id; omit to notify all girls with a saved FCM token.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(191)
  userId?: string;

  @ApiPropertyOptional({
    description: 'Custom key/value strings passed to the app (FCM data payload).',
    example: { type: 'promo', screen: 'earnings' },
  })
  @IsOptional()
  @IsObject()
  data?: Record<string, string>;
}
