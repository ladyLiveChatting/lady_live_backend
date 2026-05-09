import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterGirlDto } from './dto/register-girl.dto';
import { LoginDto } from './dto/login.dto';
import { GuestDto } from './dto/guest.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterBoyDto } from './dto/register-boy.dto';
import { BoyPhoneDto } from './dto/boy-phone.dto';
import { GirlPhoneDto } from './dto/girl-phone.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('register/girl')
  @ApiOperation({ summary: 'Girl signup' })
  registerGirl(@Body() dto: RegisterGirlDto) {
    return this.auth.registerGirl(dto);
  }

  @Post('register/boy')
  @ApiOperation({ summary: 'Boy signup (wallet seeded)' })
  registerBoy(@Body() dto: RegisterBoyDto) {
    return this.auth.registerBoy(dto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login with phone + password' })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Post('guest')
  @ApiOperation({ summary: 'Boy guest session (wallet seeded)' })
  guest(@Body() dto: GuestDto) {
    return this.auth.guest(dto);
  }

  @Post('boy/phone')
  @ApiOperation({ summary: 'Boy quick login by phone (no password)' })
  boyPhone(@Body() dto: BoyPhoneDto) {
    return this.auth.boyQuickPhone(dto);
  }

  @Post('girl/phone')
  @ApiOperation({ summary: 'Girl quick login by phone (no password, legacy UI)' })
  girlPhone(@Body() dto: GirlPhoneDto) {
    return this.auth.girlQuickPhone(dto);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Rotate tokens' })
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }
}
