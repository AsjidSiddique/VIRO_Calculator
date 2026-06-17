import AppShell from '@/components/AppShell'
import AuthGuard from '@/components/AuthGuard'
import { ToastProvider } from '@/components/Toast'

export default function ProtectedLayout({ children }) {
  return (
    <ToastProvider>
      <AuthGuard>
        <AppShell>{children}</AppShell>
      </AuthGuard>
    </ToastProvider>
  )
}
