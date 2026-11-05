import { supabase } from './supabase';

export const AUTH_STORAGE_KEY = 'classroom-survey-auth';

export function isAuthenticated(): boolean {
  return localStorage.getItem(AUTH_STORAGE_KEY) === 'true';
}

export function setAuthenticated(value: boolean) {
  if (value) {
    localStorage.setItem(AUTH_STORAGE_KEY, 'true');
    return;
  }

  localStorage.removeItem(AUTH_STORAGE_KEY);
}

export async function loginWithPassword(email: string, password: string): Promise<boolean> {
  const trimmedEmail = email.trim();
  const trimmedPassword = password.trim();

  if (!trimmedEmail || !trimmedPassword) {
    return false;
  }

  if (supabase) {
    const { error } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password: trimmedPassword,
    });

    if (!error) {
      setAuthenticated(true);
      return true;
    }

    if (error.message.includes('Invalid login credentials')) {
      throw new Error('Invalid email or password.');
    }

    throw new Error(error.message || 'Unable to sign in.');
  }

  setAuthenticated(true);
  return true;
}

export async function logout(): Promise<void> {
  if (supabase) {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Supabase logout error:', error);
    }
  }

  setAuthenticated(false);
}
