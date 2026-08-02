import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/auth.decorator";
import { CommentsService } from "./comments.service";
import { CreateCommentDto } from "./dto/create-comment.dto";

@ApiTags("comments")
@ApiBearerAuth()
@Controller("comments")
@UseGuards(AuthGuard)
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  @ApiOperation({ summary: "Add a comment to a PR" })
  @ApiResponse({ status: 201, description: "Comment created" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async createComment(
    @CurrentUser("id") userId: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.commentsService.createComment(
      userId,
      dto.prId,
      dto.content,
      dto.parentId,
    );
  }

  @Get()
  @ApiOperation({ summary: "Get comments for a PR" })
  @ApiResponse({ status: 200, description: "Success" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async getComments(@Query("prId") prId: string) {
    return this.commentsService.getComments(prId);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a comment" })
  @ApiResponse({ status: 200, description: "Deleted" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async deleteComment(
    @CurrentUser("id") userId: string,
    @Param("id") commentId: string,
  ) {
    return this.commentsService.deleteComment(userId, commentId);
  }
}
