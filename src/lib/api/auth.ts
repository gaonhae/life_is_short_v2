import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

export async function loginWithEmail(email: string, password: string) {
  return supabase.auth.signInWithPassword({
    email,
    password,
  });
}

export async function signupWithEmail(email: string, password: string) {
  return supabase.auth.signUp({
    email,
    password,
  });
}

export async function loginWithGoogle() {
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${typeof window !== 'undefined' ? window.location.origin : process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  });
}

export async function logout() {
  return supabase.auth.signOut();
}

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  return { user: data.user, error };
}
