import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="max-w-screen-sm mx-auto px-4 py-20 text-center space-y-4">
      <p className="text-7xl font-black text-gray-800">404</p>
      <h2 className="text-xl font-bold text-white">Page not found</h2>
      <p className="text-gray-400 text-sm">
        The page you&apos;re looking for doesn&apos;t exist or was moved.
      </p>
      <div className="pt-2">
        <Link
          href="/home"
          className="bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-5 py-2 text-sm font-medium transition-colors inline-block"
        >
          Back to home
        </Link>
      </div>
    </div>
  )
}
