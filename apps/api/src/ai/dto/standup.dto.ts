import { IsString, IsNotEmpty, IsEmail, IsOptional, IsNumber } from "class-validator";

export class StandupDto {
  // NOTE: cuid, not UUID (see analyze-pr.dto.ts).
  @IsString()
  @IsNotEmpty()
  projectId: string;

  @IsEmail()
  userEmail: string;

  @IsOptional()
  @IsNumber()
  days = 1;
}
