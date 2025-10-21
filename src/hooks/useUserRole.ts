import { useState, useEffect } from 'react';
import { supabase, Profile } from '../lib/supabase';

/**
 * Hook to check if the current user is an admin
 *
 * @returns {isAdmin: boolean, loading: boolean, role: 'user' | 'admin' | null}
 */
export const useUserRole = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [role, setRole] = useState<'user' | 'admin' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUserRole();
  }, []);

  const checkUserRole = async () => {
    try {
      setLoading(true);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setIsAdmin(false);
        setRole(null);
        setLoading(false);
        return;
      }

      // Fetch user profile to get role
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching user role:', error);
        setIsAdmin(false);
        setRole('user'); // Default to user if error
        setLoading(false);
        return;
      }

      const userRole = (profile as Profile)?.role || 'user';
      setRole(userRole);
      setIsAdmin(userRole === 'admin');
      setLoading(false);
    } catch (error) {
      console.error('Error in checkUserRole:', error);
      setIsAdmin(false);
      setRole('user');
      setLoading(false);
    }
  };

  return { isAdmin, role, loading, refetch: checkUserRole };
};
