import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { loadHomeHubData } from '@/lib/home-hub-data'
import { HomeHubShell } from '@/components/home/HomeHubShell'

export default async function AppHomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?next=/home')
  }

  const data = await loadHomeHubData(user.id)

  return <HomeHubShell data={data} />
}
