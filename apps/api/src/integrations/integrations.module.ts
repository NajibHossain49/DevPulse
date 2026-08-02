import { Module } from "@nestjs/common";
import { GithubModule } from "../github/github.module";
import { GitlabModule } from "../gitlab/gitlab.module";
import { GithubService } from "../github/github.service";
import { GitlabProvider } from "../gitlab/gitlab.provider";
import { GIT_PROVIDER } from "../github/git-provider.interface";

@Module({
  imports: [GithubModule, GitlabModule],
  providers: [
    {
      provide: GIT_PROVIDER,
      useFactory: (github: GithubService, gitlab: GitlabProvider) => ({
        github,
        gitlab,
      }),
      inject: [GithubService, GitlabProvider],
    },
  ],
  exports: [GithubModule, GitlabModule, GIT_PROVIDER],
})
export class IntegrationsModule {}
