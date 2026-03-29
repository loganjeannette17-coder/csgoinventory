import Link from 'next/link'

export default function DatabaseSetupPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-gray-900 border border-gray-800 rounded-xl p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Database setup required</h1>
          <p className="text-gray-400 text-sm mt-2">
            Your Supabase project is reachable, but app tables like <code>public.profiles</code>{' '}
            do not exist yet.
          </p>
        </div>

        <ol className="space-y-3 text-sm text-gray-300 list-decimal list-inside">
          <li>
            In Supabase Dashboard, open <span className="text-white">SQL Editor</span>.
          </li>
          <li>
            Run <code>supabase/schema.sql</code> from this repo.
          </li>
          <li>
            Run migrations in order: <code>001</code> → <code>005</code>.
          </li>
          <li>Restart the dev server and try login/register again.</li>
        </ol>

        <div className="pt-2 flex flex-wrap gap-3">
          <Link
            href="/register"
            className="bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          >
            Back to register
          </Link>
          <Link
            href="/login"
            className="bg-gray-800 hover:bg-gray-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          >
            Back to login
          </Link>
        </div>
      </div>
    </div>
  )
}
