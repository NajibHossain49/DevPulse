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

@ApiTags("projects")
@ApiBearerAuth()
@Controller("projects")
@UseGuards(AuthGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @ApiOperation({ summary: "Create a project (validates the GitHub repo)" })
  @ApiResponse({ status: 200, description: "Success" })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  createProject(
    @CurrentUser("id") userId: string,
    @Body() dto: CreateProjectDto,
  ) {
    return this.projectsService.createProject(userId, dto);
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

  @Delete(":id")
  @ApiOperation({ summary: "Delete a project (admin/owner only)" })
  @ApiResponse({ status: 200, description: "Success" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  deleteProject(
    @CurrentUser("id") userId: string,
    @Param("id") id: string,
  ) {
    return this.projectsService.deleteProject(userId, id);
  }
}
