import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

interface GenerationProcessingDialogProps {
  open: boolean;
  message: string;
  subtext?: string;
}

export function GenerationProcessingDialog({
  open,
  message,
  subtext,
}: GenerationProcessingDialogProps) {
  return (
    <Dialog open={open}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "flex max-w-sm flex-col items-center gap-4 text-center",
        )}
      >
        <DialogHeader className="gap-1 text-center">
          <DialogTitle className="text-lg font-semibold">
            Generating Your Variant…
          </DialogTitle>
        </DialogHeader>
        <Spinner className="size-8 text-primary" />
        <div className="space-y-1">
          <p className="text-sm font-medium">{message}</p>
          {subtext ? (
            <p className="text-muted-foreground text-xs">{subtext}</p>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
