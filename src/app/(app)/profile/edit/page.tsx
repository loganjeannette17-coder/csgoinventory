import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import EditProfileForm from './EditProfileForm'

export default async function EditProfilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, display_name, bio, avatar_url, inventory_visibility')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/home')

  return (
    <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Edit Profile</h1>
        <p className="text-gray-500 text-sm mt-1">
          Changes are reflected immediately across the platform.
        </p>
      </div>
      <EditProfileForm profile={profile} />
    </div>
  )
}
