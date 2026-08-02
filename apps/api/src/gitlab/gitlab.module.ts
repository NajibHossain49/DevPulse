import { Module } from "@nestjs/common";
import { GitlabProvider } from "./gitlab.provider";

@Module({
  providers: [GitlabProvider],
  exports: [GitlabProvider],
})
export class GitlabModule {}
