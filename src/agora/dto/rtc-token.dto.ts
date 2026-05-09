import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class RtcTokenDto {
  @ApiProperty({ example: 'call_clxyz123', description: 'Agora channel name (e.g. call_<id>)' })
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  channelName!: string;

  @ApiProperty({ example: 10001, description: 'Agora UID (unsigned int32)' })
  @IsInt()
  @Min(1)
  @Max(4294967295)
  uid!: number;
}
