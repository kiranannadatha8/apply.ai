import { Card } from "@/components/ui/card";
import { Loader2, UploadCloud, AlertCircle } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils"; // Assumes you have a cn utility

const UploadStep = ({
  analyzing,
  onFileSelected,
  error,
}: {
  analyzing: boolean;
  onFileSelected: (file: File) => void;
  error?: string | null;
}) => {
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    onFileSelected(file);
  };

  // --- Drag and Drop Handlers ---

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingOver(false);

    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    onFileSelected(file);
  };

  return (
    <Card
      className={cn(
        "flex flex-col items-center justify-center gap-6 border-dashed border-border/80 p-10 text-center transition-colors",
        isDraggingOver && "border-primary bg-primary/10", // Highlight on drag over
        error && !analyzing && "border-destructive bg-destructive/5", // Error state
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {analyzing ? (
        // --- Analyzing State ---
        <>
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Analyzing your resume...</h2>
            <p className="text-sm text-muted-foreground">
              This will just take a moment.
            </p>
          </div>
        </>
      ) : (
        // --- Default & Error State ---
        <>
          <UploadCloud
            className={cn(
              "h-12 w-12 text-muted-foreground",
              error && "text-destructive",
            )}
          />
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">
              Drag & drop your resume here
            </h2>
            <p className="text-sm text-muted-foreground">
              Supports: PDF, DOC, DOCX, TXT, MD, RTF
            </p>
          </div>
          <label className="inline-flex cursor-pointer items-center gap-3 rounded-md border border-border px-4 py-2 text-sm font-medium shadow-sm transition hover:border-primary">
            <input
              type="file"
              accept=".pdf,.doc,.docx,.txt,.md,.rtf"
              className="hidden"
              onChange={handleFileChange}
              disabled={analyzing}
            />
            or select a file
          </label>

          {/* --- Error Message --- */}
          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              <p>{error}</p>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Your resume stays private. We use it to tailor recommendations and
            you can update it anytime.
          </p>
        </>
      )}
    </Card>
  );
};

export default UploadStep;
