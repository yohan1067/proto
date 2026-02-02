import { useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { supabase } from '../lib/supabase';

export const useAuthInit = () => {
  const { setSession, setNickname, setIsAdmin, setIsInitialLoading } = useAuthStore();

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('nickname, is_admin')
        .eq('id', userId)
        .single();
      
      if (data) {
        setNickname(data.nickname);
        setIsAdmin(data.is_admin);
        localStorage.setItem('user_nickname', data.nickname);
      } else if (error) {
          if (error.code === 'PGRST116') {
             console.log("Profile missing, creating new profile...");
             const { data: { user } } = await supabase.auth.getUser();
             if (user) {
                 const meta = user.user_metadata;
                 const newNicknameStr = meta?.full_name || meta?.nickname || 'User';
                 
                 const { error: insertError } = await supabase
                   .from('users')
                   .insert({ 
                       id: userId, 
                       email: user.email,
                       nickname: newNicknameStr,
                       is_admin: false 
                   });
                 
                 if (!insertError) {
                     setNickname(newNicknameStr);
                     setIsAdmin(false);
                     localStorage.setItem('user_nickname', newNicknameStr);
                 } else {
                     console.error("Failed to create profile:", insertError);
                 }
             }
          } else {
             console.error("Profile fetch error:", error);
          }
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setIsInitialLoading(false);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else setIsInitialLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else {
        setNickname(null);
        setIsAdmin(false);
        setIsInitialLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);
};
