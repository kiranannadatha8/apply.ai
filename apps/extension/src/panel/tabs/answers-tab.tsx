import { useState } from "react";
import { Sparkles, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

export interface AnswersTabProps {
  suggestions: Array<{ id: string; label: string; prompt: string }>;
  onGenerate: (prompt: string) => Promise<string>;
  onInsert: (response: string) => void;
  loading: boolean;
}

export function AnswersTab({
  suggestions,
  onGenerate,
  onInsert,
  loading,
}: AnswersTabProps) {
  const [draft, setDraft] = useState("");
  const [response, setResponse] = useState("");
  const [busy, setBusy] = useState(false);

  const handleGenerate = async (prompt: string) => {
    setBusy(true);
    try {
      const res = await onGenerate(prompt);
      setResponse(res);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold text-foreground">
            Templates
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {suggestions.map((template) => (
            <button
              key={template.id}
              type="button"
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-left shadow-sm transition hover:border-primary hover:text-foreground"
              onClick={() => {
                setDraft(template.prompt);
                setResponse("");
              }}
            >
              <Badge variant="outline" className="mb-1">
                {template.label}
              </Badge>
              <p className="text-xs text-muted-foreground">
                {template.prompt.slice(0, 80)}…
              </p>
            </button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Compose</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Describe the answer you'd like AI to craft…"
          />
          <div className="flex items-center gap-2">
            <Button
              onClick={() => handleGenerate(draft)}
              disabled={!draft || busy || loading}
            >
              <Sparkles className="h-4 w-4" />
              Generate Answer
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setResponse("");
                setDraft("");
              }}
            >
              Clear
            </Button>
          </div>
          {response ? (
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-foreground">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase text-muted-foreground">
                  AI Output
                </span>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => navigator.clipboard.writeText(response).catch(() => {})}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
                {response}
              </p>
              <div className="mt-3 flex justify-end">
                <Button
                  size="sm"
                  onClick={() => onInsert(response)}
                  disabled={loading}
                >
                  Insert into field
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
