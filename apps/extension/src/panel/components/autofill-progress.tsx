import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

const STEPS = [
  { id: "fields", label: "Detecting form fields" },
  { id: "fill", label: "Autofilling" },
  { id: "review", label: "Reviewing results" },
];

export type AutofillStatus = "idle" | "pending" | "completed" | "error";

export interface AutofillProgressProps {
  status: AutofillStatus;
  onCancel?: () => void;
}

export function AutofillProgress({ status, onCancel }: AutofillProgressProps) {
  if (status === "idle") return null;

  const activeIndex =
    status === "pending" ? 1 : status === "completed" ? STEPS.length : 2;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-semibold text-foreground">
          Autofill Progress
        </CardTitle>
        {status === "pending" ? (
          <Button size="icon-sm" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center gap-3 text-sm">
              <StatusIcon index={index} activeIndex={activeIndex} status={status} />
              <span
                className={[
                  index < activeIndex
                    ? "text-foreground"
                    : "text-muted-foreground",
                ].join(" ")}
              >
                {step.label}
              </span>
            </div>
          ))}
        </div>
        <Progress
          value={
            status === "completed"
              ? 100
              : status === "pending"
                ? 60
                : status === "error"
                  ? 40
                  : 0
          }
        />
        {status === "error" ? (
          <p className="text-xs text-destructive">
            Autofill couldn't complete every field. Hold Option to map the missing inputs.
          </p>
        ) : status === "completed" ? (
          <p className="text-xs text-emerald-600">
            All detected fields filled. Review and submit when ready.
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            ApplyAI highlights the fields it's working on. Switch to manual assist if something looks off.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function StatusIcon({
  index,
  activeIndex,
  status,
}: {
  index: number;
  activeIndex: number;
  status: AutofillStatus;
}) {
  if (status === "error" && index === activeIndex) {
    return <XCircle className="h-4 w-4 text-destructive" />;
  }
  if (index < activeIndex) {
    return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
  }
  if (index === activeIndex) {
    return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
  }
  return <div className="h-2 w-2 rounded-full bg-muted-foreground/50" />;
}
