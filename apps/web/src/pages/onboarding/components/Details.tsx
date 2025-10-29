import { Field, FieldGroup, FieldLabel, FieldSet } from "@/components/ui/field";
import type { ContactInfo, LinkItem } from "../types";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";

const DetailsStep = ({
  contact,
  onUpdate,
  onAddLink,
  onRemoveLink,
  onUpdateLink,
}: {
  contact: ContactInfo;
  onUpdate: (field: keyof Omit<ContactInfo, "links">, value: string) => void;
  onAddLink: () => void;
  onRemoveLink: (index: number) => void;
  onUpdateLink: (
    index: number,
    field: keyof Omit<LinkItem, "id">,
    value: string,
  ) => void;
}) => {
  const [firstName, lastName] = (contact.name.value ?? "").split(" ");
  return (
    <Card className="space-y-3 p-6">
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">
          Personal Details
        </h2>
        <div className="space-y-4">
          <div className="w-full">
            <FieldSet>
              <FieldGroup>
                {/* --- First/Last Name --- */}
                <div className="grid grid-cols-2 gap-3">
                  <Field>
                    <FieldLabel htmlFor="firstName">First name *</FieldLabel>
                    <Input
                      id="firstName"
                      type="text"
                      placeholder="John"
                      value={firstName ?? ""}
                      onChange={(e) => onUpdate("name", e.target.value)}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="lastName">Last name *</FieldLabel>
                    <Input
                      id="lastName"
                      type="text"
                      placeholder="Doe"
                      value={lastName ?? ""}
                      onChange={(e) => onUpdate("name", e.target.value)}
                    />
                  </Field>
                </div>

                {/* --- Email --- */}
                <Field>
                  <FieldLabel htmlFor="email">Email *</FieldLabel>
                  <Input
                    id="email"
                    type="email"
                    placeholder="m@example.com"
                    value={contact.email.value ?? ""}
                    onChange={(e) => onUpdate("email", e.target.value)}
                  />
                </Field>

                {/* --- Phone --- */}
                <Field>
                  <FieldLabel htmlFor="phone">Phone</FieldLabel>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+1 (555) 555-5555"
                    value={contact.phone.value ?? ""}
                    onChange={(e) => onUpdate("phone", e.target.value)}
                  />
                </Field>

                {/* --- Address --- */}
                <Field>
                  <FieldLabel htmlFor="address">Address</FieldLabel>
                  <Input
                    id="address"
                    type="text"
                    placeholder="123 Main St"
                    value={contact.location.street.value ?? ""}
                    onChange={(e) => onUpdate("location", e.target.value)}
                  />
                </Field>

                {/* --- City/State/Zip --- */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
                  <Field className="md:col-span-3">
                    <FieldLabel htmlFor="City">City</FieldLabel>
                    <Input
                      id="City"
                      type="text"
                      placeholder="New York"
                      value={contact.location.city.value ?? ""}
                      onChange={(e) => onUpdate("location", e.target.value)}
                    />
                  </Field>
                  <Field className="md:col-span-1">
                    <FieldLabel htmlFor="State">State</FieldLabel>
                    <Input
                      id="State"
                      type="text"
                      placeholder="NY"
                      maxLength={2}
                      value={contact.location.state.value ?? ""}
                      onChange={(e) => onUpdate("location", e.target.value)}
                    />
                  </Field>
                  <Field className="md:col-span-2">
                    <FieldLabel htmlFor="Zip">Zip</FieldLabel>
                    <Input
                      id="Zip"
                      type="text"
                      placeholder="10001"
                      maxLength={5}
                      value={contact.location.zip.value ?? ""}
                      onChange={(e) => onUpdate("location", e.target.value)}
                    />
                  </Field>
                </div>

                {/* --- Links --- */}
                <Field className="space-y-3">
                  <FieldLabel>Links</FieldLabel>
                  <div className="space-y-3">
                    {contact.links.map((link, index) => (
                      <div
                        key={index} // Use link.id if you have a stable ID
                        className="flex items-end gap-2"
                      >
                        <Field className="flex-1">
                          <FieldLabel
                            htmlFor={`link-title-${index}`}
                            className="text-xs"
                          >
                            Title
                          </FieldLabel>
                          <Input
                            id={`link-title-${index}`}
                            placeholder="e.g., Portfolio"
                            value={link.title.value ?? ""}
                            onChange={(e) =>
                              onUpdateLink(index, "title", e.target.value)
                            }
                          />
                        </Field>
                        <Field className="flex-1">
                          <FieldLabel
                            htmlFor={`link-url-${index}`}
                            className="text-xs"
                          >
                            URL
                          </FieldLabel>
                          <Input
                            id={`link-url-${index}`}
                            placeholder="https://..."
                            value={link.url.value ?? ""}
                            onChange={(e) =>
                              onUpdateLink(index, "url", e.target.value)
                            }
                          />
                        </Field>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={() => onRemoveLink(index)}
                          aria-label="Remove link"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="max-w-1/8"
                    onClick={onAddLink}
                  >
                    <Plus className="h-4 w-4" />
                    Add link
                  </Button>
                </Field>
              </FieldGroup>
            </FieldSet>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default DetailsStep;
