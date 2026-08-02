import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { AuthGuard } from "../auth/auth.guard";
import { QueueService } from "./queue.service";

@ApiTags("queue")
@ApiBearerAuth()
@Controller("queue")
@UseGuards(AuthGuard)
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  @Get("status")
  @ApiOperation({ summary: "Get background job queue status" })
  getStatus() {
    return this.queueService.getQueueStatus();
  }
}
