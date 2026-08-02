import { SetMetadata } from "@nestjs/common";
import { UsageType } from "./usage.service";

export const USAGE_LIMIT_KEY = "usageLimit";

export const UsageLimit = (type: UsageType) =>
  SetMetadata(USAGE_LIMIT_KEY, type);
