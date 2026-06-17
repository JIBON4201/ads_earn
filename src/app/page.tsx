'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import AdminPanel from '@/components/admin/AdminPanel'
import UserApp from '@/components/user/UserApp'

function AppRouter() {
  const searchParams = useSearchParams()
  const isAdmin = searchParams.get('admin') === 'true'

  if (isAdmin) {
    return <AdminPanel />
  }

  return <UserApp />
}

export default function Home() {
  return (
    <Suspense>
      <AppRouter />
    </Suspense>
  )
}