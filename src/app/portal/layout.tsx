export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white px-6 py-4 shadow-sm">
        <div className="mx-auto flex max-w-4xl items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">
            T
          </div>
          <span className="text-lg font-semibold text-gray-900">Knnect360</span>
          <span className="text-sm text-gray-500">Customer Portal</span>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-8">{children}</main>
      <footer className="border-t bg-white px-6 py-4 text-center text-sm text-gray-400">
        Powered by Knnect360
      </footer>
    </div>
  );
}
