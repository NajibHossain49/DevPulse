import { IsBoolean } from "class-validator";

export class UpdateProjectSettingsDto {
  @IsBoolean()
  autoReview!: boolean;
}
