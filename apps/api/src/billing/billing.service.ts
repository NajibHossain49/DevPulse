import { Injectable, BadRequestException } from "@nestjs/common";
import Stripe from "stripe";
import { PrismaService } from "../prisma/prisma.service";
import { PlanType } from "./plan.config";

@Injectable()
export class BillingService {
  private readonly stripe: Stripe;

  constructor(private readonly prisma: PrismaService) {
    // apiVersion intentionally omitted so the installed Stripe SDK uses its
    // own pinned version (avoids TypeScript literal-version mismatches).
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");
  }

  async getOrCreateCustomer(teamId: string, email: string, name: string) {
    const sub = await this.prisma.subscription.findUnique({
      where: { teamId },
    });
    if (sub?.stripeCustomerId) {
      return sub.stripeCustomerId;
    }
    const customer = await this.stripe.customers.create({
      email,
      name,
      metadata: { teamId },
    });
    await this.prisma.subscription.upsert({
      where: { teamId },
      create: {
        teamId,
        stripeCustomerId: customer.id,
        plan: "free",
      },
      update: { stripeCustomerId: customer.id },
    });
    return customer.id;
  }

  async createCheckoutSession(
    teamId: string,
    plan: PlanType,
    customerEmail: string,
    customerName: string,
  ) {
    const priceId = this.getPriceId(plan);
    if (!priceId) {
      throw new BadRequestException("Invalid plan or price not configured");
    }
    const customerId = await this.getOrCreateCustomer(
      teamId,
      customerEmail,
      customerName,
    );
    const webUrl = process.env.WEB_URL || "http://localhost:3000";
    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${webUrl}/dashboard/settings/billing?success=1`,
      cancel_url: `${webUrl}/dashboard/settings/billing?canceled=1`,
      metadata: { teamId, plan },
    });
    return { url: session.url };
  }

  async createPortalSession(teamId: string) {
    const sub = await this.prisma.subscription.findUnique({
      where: { teamId },
    });
    if (!sub?.stripeCustomerId) {
      throw new BadRequestException("No subscription found");
    }
    const webUrl = process.env.WEB_URL || "http://localhost:3000";
    const session = await this.stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: `${webUrl}/dashboard/settings/billing`,
    });
    return { url: session.url };
  }

  async getSubscription(teamId: string) {
    return this.prisma.subscription.findUnique({
      where: { teamId },
    });
  }

  async handleWebhook(signature: string, payload: Buffer) {
    const event = this.stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || "",
    );
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const { teamId, plan } = session.metadata || {};
        if (teamId && plan) {
          await this.prisma.subscription.update({
            where: { teamId },
            data: {
              plan: plan as PlanType,
              stripeSubscriptionId: (session.subscription as string) ?? null,
              status: "active",
              currentPeriodStart: new Date(),
              currentPeriodEnd: new Date(
                Date.now() + 30 * 24 * 60 * 60 * 1000,
              ),
            },
          });
        }
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = (invoice as { subscription?: string }).subscription;
        if (subId) {
          await this.prisma.subscription.updateMany({
            where: { stripeSubscriptionId: subId },
            data: { status: "past_due" },
          });
        }
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await this.prisma.subscription.updateMany({
          where: { stripeSubscriptionId: subscription.id },
          data: { status: "canceled", plan: "free" },
        });
        break;
      }
    }
    return { received: true };
  }

  private getPriceId(plan: PlanType): string | null {
    const map: Record<PlanType, string | undefined> = {
      free: undefined,
      pro: process.env.STRIPE_PRO_PRICE_ID,
      enterprise: process.env.STRIPE_ENTERPRISE_PRICE_ID,
    };
    return map[plan] || null;
  }
}
