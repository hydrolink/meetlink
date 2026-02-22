import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  Clock3,
  Sparkles,
  ShieldCheck,
  Users2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StartParamRedirect } from "@/components/start-param-redirect";

export default function HomePage() {
  return (
    <div className="relative flex flex-col gap-7 py-8 sm:gap-8 sm:py-10">
      <StartParamRedirect />

      <section className="surface-card px-5 py-6 sm:px-7 sm:py-7">
        <div className="space-y-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Scheduling, Simplified
          </div>

          <div className="space-y-3">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-[#f8e7c9] via-[#f2d3a8] to-[#e3b27a] ring-1 ring-[#d2ab79] shadow-[0_18px_34px_-20px_rgba(137,87,38,0.95)]">
              <Calendar className="h-8 w-8 text-[#885726]" />
            </div>
            <h1 className="text-3xl font-bold text-[#5b381c] sm:text-4xl">Meetlink</h1>
            <p className="max-w-xl text-sm text-muted-foreground sm:text-base">
              Create a scheduling poll in seconds, share one link, and instantly see when everyone
              is free across time zones.
            </p>
          </div>

          <Link href="/create" className="block w-full sm:w-auto">
            <Button size="lg" className="h-12 w-full gap-2 text-base sm:min-w-56 sm:w-auto">
              Create a New Plan
              <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>

          <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-3 sm:text-sm">
            <div className="subtle-panel px-3 py-2">Fast setup in under 1 minute</div>
            <div className="subtle-panel px-3 py-2">Designed for mobile and desktop</div>
            <div className="subtle-panel px-3 py-2">Shareable Telegram deep links</div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <FeatureItem
          icon={<Calendar className="h-5 w-5" />}
          title="Flexible date windows"
          description="Pick a date range, working days, and meeting hours with precise slot durations."
        />
        <FeatureItem
          icon={<Clock3 className="h-5 w-5" />}
          title="Tap or drag selection"
          description="Participants mark availability quickly using an interaction model built for touch."
        />
        <FeatureItem
          icon={<Users2 className="h-5 w-5" />}
          title="Clear team consensus"
          description="Heatmaps and ranked best times make it obvious when the group can meet."
        />
      </section>

      <section className="subtle-panel flex items-center gap-3 px-4 py-3 text-xs text-muted-foreground sm:text-sm">
        <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
        Private by default: hosts can enable privacy mode to hide participant identities.
      </section>
    </div>
  );
}

function FeatureItem({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <article className="surface-card h-full px-4 py-4 sm:px-5">
      <div className="space-y-2">
        <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary/12 text-primary">
          {icon}
        </div>
        <h2 className="text-[0.95rem] font-semibold text-foreground">{title}</h2>
        <p className="text-xs text-muted-foreground sm:text-sm">{description}</p>
      </div>
    </article>
  );
}
