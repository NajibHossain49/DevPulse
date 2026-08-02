"use client";

import { useState } from "react";
import { apiPostData } from "@/lib/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Target, AlertTriangle, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface Prediction {
  probability: number;
  status: "on_track" | "at_risk" | "off_track";
  riskFactors: string[];
  recommendations: string[];
}

export function SprintPredictor({ projectId }: { projectId: string }) {
  const [targetPRs, setTargetPRs] = useState("10");
  const [sprintEnd, setSprintEnd] = useState("");
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [loading, setLoading] = useState(false);

  async function predict() {
    if (!sprintEnd) {
      toast.error("Please select a sprint end date");
      return;
    }
    setLoading(true);
    try {
      const result = await apiPostData<Prediction>("/ai/sprint-predict", {
        projectId,
        sprintEndDate: new Date(sprintEnd).toISOString(),
        targetPRs: parseInt(targetPRs, 10) || 1,
      });
      setPrediction(result);
    } catch {
      toast.error("Failed to generate prediction");
    } finally {
      setLoading(false);
    }
  }

  const statusColor = (status: string) =>
    status === "on_track"
      ? "bg-green-500"
      : status === "at_risk"
        ? "bg-yellow-500"
        : "bg-red-500";

  const statusIcon = (status: string) =>
    status === "on_track" ? (
      <CheckCircle className="h-5 w-5 text-green-500" />
    ) : (
      <AlertTriangle
        className={`h-5 w-5 ${status === "at_risk" ? "text-yellow-500" : "text-red-500"}`}
      />
    );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Target className="h-5 w-5" />
          Sprint Predictor
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="target-prs">Target PRs</Label>
            <Input
              id="target-prs"
              type="number"
              min={1}
              value={targetPRs}
              onChange={(e) => setTargetPRs(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sprint-end">Sprint End Date</Label>
            <Input
              id="sprint-end"
              type="date"
              value={sprintEnd}
              onChange={(e) => setSprintEnd(e.target.value)}
            />
          </div>
        </div>
        <Button onClick={predict} disabled={loading} className="w-full">
          {loading ? "Analyzing..." : "Predict Sprint Outcome"}
        </Button>

        {prediction && (
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {statusIcon(prediction.status)}
                <span className="font-semibold capitalize">
                  {prediction.status.replace("_", " ")}
                </span>
              </div>
              <Badge className={`${statusColor(prediction.status)} text-white`}>
                {prediction.probability}% probability
              </Badge>
            </div>

            {prediction.riskFactors.length > 0 && (
              <div>
                <p className="mb-1 text-sm font-medium">Risk Factors:</p>
                {prediction.riskFactors.map((factor, i) => (
                  <p key={i} className="text-sm text-muted-foreground">
                    • {factor}
                  </p>
                ))}
              </div>
            )}

            {prediction.recommendations.length > 0 && (
              <div>
                <p className="mb-1 text-sm font-medium">Recommendations:</p>
                {prediction.recommendations.map((rec, i) => (
                  <p key={i} className="text-sm text-green-600">
                    → {rec}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
