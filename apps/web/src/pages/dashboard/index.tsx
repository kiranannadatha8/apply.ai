import { TopNav } from "@/pages/job-board/components/top-nav";
import { JobBoard } from "@/pages/job-board";

export function Dashboard() {
  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="px-8">
        <JobBoard />
      </main>
    </div>
  );
}
