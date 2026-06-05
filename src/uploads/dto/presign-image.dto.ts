import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';

export class PresignImageDto {
  @ApiProperty({ enum: ['avatar', 'gallery'] })
  @IsString()
  @IsIn(['avatar', 'gallery'])
  kind!: 'avatar' | 'gallery';

  @ApiProperty({
    description: 'jpeg | png | webp | heic | heif (or image/jpeg, etc.)',
    example: 'jpeg',
  })
  @IsString()
  contentType!: string;
}
