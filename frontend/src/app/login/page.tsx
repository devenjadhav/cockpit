'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useToastHelpers } from '@/hooks/useToast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuth();
  const { success, error } = useToastHelpers();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await login({ email, type: 'magic-link' });
      if (result.success) {
        success('Magic link sent!', 'Check your email to login.');
      } else {
        error('Login failed', result.message);
      }
    } catch (err) {
      error('Connection error', 'Failed to send magic link. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md cockpit-panel p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">Cockpit</h1>
          <p className="mt-2 text-sm text-white/60">
            Enter your email to receive a magic link
          </p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="label block mb-2">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full px-3 py-2 bg-black text-white border border-white/30 placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/30 sm:text-sm"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full flex justify-center items-center"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Sending magic link...
                </div>
              ) : (
                'Send magic link'
              )}
            </button>
          </div>
        </form>

        <p className="mt-6 text-center text-xs text-white/40">
          If you don't get it now, you will get it never
        </p>
      </div>
    </div>
  );
}
