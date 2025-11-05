import { Button } from "@/components/ui/button";

export interface PanelFooterProps {
  analysesLeft?: number | null;
  autofillsLeft?: number | null;
  onUpgrade: () => void;
}

export function PanelFooter({
  analysesLeft,
  autofillsLeft,
  onUpgrade,
}: PanelFooterProps) {
  return (
    <footer className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground">
      <div className="flex flex-col gap-1">
        <span className="font-medium text-foreground">
          Analyses: {formatQuota(analysesLeft)}
        </span>
        <span className="text-muted-foreground">
          Autofills: {formatQuota(autofillsLeft)}
        </span>
      </div>
      <Button variant="outline" size="sm" onClick={onUpgrade}>
        Upgrade
      </Button>
    </footer>
  );
}

function formatQuota(value?: number | null) {
  if (value === null) return "∞";
  if (typeof value === "number") return value >= 0 ? value : 0;
  return "–";
}
