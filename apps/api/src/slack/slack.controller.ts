import { Body, Controller, Post } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { SlackService } from "./slack.service";

@ApiTags("slack")
@Controller("slack")
export class SlackController {
  constructor(private readonly slackService: SlackService) {}

  @Post("events")
  @ApiOperation({ summary: "Slack Events API endpoint (URL verification)" })
  handleEvents(@Body() body: { challenge?: string }) {
    // Slack Bolt handles command/event dispatch on its own receiver; this
    // endpoint only answers the initial URL verification handshake.
    return { challenge: body?.challenge };
  }
}
