import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { CreatePlanForm } from "@/components/create-plan-form";

export default function CreatePlanPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Back to home"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold">New Plan</h1>
          <p className="text-xs text-muted-foreground">Set up your scheduling poll</p>
        </div>
      </div>

      <CreatePlanForm />
    </div>
  );
}
