import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class EndCallDto {
  @ApiProperty({ example: 180 })
  @IsInt()
  @Min(1)
  durationSeconds: number;
}
