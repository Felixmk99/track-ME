import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center space-y-6">
      <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">
        Unlock Your Health Data
      </h1>
      <p className="text-lg text-muted-foreground max-w-[600px]">
        Visualize your recovery journey. Analyze trends, track experiments, and understand your baseline with advanced analytics for Visible app data.
      </p>
      <div className="flex gap-4">
        <Button asChild size="lg">
          <Link href="/upload">
            Get Started <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
        <Button variant="outline" size="lg" asChild>
          <Link href="/about">
            Learn More
          </Link>
        </Button>
      </div>
    </div>
  );
}
