import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class SendBoysPushDto {
  @ApiProperty({ example: 'Meet & Connect' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title!: string;

  @ApiProperty({ example: 'A girl is online — say hi!' })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  body!: string;

  @ApiPropertyOptional({
    description: 'Send to one boy user id; omit to notify all boys with a saved FCM token.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(191)
  userId?: string;

  @ApiPropertyOptional({
    description: 'Custom key/value strings passed to the app (FCM data payload).',
    example: { type: 'promo', screen: 'discovery' },
  })
  @IsOptional()
  @IsObject()
  data?: Record<string, string>;
}
