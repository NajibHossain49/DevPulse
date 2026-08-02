import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Query,
  RawBody,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { BillingService } from "./billing.service";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/auth.decorator";
import { PrismaService } from "../prisma/prisma.service";
import { CheckoutDto } from "./dto/checkout.dto";
import { TeamIdDto } from "./dto/team-id.dto";

@ApiTags("billing")
@Controller("billing")
export class BillingController {
  constructor(
    private readonly billingService: BillingService,
    private readonly prisma: PrismaService,
  ) {}

  @Get("subscription")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get team subscription" })
  @ApiResponse({ status: 200, description: "Subscription details" })
  async getSubscription(@Query("teamId") teamId: string) {
    const sub = await this.billingService.getSubscription(teamId);
    return { subscription: sub };
  }

  @Post("checkout")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create Stripe checkout session" })
  @ApiResponse({ status: 200, description: "Checkout URL returned" })
  async createCheckout(
    @Body() dto: CheckoutDto,
    @CurrentUser() user: { id: string; email?: string },
  ) {
    const team = await this.prisma.team.findUnique({
      where: { id: dto.teamId },
      include: { owner: true },
    });
    if (!team) throw new BadRequestException("Team not found");
    const url = await this.billingService.createCheckoutSession(
      dto.teamId,
      dto.plan,
      team.owner.email || user.email || "",
      team.owner.name || "Team",
    );
    return url;
  }

  @Post("portal")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create Stripe customer portal session" })
  @ApiResponse({ status: 200, description: "Portal URL returned" })
  async createPortal(@Body() dto: TeamIdDto) {
    return this.billingService.createPortalSession(dto.teamId);
  }

  @Post("webhook")
  @ApiOperation({ summary: "Stripe webhook handler" })
  @ApiResponse({ status: 200, description: "Event received" })
  async handleWebhook(
    @Headers("stripe-signature") signature: string,
    @RawBody() payload: Buffer,
  ) {
    return this.billingService.handleWebhook(signature, payload);
  }
}
