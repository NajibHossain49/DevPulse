"use client";

import { useState } from "react";
import { Zap, Github } from "lucide-react";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    setLoading(true);
    // Better Auth sign-in will be wired in Phase 4
    window.location.href = "/api/auth/callback/github";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 to-slate-900">
      <div className="w-full max-w-md p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-4">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">DevPulse</h1>
          <p className="text-slate-400 mt-2">AI-Powered Developer Analytics</p>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
          <h2 className="text-xl font-semibold text-white mb-4">Welcome back</h2>
          <button
            onClick={handleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white text-slate-900 rounded-lg font-medium hover:bg-gray-100 transition disabled:opacity-50"
          >
            <Github className="w-5 h-5" />
            {loading ? "Signing in..." : "Sign in with GitHub"}
          </button>
        </div>

        <p className="text-center text-slate-500 text-sm mt-6">
          Built with Next.js + AI
        </p>
      </div>
    </div>
  );
}
