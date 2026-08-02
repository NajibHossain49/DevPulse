import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";
import { TeamsService } from "./teams.service";
import { TeamsController } from "./teams.controller";
import { MembersController } from "./members.controller";

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [TeamsController, MembersController],
  providers: [TeamsService],
  exports: [TeamsService],
})
export class TeamsModule {}
