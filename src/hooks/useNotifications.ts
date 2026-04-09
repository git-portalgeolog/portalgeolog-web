import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';

export interface AppNotification {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message: string;
  target_audience: 'interno' | 'gestor' | 'all';
  target_user_id: string | null;
  empresa_id: string | null;
  created_at: string;
}

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (!user) return;

    const fetchNotifications = async () => {
      try {
        const res = await fetch('/api/app-notifications');
        if (res.ok) {
          const data = await res.json() as AppNotification[];
          setNotifications(data);
        }
      } catch (error) {
        console.error('Erro ao buscar notificações:', error);
      }
    };

    fetchNotifications();

    const channel = supabase
      .channel('app_notifications_feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'app_notifications' },
        (payload: { new: Record<string, unknown> }) => {
          const notif = payload.new as unknown as AppNotification;
          setNotifications(prev => [notif, ...prev]);
        }
      )
      .subscribe((status: string) => {
        setRealtimeConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, supabase]);

  const dismiss = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const dismissAll = () => setNotifications([]);

  return {
    notifications,
    unreadCount: notifications.length,
    dismiss,
    dismissAll,
    realtimeConnected,
  };
}
