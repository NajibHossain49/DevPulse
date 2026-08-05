import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Post,
  UnauthorizedException,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { TelegramService } from "./telegram.service";

@ApiTags("telegram")
@Controller("telegram")
export class TelegramController {
  constructor(private readonly telegram: TelegramService) {}

  @Get("health")
  @ApiOperation({ summary: "Telegram bot configuration status" })
  health() {
    return {
      enabled: this.telegram.isEnabled(),
      hasDefaultChat: Boolean(process.env.TELEGRAM_CHAT_ID?.trim()),
    };
  }

  @Post("webhook")
  @HttpCode(200)
  @ApiOperation({ summary: "Telegram Bot API webhook receiver" })
  async webhook(
    @Body() body: unknown,
    @Headers("x-telegram-bot-api-secret-token") secretHeader?: string,
  ) {
    const expected = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
    if (expected && secretHeader !== expected) {
      throw new UnauthorizedException("Invalid Telegram webhook secret");
    }

    if (!this.telegram.isEnabled()) {
      return { ok: true, skipped: true };
    }

    await this.telegram.handleUpdate(body as Parameters<
      TelegramService["handleUpdate"]
    >[0]);
    return { ok: true };
  }

  @Post("alert")
  @ApiOperation({ summary: "Push an alert to the default Telegram chat" })
  async pushAlert(
    @Body() body: { title: string; description: string; chatId?: string },
  ) {
    await this.telegram.sendAlert(
      { title: body.title, description: body.description },
      body.chatId,
    );
    return { ok: true };
  }
}
