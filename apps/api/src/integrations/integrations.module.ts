import { Module } from "@nestjs/common";
import { GithubModule } from "../github/github.module";
import { GithubService } from "../github/github.service";
import { GIT_PROVIDER } from "../github/git-provider.interface";

@Module({
  imports: [GithubModule],
  providers: [
    {
      provide: GIT_PROVIDER,
      useFactory: (github: GithubService) => ({
        github,
      }),
      inject: [GithubService],
    },
  ],
  exports: [GithubModule, GIT_PROVIDER],
})
export class IntegrationsModule {}
