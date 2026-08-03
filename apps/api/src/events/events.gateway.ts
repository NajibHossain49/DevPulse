import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { getCorsOrigins } from "../common/web-url";

@WebSocketGateway({
  cors: {
    origin: getCorsOrigins(),
    credentials: true,
  },
  namespace: "/events",
})
export class EventsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(EventsGateway.name);

  constructor(private readonly prisma: PrismaService) {}

  async handleConnection(client: Socket) {
    const token = this.extractToken(client);
    if (!token) {
      client.disconnect();
      return;
    }

    const session = await this.prisma.session.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      client.disconnect();
      return;
    }

    client.data.userId = session.userId;
    // Personal room so services can target a specific user.
    client.join(`user:${session.userId}`);
    this.logger.log(
      `Client connected: ${client.id} (user: ${session.userId})`,
    );
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage("join_team")
  async handleJoinTeam(client: Socket, teamId: string) {
    const userId = client.data.userId as string | undefined;
    if (!userId) return;

    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
    });
    const member = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
    });
    if (!member && team?.ownerId !== userId) {
      client.emit("error", { message: "Not a team member" });
      return;
    }
    client.join(`team:${teamId}`);
    client.emit("joined", { teamId });
  }

  @SubscribeMessage("join_project")
  async handleJoinProject(client: Socket, projectId: string) {
    const userId = client.data.userId as string | undefined;
    if (!userId) return;

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { team: { include: { members: true } } },
    });
    const hasAccess =
      project?.team.ownerId === userId ||
      project?.team.members.some((m) => m.userId === userId);
    if (!hasAccess) {
      client.emit("error", { message: "Not a project member" });
      return;
    }
    client.join(`project:${projectId}`);
    client.emit("joined", { projectId });
  }

  @SubscribeMessage("leave")
  handleLeave(client: Socket, room: string) {
    client.leave(room);
  }

  // Public methods for other services to emit events.
  emitToTeam(teamId: string, event: string, data: unknown) {
    this.server.to(`team:${teamId}`).emit(event, data);
  }

  emitToProject(projectId: string, event: string, data: unknown) {
    this.server.to(`project:${projectId}`).emit(event, data);
  }

  emitToUser(userId: string, event: string, data: unknown) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  private extractToken(client: Socket): string | null {
    // 1. Explicit token passed via socket auth (if the client could read it).
    const authToken = client.handshake.auth?.token as string | undefined;
    if (authToken) return authToken.split(".")[0];

    // 2. Fall back to the session cookie (Better Auth cookies are httpOnly,
    // but the browser still sends them on the socket handshake).
    const cookieHeader = client.handshake.headers?.cookie;
    if (!cookieHeader) return null;

    const cookies = parseCookies(cookieHeader);
    const raw =
      cookies["session"] ||
      cookies["better-auth.session_token"] ||
      cookies["__Secure-better-auth.session_token"];
    if (!raw) return null;

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
