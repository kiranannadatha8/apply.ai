import { QueryProvider } from "@/lib/query-client";
import { SidePanelRoot } from "./SidePanelRoot";

export function SidePanelApp() {
  return (
    <QueryProvider>
      <SidePanelRoot />
    </QueryProvider>
  );
}
