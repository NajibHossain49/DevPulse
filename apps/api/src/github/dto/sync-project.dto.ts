import { IsString, IsNotEmpty } from "class-validator";

export class SyncProjectDto {
  // NOTE: Project IDs are Prisma cuids, not UUIDs, so this is validated as a
  // non-empty string rather than with @IsUUID() (which would reject cuids).
  @IsString()
  @IsNotEmpty()
  projectId: string;
}
