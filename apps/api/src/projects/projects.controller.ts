import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/auth.decorator";
import { ProjectsService } from "./projects.service";
import { CreateProjectDto } from "./dto/create-project.dto";
import { UpdateProjectSettingsDto } from "./dto/update-project-settings.dto";
import { PermissionsGuard } from "../permissions/permissions.guard";
import { RequirePermission } from "../permissions/permissions.decorator";
import { Permission } from "../permissions/permissions.service";
import { UsageGuard } from "../usage/usage.guard";
import { UsageLimit } from "../usage/usage.decorator";
import { UsageService } from "../usage/usage.service";
import { AuditAction, AuditResource } from "../audit/audit.decorator";

@ApiTags("projects")
@ApiBearerAuth()
@Controller("projects")
@UseGuards(AuthGuard, PermissionsGuard, UsageGuard)
export class ProjectsController {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly usageService: UsageService,
  ) {}

  @Post()
  @RequirePermission(Permission.PROJECT_WRITE)
  @UsageLimit("project")
  @AuditAction("create_project")
  @AuditResource("project")
  @ApiOperation({ summary: "Create a project (validates the GitHub repo)" })
  @ApiResponse({ status: 200, description: "Success" })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden / limit exceeded" })
  async createProject(
    @CurrentUser("id") userId: string,
    @Body() dto: CreateProjectDto,
  ) {
    const project = await this.projectsService.createProject(userId, dto);
    await this.usageService.incrementUsage(dto.teamId, "project");
    return project;
  }

  @Get()
  @ApiOperation({ summary: "List projects for a team" })
  @ApiResponse({ status: 200, description: "Success" })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  getProjects(
    @CurrentUser("id") userId: string,
    @Query("teamId") teamId: string,
  ) {
    return this.projectsService.getProjects(userId, teamId);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a project by id" })
  @ApiResponse({ status: 200, description: "Success" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  getProject(@CurrentUser("id") userId: string, @Param("id") id: string) {
    return this.projectsService.getProject(userId, id);
  }

  @Post(":id/settings")
  @RequirePermission(Permission.PROJECT_WRITE)
  @ApiOperation({ summary: "Update project settings (e.g. auto AI review)" })
  @ApiResponse({ status: 200, description: "Success" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden" })
  updateSettings(
    @CurrentUser("id") userId: string,
    @Param("id") id: string,
    @Body() dto: UpdateProjectSettingsDto,
  ) {
    return this.projectsService.updateSettings(userId, id, dto);
  }

  @Delete(":id")
  @RequirePermission(Permission.PROJECT_DELETE)
  @AuditAction("delete_project")
  @AuditResource("project")
  @ApiOperation({ summary: "Delete a project (admin/owner only)" })
  @ApiResponse({ status: 200, description: "Success" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden" })
  deleteProject(
    @CurrentUser("id") userId: string,
    @Param("id") id: string,
  ) {
    return this.projectsService.deleteProject(userId, id);
  }
}
