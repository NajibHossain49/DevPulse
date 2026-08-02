import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  image: true,
} as const;

@Injectable()
export class CommentsService {
  constructor(private readonly prisma: PrismaService) {}

  async createComment(
    userId: string,
    prId: string,
    content: string,
    parentId?: string,
  ) {
    const pr = await this.prisma.pullRequest.findUnique({ where: { id: prId } });
    if (!pr) throw new NotFoundException("PR not found");

    if (parentId) {
      const parent = await this.prisma.comment.findUnique({
        where: { id: parentId },
      });
      if (!parent || parent.prId !== prId) {
        throw new NotFoundException("Parent comment not found");
      }
    }

    return this.prisma.comment.create({
      data: { prId, userId, content, parentId: parentId ?? null },
      include: { user: { select: USER_SELECT } },
    });
  }

  async getComments(prId: string) {
    return this.prisma.comment.findMany({
      where: { prId, parentId: null },
      include: {
        user: { select: USER_SELECT },
        replies: {
          include: { user: { select: USER_SELECT } },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async deleteComment(userId: string, commentId: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });
    if (!comment) throw new NotFoundException("Comment not found");
    if (comment.userId !== userId) {
      throw new ForbiddenException("Not authorized to delete this comment");
    }

    await this.prisma.comment.delete({ where: { id: commentId } });
    return { success: true };
  }
}
