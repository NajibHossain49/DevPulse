export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold">DevPulse</h1>
      <p className="mt-4 text-lg text-gray-600">AI-Powered Developer Analytics</p>
      <a href="/login" className="mt-8 px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition">
        Get Started
      </a>
    </main>
  );
}
