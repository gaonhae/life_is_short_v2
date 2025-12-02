'use client';

import { User } from '@supabase/supabase-js';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { logout } from '@/lib/api/auth';
import { Button } from '@/components/ui/button';

export function Header({ user }: { user: User }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await logout();
      router.push('/login');
    } catch (err) {
      alert('로그아웃에 실패했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/upload" className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-purple-600">Life Is Short</h1>
        </Link>

        <nav className="flex items-center gap-4">
          <Link href="/upload" className="text-sm font-medium text-gray-700 hover:text-gray-900">
            업로드
          </Link>
          <Link
            href={`/results/${user.id}`}
            className="text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            결과
          </Link>
        </nav>

        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">{user.email}</span>
          <Button variant="outline" size="sm" onClick={handleLogout} disabled={isLoading}>
            {isLoading ? '로그아웃 중...' : '로그아웃'}
          </Button>
        </div>
      </div>
    </header>
  );
}
