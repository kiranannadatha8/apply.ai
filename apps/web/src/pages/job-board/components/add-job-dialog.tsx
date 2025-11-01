import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Field, FieldContent, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import type {
  EmploymentType,
  JobActivity,
  JobOpportunity,
  JobStage,
  WorkStyle,
} from "../types";

const schema = z.object({
  title: z.string().min(2, "Enter a job title"),
  company: z.string().min(2, "Enter the company"),
  status: z.enum(["saved", "applied", "interviewing", "rejected", "offer"]),
  location: z.string().min(2, "Enter a location"),
  workStyle: z.enum(["Remote", "Hybrid", "Onsite"]),
  employmentType: z.enum(["Full Time", "Part Time", "Contract"]),
  salaryMin: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : undefined))
    .pipe(z.number().optional()),
  salaryMax: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : undefined))
    .pipe(z.number().optional()),
});

export type AddJobFormValues = z.infer<typeof schema>;

interface AddJobDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (
    payload: Omit<JobOpportunity, "id" | "createdAt" | "updatedAt" | "color">
  ) => void;
}

export function AddJobDialog({ open, onOpenChange, onSubmit }: AddJobDialogProps) {
  const form = useForm<AddJobFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      status: "saved",
      workStyle: "Remote",
      employmentType: "Full Time",
    },
  });

  const submit = (values: AddJobFormValues) => {
    const activities: JobActivity[] = [
      {
        label: "Created",
        value: new Date().toISOString(),
        type: "other",
      },
    ];

    const tags: string[] = [];
    if (values.workStyle === "Remote") tags.push("Remote");
    if (values.employmentType === "Full Time") tags.push("Full Time");

    const payload: Omit<JobOpportunity, "id" | "createdAt" | "updatedAt" | "color"> = {
      title: values.title,
      company: values.company,
      status: values.status as JobStage,
      location: values.location,
      workStyle: values.workStyle as WorkStyle,
      employmentType: values.employmentType as EmploymentType,
      activities,
      tags,
      appliedAt: undefined,
      followUpAt: undefined,
      compensation:
        values.salaryMin && values.salaryMax
          ? {
              currency: "USD",
              min: values.salaryMin,
              max: values.salaryMax,
              cadence: "year",
            }
          : undefined,
      description: undefined,
      notes: undefined,
    };

    onSubmit(payload);
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-6">
        <DialogHeader className="gap-1.5">
          <DialogTitle>Add job</DialogTitle>
          <DialogDescription>
            Capture a new opportunity and track it on your board.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-5" onSubmit={form.handleSubmit(submit)}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="title">Job title</FieldLabel>
              <FieldContent>
                <Input id="title" placeholder="Principal Designer" {...form.register("title")} />
                {form.formState.errors.title && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.title.message}
                  </p>
                )}
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel htmlFor="company">Company</FieldLabel>
              <FieldContent>
                <Input id="company" placeholder="Company" {...form.register("company")} />
                {form.formState.errors.company && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.company.message}
                  </p>
                )}
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel htmlFor="location">Location</FieldLabel>
              <FieldContent>
                <Input id="location" placeholder="Remote" {...form.register("location")} />
                {form.formState.errors.location && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.location.message}
                  </p>
                )}
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel htmlFor="status">Status</FieldLabel>
              <FieldContent>
                <select
                  id="status"
                  {...form.register("status")}
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  <option value="saved">Saved</option>
                  <option value="applied">Applied</option>
                  <option value="interviewing">Interviewing</option>
                  <option value="offer">Offered</option>
                  <option value="rejected">Rejected</option>
                </select>
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel htmlFor="workStyle">Work style</FieldLabel>
              <FieldContent>
                <select
                  id="workStyle"
                  {...form.register("workStyle")}
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  <option value="Remote">Remote</option>
                  <option value="Hybrid">Hybrid</option>
                  <option value="Onsite">Onsite</option>
                </select>
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel htmlFor="employmentType">Employment type</FieldLabel>
              <FieldContent>
                <select
                  id="employmentType"
                  {...form.register("employmentType")}
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  <option value="Full Time">Full Time</option>
                  <option value="Part Time">Part Time</option>
                  <option value="Contract">Contract</option>
                </select>
              </FieldContent>
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="salaryMin">Salary min</FieldLabel>
              <FieldContent>
                <Input
                  id="salaryMin"
                  type="number"
                  placeholder="200000"
                  {...form.register("salaryMin")}
                />
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel htmlFor="salaryMax">Salary max</FieldLabel>
              <FieldContent>
                <Input
                  id="salaryMax"
                  type="number"
                  placeholder="300000"
                  {...form.register("salaryMax")}
                />
              </FieldContent>
            </Field>
          </div>

          <DialogFooter>
            <Button variant="ghost" type="button" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Add job</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
