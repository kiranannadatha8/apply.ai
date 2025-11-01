import { Bell, Sun, Search, Shell, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTheme } from "@/app/theme-provider";

export function TopNav() {
  const { setTheme } = useTheme();
  const currentTheme = localStorage.getItem("vite-ui-theme");
  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex h-20 max-w-[1400px] items-center gap-6 p-6">
        <div className="flex items-center gap-3">
          <Shell className="size-8 text-primary" />
          <div className="flex flex-col">
            <span className="text-2xl pb-1 font-semibold text-foreground">
              apply.ai
            </span>
          </div>
        </div>

        <nav className="hidden items-center gap-1 md:flex ml-auto">
          <Tabs defaultValue="jobboard">
            <TabsList>
              <TabsTrigger value="jobboard">Job Board</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
              <TabsTrigger value="contacts">Contacts</TabsTrigger>
              <TabsTrigger value="resumes">Resumes</TabsTrigger>
              <TabsTrigger value="calander">Calander</TabsTrigger>
            </TabsList>
          </Tabs>
        </nav>

        <div className="ml-auto hidden items-center gap-3 md:flex">
          <InputGroup>
            <InputGroupInput placeholder="Search..." />
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
            <InputGroupAddon align="inline-end">12 results</InputGroupAddon>
          </InputGroup>
          <Button
            variant="outline"
            size="icon"
            onClick={() =>
              setTheme(currentTheme === "light" ? "dark" : "light")
            }
          >
            <Sun className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90 text-muted-foreground" />
            <Moon className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0 text-muted-foreground" />
            <span className="sr-only">Toggle theme</span>
          </Button>
          <Button variant="outline" size="icon">
            <Bell className="h-[1.2rem] w-[1.2rem] text-muted-foreground" />
          </Button>
          <Avatar>
            <AvatarImage src="https://github.com/shadcn.png" />
            <AvatarFallback>CN</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
}
