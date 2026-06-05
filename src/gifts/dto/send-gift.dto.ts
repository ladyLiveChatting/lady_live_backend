import { IsNotEmpty, IsString } from 'class-validator';

export class SendGiftDto {
  @IsString()
  @IsNotEmpty()
  conversationId!: string;

  @IsString()
  @IsNotEmpty()
  giftId!: string;
}
