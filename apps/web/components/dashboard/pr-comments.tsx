"use client";

import { useEffect, useState, useCallback } from "react";
import { apiGetData, apiPostData } from "@/lib/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { MessageSquare, Send, Reply } from "lucide-react";

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
  replies?: Comment[];
}

function initial(user: Comment["user"]): string {
  return (user.name?.[0] || user.email[0] || "?").toUpperCase();
}

export default function PRComments({ prId }: { prId: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchComments = useCallback(async () => {
    try {
      const data = await apiGetData<Comment[]>(`/comments?prId=${prId}`);
      setComments(data);
    } catch {
      toast.error("Failed to load comments");
    }
  }, [prId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  async function submitComment() {
    if (!newComment.trim()) return;
    setLoading(true);
    try {
      await apiPostData("/comments", {
        prId,
        content: newComment,
        parentId: replyTo ?? undefined,
      });
      setNewComment("");
      setReplyTo(null);
      await fetchComments();
      toast.success("Comment added");
    } catch {
      toast.error("Failed to add comment");
    } finally {
      setLoading(false);
    }
  }

  const count = comments.reduce(
    (sum, c) => sum + 1 + (c.replies?.length ?? 0),
    0,
  );

  return (
    <div className="space-y-4">
      <h3 className="flex items-center gap-2 font-semibold">
        <MessageSquare className="h-4 w-4" />
        Comments ({count})
      </h3>

      <ScrollArea className="h-[240px] pr-2">
        <div className="space-y-4">
          {comments.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No comments yet. Start the discussion.
            </p>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="space-y-2">
                <div className="flex gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={comment.user.image || undefined} />
                    <AvatarFallback>{initial(comment.user)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {comment.user.name || comment.user.email}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(comment.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="mt-1 text-sm">{comment.content}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => setReplyTo(comment.id)}
                    >
                      <Reply className="mr-1 h-3 w-3" /> Reply
                    </Button>
                  </div>
                </div>

                {comment.replies?.map((reply) => (
                  <div key={reply.id} className="ml-8 flex gap-3">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={reply.user.image || undefined} />
                      <AvatarFallback>{initial(reply.user)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {reply.user.name || reply.user.email}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(reply.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="mt-1 text-sm">{reply.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      <div className="space-y-2">
        {replyTo && (
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Replying to comment</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6"
              onClick={() => setReplyTo(null)}
            >
              Cancel
            </Button>
          </div>
        )}
        <Textarea
          placeholder="Add a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          className="min-h-[80px]"
        />
        <Button
          onClick={submitComment}
          disabled={loading}
          className="w-full"
        >
          <Send className="mr-2 h-4 w-4" />
          {loading ? "Posting..." : "Post Comment"}
        </Button>
      </div>
    </div>
  );
}
