export const metadata = {
  title: "DevPulse — AI-Powered Developer Analytics",
  description: "Track team productivity, code quality, and development velocity with AI-powered insights.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
