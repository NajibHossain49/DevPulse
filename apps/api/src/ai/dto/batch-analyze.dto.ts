import { IsString, IsNotEmpty } from "class-validator";

export class BatchAnalyzeDto {
  // NOTE: cuid, not UUID (see analyze-pr.dto.ts).
  @IsString()
  @IsNotEmpty()
  projectId: string;
}
