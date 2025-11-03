import { prisma } from "../lib/prisma";

type JobEventKind =
  | "CREATED"
  | "UPDATED"
  | "STATUS_CHANGE"
  | "AUTOFILL"
  | "APPLIED"
  | "NOTE";

interface LogJobEventArgs {
  userId: string;
  jobId: string;
  kind: JobEventKind;
  message?: string | null;
  metadata?: Record<string, unknown> | null;
}

export async function logJobEvent(args: LogJobEventArgs): Promise<void> {
  const client = prisma as any;
  await client.jobEvent.create({
    data: {
      userId: args.userId,
      jobId: args.jobId,
      kind: args.kind,
      message: args.message ?? null,
      metadata: args.metadata ?? null,
    },
  });
}

export async function logStatusChange(params: {
  userId: string;
  jobId: string;
  fromStatus: string | null;
  toStatus: string;
}): Promise<void> {
  await logJobEvent({
    userId: params.userId,
    jobId: params.jobId,
    kind: "STATUS_CHANGE",
    metadata: {
      from: params.fromStatus,
      to: params.toStatus,
    },
  });
}
