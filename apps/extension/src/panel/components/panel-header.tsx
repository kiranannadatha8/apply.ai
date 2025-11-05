import { X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export interface PanelHeaderProps {
  name: string;
  email?: string;
  avatarUrl?: string | null;
  onAvatarClick: () => void;
  onClose: () => void;
}

export function PanelHeader({
  name,
  email,
  avatarUrl,
  onAvatarClick,
  onClose,
}: PanelHeaderProps) {
  const initials =
    name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "AA";

  return (
    <header className="flex h-16 items-center justify-between border-b border-border px-4">
      <button
        type="button"
        className="flex items-center gap-3 rounded-lg px-1 py-1 transition hover:bg-muted"
        onClick={onAvatarClick}
      >
        <Avatar className="h-9 w-9">
          {avatarUrl ? (
            <AvatarImage src={avatarUrl} alt={name} />
          ) : (
            <AvatarFallback>{initials}</AvatarFallback>
          )}
        </Avatar>
        <div className="flex flex-col items-start">
          <span className="text-sm font-semibold text-foreground">{name}</span>
          {email ? (
            <span className="text-xs text-muted-foreground">{email}</span>
          ) : null}
        </div>
      </button>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        onClick={onClose}
        className="text-muted-foreground hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </Button>
    </header>
  );
}
