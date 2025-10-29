import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";
import type { ExperienceItem } from "../types"; // <-- Assumes this type is updated
import { Field, FieldGroup, FieldLabel, FieldSet } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// Helper to generate a list of years
const currentYear = new Date().getFullYear();
// Generate years from current year down to 70 years ago
const years = Array.from({ length: 70 }, (_, i) => String(currentYear - i));

const months = [
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

const ExperienceStep = ({
  experiences,
  onAdd,
  onRemove,
  onUpdate,
}: {
  experiences: ExperienceItem[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  // Updated `onUpdate` to accept string or boolean
  onUpdate: (
    index: number,
    field: keyof Omit<ExperienceItem, "id">, // Assuming 'id' is not updatable
    value: string | boolean,
  ) => void;
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">Experience</h2>
        <Button variant="outline" size="sm" onClick={onAdd}>
          <Plus className="h-4 w-4" /> Add role
        </Button>
      </div>

      {experiences.length === 0 ? (
        <Card className="p-6 text-sm text-muted-foreground">
          No roles detected yet. Add your most recent role to continue.
        </Card>
      ) : null}

      <div className="space-y-4">
        {experiences.map((experience, index) => (
          <Card key={index} className="p-6">
            <form onSubmit={(e) => e.preventDefault()}>
              <FieldGroup>
                <FieldSet>
                  <FieldGroup>
                    <div className="flex items-start justify-between">
                      <div className="grid w-full gap-4 md:grid-cols-2">
                        {/* --- Company --- */}
                        <Field>
                          <FieldLabel htmlFor={`company-${index}`}>
                            Company *
                          </FieldLabel>
                          <Input
                            id={`company-${index}`}
                            placeholder="e.g., Google"
                            value={experience.company.value ?? ""}
                            onChange={(event) =>
                              onUpdate(index, "company", event.target.value)
                            }
                          />
                        </Field>

                        {/* --- Title --- */}
                        <Field>
                          <FieldLabel htmlFor={`title-${index}`}>
                            Title *
                          </FieldLabel>
                          <Input
                            id={`title-${index}`}
                            placeholder="e.g., Software Engineer"
                            value={experience.title.value ?? ""}
                            onChange={(event) =>
                              onUpdate(index, "title", event.target.value)
                            }
                          />
                        </Field>

                        {/* --- Start Date (Month & Year) --- */}
                        <div className="grid grid-cols-2 gap-3">
                          <Field>
                            <FieldLabel htmlFor={`startMonth-${index}`}>
                              Start Month *
                            </FieldLabel>
                            <Select
                              value={experience.dates.startMonth ?? ""}
                              onValueChange={(value) =>
                                onUpdate(index, "dates", value)
                              }
                            >
                              <SelectTrigger id={`startMonth-${index}`}>
                                <SelectValue placeholder="Month" />
                              </SelectTrigger>
                              <SelectContent>
                                {months.map((month) => (
                                  <SelectItem
                                    key={month.value}
                                    value={month.value}
                                  >
                                    {month.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </Field>
                          <Field>
                            <FieldLabel htmlFor={`startYear-${index}`}>
                              Start Year *
                            </FieldLabel>
                            <Select
                              value={experience.dates.startYear ?? ""}
                              onValueChange={(value) =>
                                onUpdate(index, "dates", value)
                              }
                            >
                              <SelectTrigger id={`startYear-${index}`}>
                                <SelectValue placeholder="Year" />
                              </SelectTrigger>
                              <SelectContent>
                                {years.map((year) => (
                                  <SelectItem key={year} value={year}>
                                    {year}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </Field>
                        </div>

                        {/* --- End Date (Month & Year) --- */}
                        <div className="grid grid-cols-2 gap-3">
                          <Field>
                            <FieldLabel htmlFor={`endMonth-${index}`}>
                              End Month
                            </FieldLabel>
                            <Select
                              disabled={experience.dates.isCurrent}
                              value={experience.dates.endMonth ?? ""}
                              onValueChange={(value) =>
                                onUpdate(index, "dates", value)
                              }
                            >
                              <SelectTrigger id={`endMonth-${index}`}>
                                <SelectValue placeholder="Month" />
                              </SelectTrigger>
                              <SelectContent>
                                {months.map((month) => (
                                  <SelectItem
                                    key={month.value}
                                    value={month.value}
                                  >
                                    {month.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </Field>
                          <Field>
                            <FieldLabel htmlFor={`endYear-${index}`}>
                              End Year
                            </FieldLabel>
                            <Select
                              disabled={experience.dates.isCurrent}
                              value={experience.dates.endYear ?? ""}
                              onValueChange={(value) =>
                                onUpdate(index, "dates", value)
                              }
                            >
                              <SelectTrigger id={`endYear-${index}`}>
                                <SelectValue placeholder="Year" />
                              </SelectTrigger>
                              <SelectContent>
                                {years.map((year) => (
                                  <SelectItem key={year} value={year}>
                                    {year}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </Field>
                        </div>

                        {/* --- Location --- */}
                        <Field>
                          <FieldLabel htmlFor={`location-${index}`}>
                            Location
                          </FieldLabel>
                          <Input
                            id={`location-${index}`}
                            placeholder="e.g., New York, NY"
                            value={experience.location.value ?? ""}
                            onChange={(event) =>
                              onUpdate(index, "location", event.target.value)
                            }
                          />
                        </Field>

                        {/* --- "I currently work here" Checkbox --- */}
                        <div className="flex items-center space-x-2 pt-2 md:pt-8">
                          <Checkbox
                            id={`isPresent-${index}`}
                            checked={experience.dates.isCurrent}
                            onCheckedChange={(checked) =>
                              onUpdate(index, "dates", !!checked)
                            }
                          />
                          <Label
                            htmlFor={`isPresent-${index}`}
                            className="text-sm font-normal text-muted-foreground"
                          >
                            I currently work here
                          </Label>
                        </div>

                        {/* --- Description Textarea --- */}
                        <Field className="md:col-span-2">
                          <FieldLabel htmlFor={`description-${index}`}>
                            Description
                          </FieldLabel>
                          <Textarea
                            id={`description-${index}`}
                            placeholder="Describe your role and key accomplishments..."
                            value={experience.bullets.value ?? ""}
                            onChange={(event) =>
                              onUpdate(index, "bullets", event.target.value)
                            }
                            rows={6}
                          />
                        </Field>
                      </div>

                      {/* --- Delete Button --- */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="ml-3 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => onRemove(index)}
                        aria-label="Remove experience"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </FieldGroup>
                </FieldSet>
              </FieldGroup>
            </form>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ExperienceStep;
