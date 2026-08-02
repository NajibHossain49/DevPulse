import { IsString, IsNotEmpty } from "class-validator";

export class InsightsDto {
  // NOTE: cuid, not UUID (see analyze-pr.dto.ts).
  @IsString()
  @IsNotEmpty()
  projectId: string;
}
