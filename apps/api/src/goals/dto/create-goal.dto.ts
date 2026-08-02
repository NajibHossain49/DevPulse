import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export const GOAL_METRICS = [
  "review_time",
  "merge_rate",
  "pr_count",
  "commit_count",
  "quality_score",
] as const;

export class CreateGoalDto {
  @IsString()
  @IsNotEmpty()
  teamId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsIn(GOAL_METRICS)
  metric!: (typeof GOAL_METRICS)[number];

  @IsNumber()
  target!: number;

  @IsDateString()
  deadline!: string;
}
