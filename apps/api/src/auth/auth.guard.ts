import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException("Missing session token");
    }

    const session = await this.prisma.session.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!session) {
      throw new UnauthorizedException("Invalid session");
    }

    if (session.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException("Session expired");
    }

    request.user = session.user;
    return true;
  }

  private extractToken(request: any): string | null {
    const cookieHeader: string | undefined = request.headers?.cookie;
    if (!cookieHeader) return null;

    const cookies = parseCookies(cookieHeader);
    // Prefer the plain `session` cookie; fall back to Better Auth cookie names.
    const raw =
      cookies["session"] ||
      cookies["better-auth.session_token"] ||
      cookies["__Secure-better-auth.session_token"];

    if (!raw) return null;

    // Better Auth cookies are signed as `<token>.<signature>`; keep only the token.
    return decodeURIComponent(raw).split(".")[0];
  }
}

function parseCookies(header: string): Record<string, string> {
  return header.split(";").reduce<Record<string, string>>((acc, part) => {
    const index = part.indexOf("=");
    if (index > -1) {
      const key = part.slice(0, index).trim();
      const value = part.slice(index + 1).trim();
      if (key) acc[key] = value;
    }
    return acc;
  }, {});
}
