'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { signupWithEmail, loginWithGoogle } from '@/lib/api/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const signupSchema = z
  .object({
    email: z.string().email('올바른 이메일을 입력해주세요'),
    password: z.string().min(6, '비밀번호는 최소 6자 이상이어야 합니다'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: '비밀번호가 일치하지 않습니다',
    path: ['confirmPassword'],
  });

type SignupFormData = z.infer<typeof signupSchema>;

export function SignupForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = async (data: SignupFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const { error: signUpError } = await signupWithEmail(data.email, data.password);

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      setSuccess(true);
      // 일반적으로 이메일 확인 후 로그인으로 리다이렉트
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err) {
      setError('회원가입에 실패했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await loginWithGoogle();
    } catch (err) {
      setError('Google 회원가입에 실패했습니다');
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="space-y-6 p-6 text-center">
        <div className="rounded-md bg-green-50 p-4">
          <p className="text-sm text-green-800">
            인증 이메일을 보냈습니다. 이메일을 확인하고 계정을 활성화해주세요.
          </p>
        </div>
        <p className="text-sm text-gray-600">잠시 후 로그인 페이지로 이동합니다...</p>
      </div>
    );
  }

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
          placeholder="6자 이상의 비밀번호"
          disabled={isLoading}
          className="mt-1"
          {...register('password')}
        />
        {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>}
      </div>

      <div>
        <Label htmlFor="confirmPassword">비밀번호 확인</Label>
        <Input
          id="confirmPassword"
          type="password"
          placeholder="비밀번호를 다시 입력해주세요"
          disabled={isLoading}
          className="mt-1"
          {...register('confirmPassword')}
        />
        {errors.confirmPassword && (
          <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
        )}
      </div>

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? '회원가입 중...' : '회원가입'}
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
        onClick={handleGoogleSignup}
        className="w-full"
      >
        Google로 가입
      </Button>

      <p className="text-center text-sm text-gray-600">
        이미 계정이 있으신가요?{' '}
        <Link href="/login" className="font-medium text-purple-600 hover:text-purple-700">
          로그인
        </Link>
      </p>
    </form>
  );
}
