import { Badge } from "@/components/ui/badge";

import { cn } from "@/lib/utils";

import { JOB_STAGE_CONFIG } from "../config";
import type { JobOpportunity } from "../types";
import { formatSalaryRange } from "../utils/format";
import { formatDate, formatTime } from "../utils/date";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface JobTableProps {
  jobs: JobOpportunity[];
}

export function JobTable({ jobs }: JobTableProps) {
  return (
    <Table>
      <TableHeader className="bg-muted/40">
        <TableRow>
          <TableHead>Role</TableHead>
          <TableHead>Company</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Compensation</TableHead>
          <TableHead>Next Step</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {jobs.map((job) => {
          const salary = formatSalaryRange(job.compensation);
          const stage = JOB_STAGE_CONFIG[job.status];
          return (
            <TableRow key={job.id}>
              <TableCell>
                <div className="font-medium">{job.title}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {job.workStyle} - {job.employmentType}
                </div>
              </TableCell>
              <TableCell>{job.company}</TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={cn("border-transparent capitalize", stage.accent)}
                >
                  {stage.label}
                </Badge>
              </TableCell>
              <TableCell>{salary ?? "-"}</TableCell>
              <TableCell>
                {job.followUpAt ? (
                  <div>
                    <div>{formatDate(job.followUpAt)}</div>
                    <div className="text-xs">{formatTime(job.followUpAt)}</div>
                  </div>
                ) : (
                  <span>-</span>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
