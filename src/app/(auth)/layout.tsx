// Shared layout for /login and /register.
// Middleware handles auth redirect — no duplicate check needed here.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-white tracking-tight">CS2 Inventory</h1>
          <p className="text-gray-400 text-sm mt-1">Track, trade, and auction your skins</p>
        </div>
        {children}
      </div>
    </div>
  )
}
