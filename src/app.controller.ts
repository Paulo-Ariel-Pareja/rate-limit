import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  async validateRequest(
    @Body() body: any,
    @Headers() headers: any,
  ): Promise<{ message: string; timestamp: string }> {
    await this.appService.validateRequest(body, headers);

    return {
      message: 'Solicitud procesada exitosamente',
      timestamp: new Date().toISOString(),
    };
  }

  @Post('health')
  @HttpCode(HttpStatus.OK)
  healthCheck(): { status: string; timestamp: string } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
