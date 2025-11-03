import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2 } from "lucide-react";
import type { ProjectItem } from "../types"; // <-- Assumed type update
import { Field, FieldGroup, FieldLabel, FieldSet } from "@/components/ui/field";

// --- Type Assumptions ---
// This code assumes your `ProjectItem` type now looks something like this:
/*
type LinkItem = {
  id: string; // or number
  title: { value: string };
  url: { value: string };
};

type ProjectItem = {
  id: string; // or number
  title: { value: string };
  description: { value: string }; // Renamed from 'bullets'
  technologies: { value: string }; // New field
  links: { value: LinkItem[] }; // Changed from string to LinkItem[]
};
*/
//
// And that your props are updated to handle the new links structure:
/*
  onUpdate: (
    index: number,
    field: "title" | "description" | "technologies",
    value: string,
  ) => void;
  onAddLink: (projectIndex: number) => void;
  onRemoveLink: (projectIndex: number, linkIndex: number) => void;
  onUpdateLink: (
    projectIndex: number,
    linkIndex: number,
    field: "title" | "url",
    value: string,
  ) => void;
*/
// --- End Type Assumptions ---

const ProjectsStep = ({
  projects,
  onAdd,
  onRemove,
  onUpdate,
  onAddLink,
  onRemoveLink,
  onUpdateLink,
}: {
  projects: ProjectItem[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  onUpdate: (
    index: number,
    field: "title" | "description" | "technologies",
    value: string,
  ) => void;
  onAddLink: (projectIndex: number) => void;
  onRemoveLink: (projectIndex: number, linkIndex: number) => void;
  onUpdateLink: (
    projectIndex: number,
    linkIndex: number,
    field: "title" | "url",
    value: string,
  ) => void;
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">Projects</h2>
        <Button variant="outline" size="sm" onClick={onAdd}>
          <Plus className="h-4 w-4" /> Add project
        </Button>
      </div>

      {projects.length === 0 ? (
        <Card className="p-6 text-sm text-muted-foreground">
          Highlight notable projects to showcase your skills and impact.
        </Card>
      ) : null}

      <div className="space-y-4">
        {projects.map((project, projectIndex) => (
          <Card key={projectIndex} className="p-6">
            <form onSubmit={(e) => e.preventDefault()}>
              <FieldGroup>
                <FieldSet>
                  <FieldGroup>
                    <div className="flex items-start justify-between">
                      <div className="grid w-full gap-4 md:grid-cols-2">
                        {/* --- Project Name --- */}
                        <Field>
                          <FieldLabel htmlFor={`project-title-${projectIndex}`}>
                            Project name *
                          </FieldLabel>
                          <Input
                            id={`project-title-${projectIndex}`}
                            placeholder="e.g., AI Job Tracker"
                            value={project.title.value ?? ""}
                            onChange={(event) =>
                              onUpdate(
                                projectIndex,
                                "title",
                                event.target.value,
                              )
                            }
                          />
                        </Field>

                        {/* --- Technologies Used --- */}
                        <Field>
                          <FieldLabel htmlFor={`project-tech-${projectIndex}`}>
                            Technologies Used
                          </FieldLabel>
                          <Input
                            id={`project-tech-${projectIndex}`}
                            placeholder="e.g., React, Node.js, Tailwind CSS"
                            value={""}
                            onChange={(event) =>
                              onUpdate(
                                projectIndex,
                                "technologies",
                                event.target.value,
                              )
                            }
                          />
                        </Field>

                        {/* --- Project Description --- */}
                        <Field className="md:col-span-2">
                          <FieldLabel htmlFor={`project-desc-${projectIndex}`}>
                            Description
                          </FieldLabel>
                          <Textarea
                            id={`project-desc-${projectIndex}`}
                            placeholder="Describe the project, its purpose, and your role..."
                            value={project.bullets.value ?? ""}
                            onChange={(event) =>
                              onUpdate(
                                projectIndex,
                                "description",
                                event.target.value,
                              )
                            }
                            rows={4}
                          />
                        </Field>

                        {/* --- Links List Builder --- */}
                        <Field className="space-y-3 md:col-span-2">
                          <FieldLabel>Project Links</FieldLabel>
                          <div className="space-y-3">
                            {project.links.map((link, linkIndex) => (
                              <div
                                key={linkIndex} // Use link.id if you have one
                                className="flex items-end gap-2"
                              >
                                <Field className="flex-1">
                                  <FieldLabel
                                    htmlFor={`link-title-${projectIndex}-${linkIndex}`}
                                    className="text-xs"
                                  >
                                    Title
                                  </FieldLabel>
                                  <Input
                                    id={`link-title-${projectIndex}-${linkIndex}`}
                                    placeholder="e.g., GitHub Repo"
                                    value={link.title.value ?? ""}
                                    onChange={(e) =>
                                      onUpdateLink(
                                        projectIndex,
                                        linkIndex,
                                        "title",
                                        e.target.value,
                                      )
                                    }
                                  />
                                </Field>
                                <Field className="flex-1">
                                  <FieldLabel
                                    htmlFor={`link-url-${projectIndex}-${linkIndex}`}
                                    className="text-xs"
                                  >
                                    URL
                                  </FieldLabel>
                                  <Input
                                    id={`link-url-${projectIndex}-${linkIndex}`}
                                    placeholder="https://..."
                                    value={link.url.value ?? ""}
                                    onChange={(e) =>
                                      onUpdateLink(
                                        projectIndex,
                                        linkIndex,
                                        "url",
                                        e.target.value,
                                      )
                                    }
                                  />
                                </Field>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="shrink-0 text-muted-foreground hover:text-destructive"
                                  onClick={() =>
                                    onRemoveLink(projectIndex, linkIndex)
                                  }
                                  aria-label="Remove link"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="max-w-1/8"
                            onClick={() => onAddLink(projectIndex)}
                          >
                            <Plus className="h-4 w-4" />
                            Add link
                          </Button>
                        </Field>
                      </div>

                      {/* --- Delete Project Button --- */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="ml-3 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => onRemove(projectIndex)}
                        aria-label="Remove project"
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

export default ProjectsStep;
