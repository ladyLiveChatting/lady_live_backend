import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Max, Min } from 'class-validator';

export class AddCoinsDto {
  @ApiProperty({ example: 100 })
  @IsInt()
  @Min(1)
  @Max(100000)
  amount: number;
}
