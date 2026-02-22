import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { CreatePlanForm } from "@/components/create-plan-form";

export default function CreatePlanPage() {
  return (
    <div className="space-y-7 py-1">
      <header className="surface-card px-5 py-5 sm:px-6">
        <div className="flex items-start gap-3">
          <Link
            href="/"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/80 bg-background/80 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Back to home"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="space-y-1.5">
            <p className="section-label">Setup</p>
            <h1 className="text-2xl font-bold text-foreground sm:text-[1.75rem]">Create a New Plan</h1>
            <p className="text-sm text-muted-foreground">
              Define your availability window and publish a shareable scheduling poll.
            </p>
          </div>
        </div>
      </header>

      <CreatePlanForm />
    </div>
  );
}
