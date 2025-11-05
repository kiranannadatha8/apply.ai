import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

export interface SettingsRootProps {
  email: string;
  planLabel?: string;
  onLogout: () => void;
  autoApplyMappings: boolean;
  autoApplyDisabled?: boolean;
  onToggleAutoApply: (value: boolean) => void;
  onBack: () => void;
}

export function SettingsRoot({
  email,
  planLabel,
  onLogout,
  autoApplyMappings,
  autoApplyDisabled,
  onToggleAutoApply,
  onBack,
}: SettingsRootProps) {
  const [disabledSites, setDisabledSites] = useState("");

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
        <div className="text-sm font-semibold">Settings</div>
        <div className="w-[72px]" />
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">{email}</p>
                <p className="text-xs text-muted-foreground">
                  {planLabel ?? "ApplyAI Free Plan"}
                </p>
              </div>
              <Button variant="outline" onClick={onLogout}>
                Log out
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">
                  Auto-apply saved mappings on this site
                </p>
                <p className="text-xs text-muted-foreground">
                  Keeps manual autofill bindings in sync automatically.
                </p>
              </div>
              <Switch
                checked={autoApplyMappings}
                onCheckedChange={onToggleAutoApply}
                disabled={autoApplyDisabled}
              />
            </div>
            <Separator />
            <div className="space-y-3">
              <Label htmlFor="disabled-sites">Disabled Sites</Label>
              <Input
                id="disabled-sites"
                placeholder="domain.com, careers.company.com"
                value={disabledSites}
                onChange={(event) => setDisabledSites(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Manage sites where ApplyAI should not auto-detect job postings.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
