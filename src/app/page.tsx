import Link from "next/link";
import { Calendar, Clock, Users, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="flex flex-col items-center py-10 gap-8">
      {/* Logo / Hero */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-2">
          <Calendar className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Meetlink</h1>
        <p className="text-muted-foreground text-base max-w-xs mx-auto">
          Find the perfect time to meet. Create a poll, share the link, see when everyone&apos;s
          free.
        </p>
      </div>

      {/* CTA */}
      <Link href="/create" className="w-full max-w-sm">
        <Button size="lg" className="w-full h-14 text-base font-semibold gap-2">
          Create a New Plan
          <ArrowRight className="h-5 w-5" />
        </Button>
      </Link>

      {/* Features */}
      <div className="w-full max-w-sm grid grid-cols-1 gap-3 mt-2">
        <FeatureItem
          icon={<Calendar className="h-5 w-5" />}
          title="Flexible date ranges"
          description="Pick any date range with custom time windows and granularity"
        />
        <FeatureItem
          icon={<Clock className="h-5 w-5" />}
          title="Tap to mark availability"
          description="Intuitive paint-to-select grid works on mobile and desktop"
        />
        <FeatureItem
          icon={<Users className="h-5 w-5" />}
          title="See results instantly"
          description="Heatmap shows the best times at a glance"
        />
      </div>
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
    <div className="flex gap-3 p-4 rounded-xl bg-muted/50">
      <div className="shrink-0 text-primary mt-0.5">{icon}</div>
      <div>
        <p className="font-medium text-sm">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
    </div>
  );
}
