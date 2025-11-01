import { Badge } from "@/components/ui/badge";

import type { JobOpportunity } from "../types";
import { JobCard } from "./job-card";

export interface JobListGroup {
  key: string;
  label: string;
  helper?: string;
  jobs: JobOpportunity[];
}

interface JobListProps {
  groups: JobListGroup[];
}

export function JobList({ groups }: JobListProps) {
  if (!groups.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-border/70 p-12 text-center text-muted-foreground">
        <p className="text-base font-medium">No jobs match your filters</p>
        <p className="text-sm">Adjust filters or add a new job to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {groups.map((group) => (
        <section key={group.key} className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-semibold text-foreground">
              {group.label}
            </h2>
            <Badge variant="secondary">{group.jobs.length} roles</Badge>
            {group.helper && (
              <span className="text-sm text-muted-foreground">{group.helper}</span>
            )}
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {group.jobs.map((job) => (
              <JobCard key={job.id} job={job} draggable={false} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
