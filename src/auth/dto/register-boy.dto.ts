import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
  Min,
  Max,
} from 'class-validator';

export class RegisterBoyDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  displayName: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  phone: string;

  @ApiProperty()
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(18)
  @Max(99)
  age?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  country?: string;
}
