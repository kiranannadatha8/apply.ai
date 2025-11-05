import DashboardNavBar from "@/pages/dashboard/nav-bar";
import { JobBoard } from "./components/job-board";

export default function JobBoardPage() {
  return (
    <main className="flex min-h-screen flex-col bg-background">
      <DashboardNavBar />
      <div className="flex-1">
        <JobBoard />
      </div>
    </main>
  );
}

