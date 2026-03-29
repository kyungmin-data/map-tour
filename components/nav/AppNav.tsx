'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function NavTab({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
        active
          ? 'bg-gray-900 text-white'
          : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
      }`}
    >
      {label}
    </Link>
  )
}

export default function AppNav() {
  const pathname = usePathname()
  const router   = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  return (
    <nav className="flex-shrink-0 flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-white">
      <div className="flex items-center gap-1">
        <NavTab href="/"      label="지도"   active={pathname === '/'} />
        <NavTab href="/cards" label="내 카드" active={pathname === '/cards'} />
      </div>
      <button
        onClick={handleLogout}
        className="text-xs text-gray-400 hover:text-gray-700 transition-colors px-2 py-1"
      >
        로그아웃
      </button>
    </nav>
  )
}
