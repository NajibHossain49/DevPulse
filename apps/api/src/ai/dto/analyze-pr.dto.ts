import { IsString, IsNotEmpty } from "class-validator";

export class AnalyzePrDto {
  // NOTE: IDs are Prisma cuids, not UUIDs, so validated as non-empty strings
  // rather than with @IsUUID() (which would reject cuids).
  @IsString()
  @IsNotEmpty()
  projectId: string;

  @IsString()
  @IsNotEmpty()
  prId: string;
}
