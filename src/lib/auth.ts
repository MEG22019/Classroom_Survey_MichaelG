import { useEffect, useState } from 'react';
import { supabase } from './supabase';

export const AUTH_STORAGE_KEY = 'classroom-survey-auth';

export function isAuthenticated(): boolean {
  if (supabase) {
    return localStorage.getItem(AUTH_STORAGE_KEY) === 'true';
  }

  return localStorage.getItem(AUTH_STORAGE_KEY) === 'true';
}

export function setAuthenticated(value: boolean) {
  if (value) {
    localStorage.setItem(AUTH_STORAGE_KEY, 'true');
    return;
  }

  localStorage.removeItem(AUTH_STORAGE_KEY);
}

export async function hasValidSupabaseSession(): Promise<boolean> {
  if (!supabase) {
    return isAuthenticated();
  }

  const { data: { session } } = await supabase.auth.getSession();
  const userLoggedIn = !!session;
  setAuthenticated(userLoggedIn);
  return userLoggedIn;
}

export function useAuthState() {
  const [state, setState] = useState({ ready: false, authenticated: false });

  useEffect(() => {
    let active = true;

    const syncState = async () => {
      if (!supabase) {
        const authenticated = isAuthenticated();
        if (active) {
          setState({ ready: true, authenticated });
        }
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (active) {
          const authenticated = !!session;
          setAuthenticated(authenticated);
          setState({ ready: true, authenticated });
        }
      } catch {
        if (active) {
          setAuthenticated(false);
          setState({ ready: true, authenticated: false });
        }
      }
    };

    void syncState();

    if (!supabase) {
      return undefined;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const authenticated = !!session;
      setAuthenticated(authenticated);
      if (active) {
        setState({ ready: true, authenticated });
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  return state;
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
