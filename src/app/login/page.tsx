'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Lock, ArrowRight, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

function LoginForm() {
    const [password, setPassword] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()
    const searchParams = useSearchParams()
    const redirectTo = searchParams.get('from') || '/admin'

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
            })

            const data = await response.json()

            if (data.success) {
                toast.success('Access granted')
                router.push(redirectTo)
                router.refresh()
            } else {
                toast.error(data.message || 'Invalid password')
            }
        } catch (error) {
            toast.error('An error occurred. Please try again.')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="w-full max-w-md space-y-8 bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl">
            <div className="text-center space-y-2">
                <div className="mx-auto w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center text-yellow-600 mb-4">
                    <Lock className="w-6 h-6" />
                </div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Admin Access</h1>
                <p className="text-sm text-slate-500 italic">Please enter the security password to continue</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
                <div className="relative group">
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter password"
                        className="w-full h-12 px-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:border-yellow-500 outline-none transition-all pr-12 text-slate-900 dark:text-white"
                        required
                        autoFocus
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-yellow-500 transition-colors">
                        <ShieldCheck className="w-5 h-5" />
                    </div>
                </div>

                <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-12 bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl font-semibold shadow-lg shadow-yellow-500/20 gap-2 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                >
                    {isLoading ? 'Verifying...' : (
                        <>
                            Unlock Console <ArrowRight className="w-4 h-4" />
                        </>
                    )}
                </Button>
            </form>

            <div className="text-center">
                <button
                    onClick={() => router.push('/')}
                    className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
                >
                    ← Return to Homepage
                </button>
            </div>
        </div>
    )
}

export default function LoginPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
            <Suspense fallback={
                <div className="w-full max-w-md p-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl flex flex-col items-center justify-center space-y-4">
                    <div className="w-12 h-12 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-500 text-sm animate-pulse italic">Securing Admin Access...</p>
                </div>
            }>
                <LoginForm />
            </Suspense>
        </div>
    )
}
