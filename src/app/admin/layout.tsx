import { Metadata } from "next"
import Link from "next/link"
import { LayoutDashboard, BookOpen, BarChart3, Settings, ExternalLink, ArrowLeft } from "lucide-react"

export const metadata: Metadata = {
  title: "Admin Panel | HCF Chatbot",
  description: "Manage documents and AI chatbot settings",
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen w-full bg-slate-50 dark:bg-slate-950">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-white dark:bg-slate-900 hidden md:flex flex-col">
        <div className="h-16 flex items-center px-6 border-b">
          <span className="text-xl font-bold bg-gradient-to-r from-yellow-500 to-yellow-300 bg-clip-text text-transparent">
            HCF
          </span>
          <span className="ml-2 font-semibold text-slate-700 dark:text-slate-300">Admin</span>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <Link href="/admin" className="flex items-center px-3 py-2 text-sm font-medium rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400">
            <LayoutDashboard className="w-4 h-4 mr-3" />
            Knowledge Base
          </Link>
          <Link href="/admin/analytics" className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors">
            <BarChart3 className="w-4 h-4 mr-3" />
            Analytics
          </Link>
          <Link href="/admin/settings" className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors">
            <Settings className="w-4 h-4 mr-3" />
            Settings
          </Link>
        </nav>
        <div className="p-4 border-t">
          <Link href="/" className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white transition-all">
            <ExternalLink className="w-4 h-4 mr-3" />
            View Website
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        <header className="h-16 border-b bg-white dark:bg-slate-900 flex items-center px-6 justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="md:hidden p-2 -ml-2 text-slate-500 hover:text-slate-900">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Dashboard</h1>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/" className="hidden md:flex items-center text-sm text-slate-500 hover:text-yellow-600 transition-colors">
              <span className="mr-2">Exit Admin</span>
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 mx-2 hidden md:block" />
            <span className="text-sm text-slate-500">Admin User</span>
            <div className="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center text-white font-bold text-sm">
              A
            </div>
          </div>
        </header>
        <div className="flex-1 p-6 md:p-8 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
