import type { Steps } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export default function Stepper({
  currentIndex,
  steps,
}: {
  currentIndex: number;
  steps: Steps[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      {steps.map((step, index) => {
        const active = index === currentIndex;
        const completed = index < currentIndex;
        return (
          <div key={step.key} className="flex items-center gap-2 text-sm">
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full border",
                completed && "border-primary text-primary",
                active && !completed && "border-brand-500 text-brand-500",
                !active && !completed && "border-border text-muted-foreground",
              )}
            >
              {completed ? <Check className="h-4 w-4" /> : index + 1}
            </div>
            <span
              className={cn(
                "font-medium",
                active ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {step.label}
            </span>
            {index < steps.length - 1 ? (
              <div className="h-px w-8 bg-border" aria-hidden="true" />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
