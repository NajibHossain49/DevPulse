import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import type { Prisma } from "@devpulse/database";
import { AuthGuard } from "../auth/auth.guard";
import { AuditService } from "./audit.service";

type AuditLogWithUser = Prisma.AuditLogGetPayload<{
  include: { user: { select: { id: true; name: true; email: true } } };
}>;

@ApiTags("audit")
@ApiBearerAuth()
@Controller("audit")
@UseGuards(AuthGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({ summary: "Get audit logs" })
  async getLogs(
    @Query("resource") resource?: string,
    @Query("action") action?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
  ): Promise<AuditLogWithUser[]> {
    return this.auditService.getLogs({
      resource,
      action,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Get("stats")
  @ApiOperation({ summary: "Get audit log statistics" })
  async getStats(): Promise<{
    total: number;
    last24h: number;
    last7d: number;
  }> {
    return this.auditService.getLogStats();
  }
}
