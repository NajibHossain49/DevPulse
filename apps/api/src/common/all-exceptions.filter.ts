import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import type { Response } from "express";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = this.resolveMessage(exception);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(message, (exception as Error)?.stack);
    }

    response.status(status).json({
      success: false,
      error: message,
      statusCode: status,
    });
  }

  private resolveMessage(exception: unknown): string {
    if (exception instanceof HttpException) {
      const res = exception.getResponse();
      if (typeof res === "string") return res;
      const maybeMessage = (res as { message?: string | string[] }).message;
      if (Array.isArray(maybeMessage)) return maybeMessage.join(", ");
      if (typeof maybeMessage === "string") return maybeMessage;
      return exception.message;
    }
    if (exception instanceof Error) return exception.message;
    return "Internal server error";
  }
}
