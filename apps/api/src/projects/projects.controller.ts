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
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/auth.decorator";
import { ProjectsService } from "./projects.service";
import { CreateProjectDto } from "./dto/create-project.dto";

@Controller("projects")
@UseGuards(AuthGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  createProject(
    @CurrentUser("id") userId: string,
    @Body() dto: CreateProjectDto,
  ) {
    return this.projectsService.createProject(userId, dto);
  }

  @Get()
  getProjects(
    @CurrentUser("id") userId: string,
    @Query("teamId") teamId: string,
  ) {
    return this.projectsService.getProjects(userId, teamId);
  }

  @Get(":id")
  getProject(@CurrentUser("id") userId: string, @Param("id") id: string) {
    return this.projectsService.getProject(userId, id);
  }

  @Delete(":id")
  deleteProject(
    @CurrentUser("id") userId: string,
    @Param("id") id: string,
  ) {
    return this.projectsService.deleteProject(userId, id);
  }
}
