import { IsNotEmpty, IsString } from "class-validator";

export class TeamIdDto {
  @IsString()
  @IsNotEmpty()
  teamId!: string;
}
