import { IsDateString, IsInt, IsNotEmpty, IsString, Min } from "class-validator";

export class SprintPredictDto {
  @IsString()
  @IsNotEmpty()
  projectId!: string;

  @IsDateString()
  sprintEndDate!: string;

  @IsInt()
  @Min(1)
  targetPRs!: number;
}
