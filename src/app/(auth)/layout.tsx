export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">Life Is Short</h1>
          <p className="mt-2 text-gray-600">추억을 영상으로 만들어보세요</p>
        </div>
        <div className="rounded-lg bg-white shadow-md">{children}</div>
      </div>
    </div>
  );
}
