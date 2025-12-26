'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Upload, Activity, Shield, Heart, ArrowRight, Zap, BarChart3, Lock } from 'lucide-react'
import { motion } from 'framer-motion'
import { useDropzone } from 'react-dropzone'
import { useRouter } from 'next/navigation'
import { useCallback } from 'react'

export default function LandingPage() {
  const router = useRouter()

  // Drag & Drop Handler (Demo for now - redirects to signup)
  // Ideally, we'd store the file in local storage or context and pass it to the secure upload page after login.
  // For this V1, let's keep it simple: clicking it goes to the secure upload page (which asks for login).
  const onDrop = useCallback((acceptedFiles: File[]) => {
    // Check if user is logged in? 
    // For a smooth flow: Store file in a global context? 
    // Or simpler: Just redirect to /upload which will force login, then they drop again.
    router.push('/upload')
  }, [router])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    noClick: false, // Allow clicking to open file dialog
    accept: { 'text/csv': ['.csv'] }
  })

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-white to-gray-50 dark:from-gray-950 dark:to-gray-900">



      <main className="flex-1">

        {/* Hero Section */}
        <section className="relative px-6 pt-12 pb-24 lg:px-8 flex flex-col items-center text-center overflow-hidden">
          {/* Background Decor */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-primary/5 rounded-full blur-3xl -z-10" />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl space-y-6"
          >
            <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-primary/10 text-primary hover:bg-primary/20">
              <Shield className="mr-1 h-3 w-3" /> Privacy-First Health Analytics
            </div>

            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-foreground">
              Understand your body.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-violet-500">Master your energy.</span>
            </h1>

            <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              A secure, friendly space for ME/CFS and Long Covid warriors to visualize "Visible" app data.
              Spot crash triggers, track medication efficacy, and find your baseline—without compromising privacy.
            </p>

            {/* Hero Drop Zone */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="mt-10 mx-auto max-w-xl w-full"
            >
              <div
                {...getRootProps()}
                className={`
                    p-8 rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-300
                    flex flex-col items-center justify-center gap-4 group
                    ${isDragActive ? 'border-primary bg-primary/5 shadow-lg shadow-primary/20' : 'border-muted-foreground/20 bg-card hover:border-primary/50 hover:shadow-xl'}
                  `}
              >
                <input {...getInputProps()} />
                <div className="p-4 bg-primary/10 rounded-full group-hover:bg-primary/20 transition-colors">
                  <Upload className="h-8 w-8 text-primary" />
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-foreground">Analyze your CSV instantly</h3>
                  <p className="text-sm text-muted-foreground">Drag & Drop your Visible export here to start</p>
                </div>
                <Button variant="secondary" size="sm" className="mt-2" onClick={(e) => {
                  e.stopPropagation();
                  router.push('/login');
                }}>
                  Or create an account first <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </motion.div>

            <div className="flex justify-center gap-6 pt-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-1"><Shield className="h-4 w-4 text-green-500" /> Secure Storage</div>
              <div className="flex items-center gap-1"><Zap className="h-4 w-4 text-amber-500" /> Instant Insights</div>
            </div>

          </motion.div>
        </section>

        {/* Feature Grid */}
        <section className="py-24 bg-muted/50">
          <div className="container px-6 mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight mb-4">Why analyze your trends?</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Raw data is hard to read when you have brain fog. We turn your daily check-ins into clear,
                friendly stories that help you advocate for your health.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <FeatureCard
                icon={<Lock className="h-6 w-6 text-rose-500" />}
                title="Private by Design"
                description="Your health data is sensitive. That's why we use Row Level Security (RLS). You own your data, full stop."
                bg="bg-rose-50 dark:bg-rose-950/20"
              />
              <FeatureCard
                icon={<BarChart3 className="h-6 w-6 text-blue-500" />}
                title="Understand Your Baseline"
                description="Correlate HRV, symptoms, and rest to find your safe energy envelope. Identify crash triggers before they happen."
                bg="bg-blue-50 dark:bg-blue-950/20"
              />
              <FeatureCard
                icon={<Heart className="h-6 w-6 text-violet-500" />}
                title="Made for Patients"
                description="Designed specifically for the chronic illness community. High contrast, low cognitive load, and pacing-focused."
                bg="bg-violet-50 dark:bg-violet-950/20"
              />
            </div>
          </div>
        </section>

        {/* Visualization Teaser Section */}
        <section className="py-24 container px-6 mx-auto flex flex-col lg:flex-row items-center gap-16">
          <div className="flex-1 space-y-8">
            <h2 className="text-3xl sm:text-4xl font-bold">Spot patterns, find balance.</h2>
            <p className="text-lg text-muted-foreground">
              Our advanced analytics engine helps you evaluate if that new supplement is actually working, or if "Resting Pacing" is improving your baseline scores.
            </p>
            <ul className="space-y-4">
              <CheckItem text="PEM (Post-Exertional Malaise) Detection" />
              <CheckItem text="Medication Efficacy Tracking" />
              <CheckItem text="Symptom Correlation Matrix" />
              <CheckItem text="HRV & Resting Heart Rate Trends" />
            </ul>
            <Button size="lg" className="rounded-full px-8 mt-4" asChild>
              <Link href="/login">Get Started for Free</Link>
            </Button>
          </div>
          <div className="flex-1 relative">
            {/* Placeholder for the AI Generated Image */}
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border bg-card aspect-[4/3] group">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5 opacity-50" />
              {/* We will replace this with the actual generated image in the artifacts */}
              <img
                src="/hero_chart_visualization.webp"
                alt="Dashboard Visualization"
                className="object-cover w-full h-full scale-100 group-hover:scale-105 transition-transform duration-700"
              />
              {/* Overlay card look */}
              <div className="absolute bottom-6 left-6 right-6 bg-background/80 backdrop-blur-md p-4 rounded-xl border shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold">Weekly Insights</span>
                  <span className="text-xs text-green-500 font-medium flex items-center gap-1">
                    <TrendingUpIcon className="h-3 w-3" /> +12% Baseline
                  </span>
                </div>
                <div className="h-2 w-full bg-secondary/20 rounded-full overflow-hidden">
                  <div className="h-full bg-primary w-[70%]" />
                </div>
              </div>
            </div>
          </div>
        </section>

      </main>

      <footer className="py-12 bg-muted/30 border-t">
        <div className="container px-6 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Track-ME. Open Source & Community Driven.</p>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ icon, title, description, bg }: { icon: React.ReactNode, title: string, description: string, bg: string }) {
  return (
    <Card className="border-none shadow-md hover:shadow-lg transition-shadow duration-300">
      <CardContent className="pt-6">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${bg}`}>
          {icon}
        </div>
        <h3 className="text-xl font-semibold mb-2">{title}</h3>
        <p className="text-muted-foreground leading-relaxed">{description}</p>
      </CardContent>
    </Card>
  )
}

function CheckItem({ text }: { text: string }) {
  return (
    <li className="flex items-center gap-3">
      <div className="h-6 w-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
        <Shield className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
      </div>
      <span className="font-medium text-foreground">{text}</span>
    </li>
  )
}

function TrendingUpIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  )
}
