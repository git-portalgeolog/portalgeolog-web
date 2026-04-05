import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';

interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
}

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (!user) {
      console.log('❌ useNotifications: Usuário não autenticado');
      return;
    }

    console.log('🚀 useNotifications: Inicializando para usuário', user.id);

    // Buscar notificações não lidas
    const fetchNotifications = async () => {
      try {
        console.log('📡 Buscando notificações...');
        const res = await fetch('/api/notifications');
        if (res.ok) {
          const data = await res.json();
          console.log('📋 Notificações carregadas:', data.length);
          setNotifications(data);
          setUnreadCount(data.length);
        } else {
          console.error('❌ Erro ao buscar notificações:', res.status);
        }
      } catch (error) {
        console.error('❌ Erro ao buscar notificações:', error);
      }
    };

    fetchNotifications();

    // Configurar subscription em tempo real com Supabase
    console.log('🔧 Configurando canal Realtime...');
    const channel = supabase
      .channel(`notifications_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload: any) => {
          console.log('🔔 Nova notificação recebida:', payload);
          const newNotification = payload.new as Notification;
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);
          
          // Mostrar toast notification instantâneo
          showToastNotification(newNotification);
        }
      )
      .subscribe((status: any, err?: any) => {
        console.log('📊 Status do canal:', status, err);
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ Conectado ao canal de notificações em tempo real');
          setRealtimeConnected(true);
        } else if (status === 'CHANNEL_ERROR') {
          console.warn('⚠️ Erro no canal de notificações:', err);
          setRealtimeConnected(false);
        } else if (status === 'TIMED_OUT') {
          console.warn('⏰ Timeout no canal de notificações');
        } else if (status === 'CLOSED') {
          console.warn('🔌 Canal de notificações fechado');
          setRealtimeConnected(false);
        }
      });

    // Cleanup
    return () => {
      console.log('🧹 Limpando canal de notificações');
      supabase.removeChannel(channel);
    };
  }, [user, supabase]);

  const markAsRead = async (notificationId: string) => {
    try {
      const res = await fetch(`/api/notifications/${notificationId}`, {
        method: 'PATCH'
      });

      if (res.ok) {
        setNotifications(prev => 
          prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    try {
      const unreadNotifications = notifications.filter(n => !n.read);
      await Promise.all(
        unreadNotifications.map(n => markAsRead(n.id))
      );
    } catch (error) {
      console.error('Erro ao marcar todas como lidas:', error);
    }
  };

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    realtimeConnected
  };
}

// Função para mostrar toast notification
function showToastNotification(notification: Notification) {
  // Criar elemento toast
  const toast = document.createElement('div');
  toast.className = 'fixed top-24 right-6 z-[10000] bg-white border border-slate-200 rounded-2xl shadow-2xl p-4 min-w-[320px] max-w-[400px] transform translate-x-full transition-transform duration-300 ease-out';
  
  toast.innerHTML = `
    <div class="flex items-start gap-3">
      <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-blue-600">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>
      </div>
      <div class="flex-1 min-w-0">
        <p class="font-black text-sm text-slate-800">${notification.title}</p>
        <p class="text-sm text-slate-600 mt-1">${notification.message}</p>
        <p class="text-xs text-slate-400 mt-2">${new Date(notification.created_at).toLocaleTimeString('pt-BR')}</p>
      </div>
      <button class="text-slate-400 hover:text-slate-600 transition-colors p-1" onclick="this.closest('.toast').remove()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 6L6 18"></path>
          <path d="M6 6l12 12"></path>
        </svg>
      </button>
    </div>
  `;
  
  // Adicionar classe para identificação
  toast.classList.add('toast');
  
  // Adicionar ao DOM
  document.body.appendChild(toast);
  
  // Animar entrada
  setTimeout(() => {
    toast.classList.remove('translate-x-full');
    toast.classList.add('translate-x-0');
  }, 100);
  
  // Auto-remover após 8 segundos
  setTimeout(() => {
    toast.classList.add('translate-x-full');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, 8000);
}
