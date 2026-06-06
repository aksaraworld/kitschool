'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input } from '@aksara/ui';
import SchoolLogo from '@/components/Brand/SchoolLogo';
import PoweredByFooter from '@/components/Brand/PoweredByFooter';
import { brand } from '@/lib/branding';
import { firebaseAuthService } from '@/lib/firebaseAuth';
import { UserRole, hasAnyRole } from '@/lib/types';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await firebaseAuthService.login({ email, password });
      const targetRoute =
        hasAnyRole(response.user, [UserRole.SAAS_ADMIN]) ? '/saas/dashboard' : '/dashboard';
      router.push(targetRoute);
    } catch (err: any) {
      setError(err.message || 'Login gagal. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-cognifaNeutral-altBg">
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="max-w-md w-full bg-cognifaNeutral-bg rounded-2xl shadow-lg p-8 border border-cognifaNeutral-border">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-3 min-h-[72px] items-center">
              <SchoolLogo width={160} height={72} className="h-[72px] w-auto object-contain" />
            </div>
            {brand.schoolName && (
              <p className="text-base font-semibold text-gray-900">{brand.schoolName}</p>
            )}
            <p className="text-cognifaNeutral-secondary text-sm font-medium mt-2">{brand.tagline}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <Input
              id="email"
              type="email"
              label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Masukkan email Anda"
            />

            <Input
              id="password"
              type="password"
              label="Kata Sandi"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Masukkan kata sandi Anda"
            />

            <Button
              type="submit"
              disabled={isLoading}
              isLoading={isLoading}
              className="w-full bg-primary-600 hover:bg-primary-700 [background-image:none] hover:[background-image:none]"
              variant="default"
            >
              Masuk
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-cognifaNeutral-secondary">
            Tidak ada pendaftaran. Akun dibuat oleh staf/kepala sekolah.
          </p>
        </div>
      </div>
      <PoweredByFooter />
    </div>
  );
}
