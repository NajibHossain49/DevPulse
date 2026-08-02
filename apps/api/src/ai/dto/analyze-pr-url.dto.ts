import { IsOptional, IsString, IsNotEmpty } from "class-validator";

export class AnalyzePrUrlDto {
  @IsOptional()
  @IsString()
  prUrl?: string;

  @IsOptional()
  @IsString()
  owner?: string;

  @IsOptional()
  @IsString()
  repo?: string;

  @IsOptional()
  @IsString()
  pr?: string;
}
