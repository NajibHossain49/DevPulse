import { Module } from "@nestjs/common";
import { BenchmarksService } from "./benchmarks.service";
import { BenchmarksController } from "./benchmarks.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [PrismaModule, AuthModule],
  providers: [BenchmarksService],
  controllers: [BenchmarksController],
})
export class BenchmarksModule {}
