import { JobBoard } from "@/pages/job-board";
import DashboardNavBar from "./nav-bar";

export function Dashboard() {
  return (
    <main className="flex min-h-screen flex-col bg-background">
      <DashboardNavBar />
      <JobBoard />
    </main>
  );
}
