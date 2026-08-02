import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";
import { GithubModule } from "../github/github.module";
import { ProjectsService } from "./projects.service";
import { ProjectsController } from "./projects.controller";

@Module({
  imports: [PrismaModule, GithubModule, AuthModule],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
