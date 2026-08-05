import {
  IsString,
  MinLength,
  MaxLength,
  Matches,
  IsNotEmpty,
  IsOptional,
  IsIn,
} from "class-validator";

export class CreateProjectDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @IsString()
  @Matches(/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/, {
    message: "githubRepo must be in the format owner/repo",
  })
  githubRepo: string;

  // NOTE: Team IDs are Prisma cuids, not UUIDs, so this is validated as a
  // non-empty string rather than with @IsUUID() (which would reject cuids).
  @IsString()
  @IsNotEmpty()
  teamId: string;

  @IsOptional()
  @IsIn(["github"])
  provider?: "github";
}
