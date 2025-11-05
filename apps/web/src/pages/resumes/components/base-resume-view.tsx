import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import type { ResumeSection } from "@/features/resumes/types";

interface BaseResumeViewProps {
  resumeName?: string;
  sections: ResumeSection[];
}

export function BaseResumeView({ resumeName, sections }: BaseResumeViewProps) {
  return (
    <Card className="h-full border-dashed border-border/70 bg-muted/30">
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          Base: {resumeName ?? "Selected Resume"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {sections.map((section) => (
          <section key={section.id} className="space-y-2">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {section.label}
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {section.content.map((item, index) => (
                <li key={`${section.id}-base-${index}`} className="leading-relaxed">
                  {item}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </CardContent>
    </Card>
  );
}
