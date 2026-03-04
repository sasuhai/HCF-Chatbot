import { ChatWidget } from "@/components/chat-widget"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Settings } from "lucide-react"

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden">
      {/* Admin Button */}
      <div className="absolute top-6 right-6 z-20">
        <Link href="/admin">
          <Button variant="ghost" size="sm" className="gap-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors duration-200">
            <Settings className="w-4 h-4" />
            <span>Admin Panel</span>
          </Button>
        </Link>
      </div>

      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-br from-yellow-100 to-transparent dark:from-yellow-900/20 -z-10" />
      <div className="absolute top-[-100px] right-[-100px] w-[400px] h-[400px] rounded-full bg-yellow-200/50 dark:bg-yellow-900/20 blur-3xl -z-10" />
      <div className="absolute bottom-[-50px] left-[-50px] w-[300px] h-[300px] rounded-full bg-blue-200/50 dark:bg-blue-900/20 blur-3xl -z-10" />

      <div className="text-center space-y-6 max-w-3xl px-6 z-10">
        <div className="inline-block p-2 px-4 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 font-medium text-sm mb-4">
          Welcome to the Hidayah Centre Foundation
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Empowering Communities,<br />
          <span className="bg-gradient-to-r from-yellow-500 to-yellow-400 bg-clip-text text-transparent">Sharing Islam.</span>
        </h1>
        <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
          We connect communities of diverse ethnicities and religions in Malaysia,
          providing support, guidance, and sharing the beauty of Islam.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Button size="lg" className="h-12 px-8 bg-yellow-500 hover:bg-yellow-600 text-white rounded-full font-semibold shadow-lg shadow-yellow-500/25">
            Learn More
          </Button>
          <Button size="lg" variant="outline" className="h-12 px-8 rounded-full font-semibold shadow-sm">
            Support Us
          </Button>
        </div>
      </div>

      {/* Embedded Chat Widget for Demo */}
      <ChatWidget />
    </main>
  )
}
