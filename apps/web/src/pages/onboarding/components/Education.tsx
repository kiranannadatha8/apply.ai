import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";
import type { EducationItem } from "../types";
import { Field, FieldGroup, FieldLabel, FieldSet } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

const degree = [
  "Associate",
  "Bachelors",
  "Masters",
  "PhD",
  "High School",
  "Other",
];

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

// Helper to generate a list of years
const currentYear = new Date().getFullYear();
// Generate years from current year down to 70 years ago
const years = Array.from({ length: 70 }, (_, i) => String(currentYear - i));

const EducationStep = ({
  educations,
  onAdd,
  onRemove,
  onUpdate,
}: {
  educations: EducationItem[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, field: keyof EducationItem, value: string) => void;
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">Education</h2>
        <Button variant="outline" size="sm" onClick={onAdd}>
          <Plus className="h-4 w-4" /> Add education
        </Button>
      </div>

      {educations.length === 0 ? (
        <Card className="p-6 text-sm text-muted-foreground">
          No education detected yet. Add your most recent degree to continue.
        </Card>
      ) : null}

      <div className="space-y-4">
        {educations.map((education, index) => (
          <Card key={index} className="p-6">
            <form onSubmit={(e) => e.preventDefault()}>
              <FieldGroup>
                <FieldSet>
                  <FieldGroup>
                    <div className="flex items-start justify-between">
                      <div className="grid w-full gap-4 md:grid-cols-2">
                        {/* --- Institution --- */}
                        <Field>
                          <FieldLabel htmlFor={`institution-${index}`}>
                            Institution *
                          </FieldLabel>
                          <Input
                            id={`institution-${index}`}
                            placeholder="e.g., Harvard University"
                            value={education.institution.value ?? ""}
                            onChange={(event) =>
                              onUpdate(index, "institution", event.target.value)
                            }
                          />
                        </Field>

                        {/* --- Degree --- */}
                        <Field>
                          <FieldLabel htmlFor={`degree-${index}`}>
                            Degree *
                          </FieldLabel>
                          <Select
                            value={education.degree.value ?? ""}
                            onValueChange={(value) =>
                              onUpdate(index, "degree", value)
                            }
                          >
                            <SelectTrigger id={`degree-${index}`}>
                              <SelectValue placeholder="e.g., Masters" />
                            </SelectTrigger>
                            <SelectContent>
                              {degree.map((degree) => (
                                <SelectItem key={degree} value={degree}>
                                  {degree}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </Field>

                        {/* --- Field of Study --- */}
                        <Field>
                          <FieldLabel htmlFor={`major-${index}`}>
                            Field of study *
                          </FieldLabel>
                          <Input
                            id={`major-${index}`}
                            placeholder="e.g., Computer Science"
                            value={education.major.value ?? ""}
                            onChange={(event) =>
                              onUpdate(index, "major", event.target.value)
                            }
                          />
                        </Field>

                        {/* --- GPA --- */}
                        <Field>
                          <FieldLabel htmlFor={`gpa-${index}`}>GPA</FieldLabel>
                          <Input
                            id={`gpa-${index}`}
                            placeholder="e.g., 3.8"
                            value={education.gpa.value ?? ""}
                            onChange={(event) =>
                              onUpdate(index, "gpa", event.target.value)
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
                              value={education.dates.startMonth ?? ""}
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
                              value={education.dates.startYear ?? ""}
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
                              disabled={education.dates.isCurrent}
                              value={education.dates.endMonth ?? ""}
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
                              disabled={education.dates.isCurrent}
                              value={education.dates.endYear ?? ""}
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

                        {/* --- "I currently study here" Checkbox --- */}
                        <div className="flex items-center space-x-2 pt-2 md:col-span-2">
                          <Checkbox
                            id={`isPresent-${index}`}
                            checked={education.dates.isCurrent}
                            onCheckedChange={(checked) =>
                              onUpdate(
                                index,
                                "dates",
                                !!checked ? "current" : "",
                              )
                            }
                          />
                          <Label
                            htmlFor={`isPresent-${index}`}
                            className="text-sm font-normal text-muted-foreground"
                          >
                            I currently study here
                          </Label>
                        </div>
                      </div>

                      {/* --- Delete Button --- */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="ml-3 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => onRemove(index)}
                        aria-label="Remove education"
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

export default EducationStep;
