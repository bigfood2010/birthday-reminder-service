import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getHealth(): { status: 'ok' } {
    return { status: 'ok' };
  }
}
