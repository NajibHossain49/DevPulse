import { IsIn, IsNotEmpty, IsString } from "class-validator";

export class CheckoutDto {
  @IsString()
  @IsNotEmpty()
  teamId!: string;

  @IsIn(["pro", "enterprise"])
  plan!: "pro" | "enterprise";
}
