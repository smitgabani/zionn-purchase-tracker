'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAppDispatch } from '@/lib/store/hooks'
import { setUser, setLoading } from '@/lib/store/slices/authSlice'

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        dispatch(setUser(session.user))
      } else {
        dispatch(setUser(null))
      }
      
      if (event === 'SIGNED_OUT') {
        router.push('/login')
      }
    })

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        dispatch(setUser(session.user))
      } else {
        dispatch(setLoading(false))
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [dispatch, router, supabase])

  return <>{children}</>
}
