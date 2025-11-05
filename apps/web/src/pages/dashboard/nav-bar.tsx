import { NavLink } from "react-router-dom";
import { Bell, Moon, SearchIcon, Sun, Triangle, User2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useTheme } from "@/app/theme-provider";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";

const NAV_ITEMS: { label: string; to: string }[] = [
  { label: "Insights", to: "/" },
  { label: "Job Board", to: "/job-board" },
  { label: "Resumes", to: "/resumes" },
  { label: "Profiles", to: "/profiles" },
  { label: "Settings", to: "/settings" },
];

function SegmentedNav() {
  return (
    <nav
      aria-label="Primary"
      className="bg-muted/70 text-muted-foreground inline-flex h-9 w-fit items-center justify-center rounded-lg p-[3px]"
    >
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            cn(
              "rounded-lg px-3 py-1 text-sm font-medium transition-colors",
              "text-muted-foreground hover:text-foreground",
              isActive && "border border-border/70  bg-card text-foreground",
            )
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

export default function DashboardNavBar() {
  const { setTheme } = useTheme();
  return (
    <header className="sticky top-0 z-30 w-full border-b bg-background/80 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="flex h-16 max-w-screen-2xl items-center justify-between gap-4 px-4 sm:h-20 sm:px-6 lg:px-8">
        {/* Left: Brand + Segmented Nav */}
        <div className="flex min-w-0 items-center gap-14">
          {/* Brand */}
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-foreground text-background">
              {/* Filled triangle to mimic logo */}
              <Triangle className="h-4 w-4 fill-current [stroke-width:0]" />
            </div>
            <span className="select-none text-xl font-semibold tracking-tight">
              apply.ai
            </span>
          </div>

          {/* Segmented primary navigation */}
          <div className="hidden md:block">
            <SegmentedNav />
          </div>
        </div>

        {/* Right: Search + Icons */}
        <div className="flex shrink-0 items-center gap-3">
          <div className="hidden lg:block">
            <InputGroup>
              <InputGroupInput type="text" placeholder="Search..." />
              <InputGroupAddon>
                <SearchIcon />
              </InputGroupAddon>
            </InputGroup>
          </div>

          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={() =>
              setTheme(
                localStorage.getItem("vite-ui-theme") === "light"
                  ? "dark"
                  : "light",
              )
            }
            className="relative h-10 w-10"
            aria-label="Toggle theme"
          >
            <Sun className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
            <Moon className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
            <span className="sr-only">Toggle theme</span>
          </Button>

          <Avatar className="h-10 w-10">
            {/* Replace with real user avatar if available */}
            <AvatarImage src="/images/avatar.jpg" alt="User" />
            <AvatarFallback className="text-sm">
              <User2 className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
}
