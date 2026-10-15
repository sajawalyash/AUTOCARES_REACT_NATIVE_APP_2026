import { Session, User } from '@supabase/supabase-js';
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { fetchProfile } from '../lib/profiles';
import { supabase } from '../lib/supabase';
import type { MechanicType, Profile, UserRole, VehicleType } from '../lib/types';

export type { UserRole };
export type SignUpRole = Exclude<UserRole, 'admin'>;

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  role: UserRole | null;
  isLoading: boolean;
  refreshProfile: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (input: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone: string;
    role: SignUpRole;
    vehicleType: VehicleType | null;
    businessName: string | null;
    cnicNumber: string | null;
    yearsExperience: number | null;
    mechanicType: MechanicType | null;
  }) => Promise<{ error: string | null; needsEmailConfirmation: boolean }>;
  signOut: () => Promise<{ error: string | null }>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function roleHome(role: UserRole | null): string {
  if (role === 'mechanic') return '/(mechanic)/(tabs)';
  if (role === 'admin') return '/(admin)/(tabs)/users';
  if (role === 'customer') return '/(customer)/(tabs)';
  return '/(customer)/(tabs)';
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadProfile = useCallback(async (userId: string | undefined) => {
    if (!userId) {
      setProfile(null);
      return;
    }
    const { profile: next } = await fetchProfile(userId);
    setProfile(next);
  }, []);

  const refreshProfile = useCallback(async () => {
    await loadProfile(session?.user?.id);
  }, [loadProfile, session?.user?.id]);

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!isMounted) return;
      setSession(data.session);
      await loadProfile(data.session?.user?.id);
      if (isMounted) setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      loadProfile(nextSession?.user?.id).finally(() => {
        if (isMounted) setIsLoading(false);
      });
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const value = useMemo<AuthContextValue>(() => {
    const user = session?.user ?? null;
    const role = profile?.role ?? null;

    return {
      session,
      user,
      profile,
      role,
      isLoading,
      refreshProfile,
      async signIn(email, password) {
        setIsLoading(true);
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) {
          setIsLoading(false);
          return { error: error.message };
        }
        if (data.session) {
          setSession(data.session);
          if (data.session.user?.id) {
            await loadProfile(data.session.user.id);
          }
        }
        setIsLoading(false);
        return { error: null };
      },
      async signUp({
        email,
        password,
        firstName,
        lastName,
        phone,
        role,
        vehicleType,
        businessName,
        cnicNumber,
        yearsExperience,
        mechanicType,
      }) {
        setIsLoading(true);
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              first_name: firstName.trim(),
              last_name: lastName.trim(),
              full_name: `${firstName.trim()} ${lastName.trim()}`,
              phone: phone.trim(),
              role,
              vehicle_type: vehicleType,
              business_name: businessName,
              cnic_number: cnicNumber,
              years_experience: yearsExperience,
              mechanic_type: mechanicType,
            },
          },
        });

        if (data.session) {
          setSession(data.session);
          if (data.session.user?.id) {
            await loadProfile(data.session.user.id);
          }
        }
        setIsLoading(false);

        return {
          error: error?.message ?? null,
          needsEmailConfirmation: Boolean(data.user) && !data.session,
        };
      },
      async signOut() {
        const { error } = await supabase.auth.signOut();
        setProfile(null);
        return { error: error?.message ?? null };
      },
    };
  }, [session, profile, isLoading, refreshProfile, loadProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
