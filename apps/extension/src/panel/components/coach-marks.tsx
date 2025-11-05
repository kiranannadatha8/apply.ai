import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface CoachMarkStep {
  id: string;
  selector: string;
  title: string;
  description: string;
}

interface HighlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface CoachMarksProps {
  steps: CoachMarkStep[];
  currentStep: number;
  visible: boolean;
  panelRef: React.RefObject<HTMLElement | null>;
  onNext: () => void;
  onSkip: () => void;
}

export function CoachMarks({
  steps,
  currentStep,
  visible,
  panelRef,
  onNext,
  onSkip,
}: CoachMarksProps) {
  const step = steps[currentStep];
  const [highlightRect, setHighlightRect] = useState<HighlightRect | null>(
    null,
  );
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!visible) {
      setHighlightRect(null);
      return;
    }

    const container = panelRef.current;
    if (!container) {
      setHighlightRect(null);
      return;
    }

    const current = steps[currentStep];
    if (!current) {
      setHighlightRect(null);
      return;
    }

    let disposed = false;
    let retryHandle: number | null = null;

    const target = container.querySelector<HTMLElement>(current.selector);
    if (!target) {
      retryHandle = window.setTimeout(() => {
        if (!disposed) {
          setRefreshKey((key) => key + 1);
        }
      }, 250);
      setHighlightRect(null);
      return () => {
        disposed = true;
        if (retryHandle) window.clearTimeout(retryHandle);
      };
    }

    target.classList.add("applyai-coachmark-highlight");

    const updateRect = () => {
      if (disposed) return;
      const containerRect = container.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      setHighlightRect({
        top: targetRect.top - containerRect.top,
        left: targetRect.left - containerRect.left,
        width: targetRect.width,
        height: targetRect.height,
      });
    };

    updateRect();

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(updateRect)
        : null;
    resizeObserver?.observe(target);

    const mutationObserver =
      typeof MutationObserver !== "undefined"
        ? new MutationObserver(updateRect)
        : null;
    mutationObserver?.observe(target, {
      attributes: true,
      childList: true,
      subtree: true,
    });

    window.addEventListener("resize", updateRect);

    return () => {
      disposed = true;
      if (retryHandle) window.clearTimeout(retryHandle);
      target.classList.remove("applyai-coachmark-highlight");
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
      window.removeEventListener("resize", updateRect);
    };
  }, [currentStep, panelRef, steps, visible, refreshKey]);

  useEffect(() => {
    if (!visible) {
      setHighlightRect(null);
    }
  }, [visible]);

  if (!visible || !step) return null;

  const panelRect = panelRef.current?.getBoundingClientRect();
  const panelWidth = panelRect?.width ?? 0;
  const panelHeight = panelRect?.height ?? 0;

  let tooltipWidth = 260;
  if (panelWidth > 0) {
    tooltipWidth = Math.min(280, Math.max(panelWidth - 32, 220));
  }

  let tooltipLeft = highlightRect
    ? highlightRect.left
    : Math.max((panelWidth - tooltipWidth) / 2, 16);
  tooltipLeft = Math.min(
    Math.max(tooltipLeft, 16),
    Math.max(panelWidth - tooltipWidth - 16, 16),
  );

  let tooltipTop = highlightRect
    ? highlightRect.top + highlightRect.height + 16
    : Math.max(panelHeight / 2 - 80, 16);
  if (panelHeight > 0 && tooltipTop + 160 > panelHeight) {
    tooltipTop = Math.max(
      (highlightRect ? highlightRect.top : panelHeight / 2) - 176,
      16,
    );
  }

  const isLastStep = currentStep >= steps.length - 1;

  return (
    <div className="pointer-events-none absolute inset-0 z-[2147483645]">
      <div className="pointer-events-auto absolute inset-0 rounded-lg bg-slate-950/45 backdrop-blur-sm" />
      {highlightRect ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute rounded-xl ring-2 ring-primary/70 shadow-[0_0_0_9999px_rgba(15,23,42,0.45)] transition-all duration-150 ease-out"
          style={{
            top: Math.max(highlightRect.top - 12, 8),
            left: Math.max(highlightRect.left - 12, 8),
            width: highlightRect.width + 24,
            height: highlightRect.height + 24,
          }}
        />
      ) : null}
      <div
        className="pointer-events-auto absolute rounded-xl bg-background p-4 shadow-xl ring-1 ring-border"
        style={{
          top: tooltipTop,
          left: tooltipLeft,
          width: tooltipWidth,
        }}
      >
        <div className="flex items-center justify-between text-xs font-medium text-primary">
          <span>{`Step ${Math.min(currentStep + 1, steps.length)} of ${steps.length}`}</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onSkip}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            Skip
          </Button>
        </div>
        <div className="mt-3 space-y-2">
          <div className="flex gap-1">
            {steps.map((item, index) => (
              <span
                key={item.id}
                className={cn(
                  "h-1.5 w-4 rounded-full bg-muted transition",
                  index === currentStep && "bg-primary",
                )}
              />
            ))}
          </div>
          <h3 className="text-base font-semibold text-foreground">
            {step.title}
          </h3>
          <p className="text-sm text-muted-foreground">{step.description}</p>
        </div>
        <div className="mt-4 flex justify-end">
          <Button size="sm" onClick={onNext}>
            {isLastStep ? "Finish" : "Next"}
          </Button>
        </div>
      </div>
    </div>
  );
}
