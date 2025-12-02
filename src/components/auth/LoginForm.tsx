'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { loginWithEmail, loginWithGoogle } from '@/lib/api/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const loginSchema = z.object({
  email: z.string().email('올바른 이메일을 입력해주세요'),
  password: z.string().min(1, '비밀번호를 입력해주세요'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const { error: signInError } = await loginWithEmail(data.email, data.password);

      if (signInError) {
        setError(signInError.message);
        return;
      }

      router.push('/upload');
    } catch (err) {
      setError('로그인에 실패했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await loginWithGoogle();
    } catch (err) {
      setError('Google 로그인에 실패했습니다');
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 p-6">
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div>
        <Label htmlFor="email">이메일</Label>
        <Input
          id="email"
          type="email"
          placeholder="your@email.com"
          disabled={isLoading}
          className="mt-1"
          {...register('email')}
        />
        {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
      </div>

      <div>
        <Label htmlFor="password">비밀번호</Label>
        <Input
          id="password"
          type="password"
          placeholder="비밀번호를 입력해주세요"
          disabled={isLoading}
          className="mt-1"
          {...register('password')}
        />
        {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>}
      </div>

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? '로그인 중...' : '로그인'}
      </Button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-white px-2 text-gray-500">또는</span>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        disabled={isLoading}
        onClick={handleGoogleLogin}
        className="w-full"
      >
        Google로 로그인
      </Button>

      <p className="text-center text-sm text-gray-600">
        계정이 없으신가요?{' '}
        <Link href="/signup" className="font-medium text-purple-600 hover:text-purple-700">
          회원가입
        </Link>
      </p>
    </form>
  );
}
