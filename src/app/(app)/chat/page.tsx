// Default state: no conversation selected.
// Shown in the right panel when the user opens /chat directly.
export default function ChatIndexPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-6 space-y-3">
      <div className="h-16 w-16 rounded-full bg-gray-800 flex items-center justify-center">
        <ChatBubbleIcon />
      </div>
      <h2 className="text-lg font-semibold text-white">Your messages</h2>
      <p className="text-gray-500 text-sm max-w-xs">
        Select a conversation from the sidebar, or visit a user&apos;s profile and click{' '}
        <strong className="text-gray-300">Message</strong> to start a new chat.
      </p>
    </div>
  )
}

function ChatBubbleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-8 w-8 text-gray-500" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
    </svg>
  )
}
