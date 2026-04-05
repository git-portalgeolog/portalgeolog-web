'use client';

import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { useState, useEffect } from 'react';

export default function Dashboard() {
  const { user } = useAuth();
  const supabase = createClient();
  const [stats, setStats] = useState({
    trips: 0,
    drivers: 0,
    alerts: 0
  });

  useEffect(() => {
    if (!user) return;

    const fetchStats = async () => {
      // Count drivers
      const { count, error } = await supabase
        .from('drivers')
        .select('*', { count: 'exact', head: true });
      
      if (!error && count !== null) {
        setStats(prev => ({ ...prev, drivers: count }));
      }
    };

    fetchStats();

    // Monitor driver count in real-time
    const channel = supabase
      .channel('dashboard-drivers-count')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'drivers' },
        () => {
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, supabase]);

  return (
    <div>
      <div className="bg-[var(--color-geolog-secondary)] p-8 rounded-3xl shadow-2xl border border-white/5 overflow-hidden relative">
        {/* Decorative background */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-400/5 rounded-full -mr-20 -mt-20 blur-3xl"></div>
        
        <div className="relative z-10">
          <h2 className="text-4xl font-extrabold mb-4 text-white">
            Bem-vindo, <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-sky-300">{user?.email?.split('@')[0]}</span>! 👋
          </h2>
          <p className="text-[var(--color-geolog-accent)] text-lg max-w-2xl leading-relaxed">
            O Portal Geolog está pronto para decolar. Use o menu lateral para gerenciar sua frota e acompanhar as viagens em tempo real.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
            <StatCard title="Total de Viagens" value={stats.trips.toString()} color="border-l-blue-400" />
            <StatCard title="Motoristas Ativos" value={stats.drivers.toString()} color="border-l-cyan-400" />
            <StatCard title="Alertas Pendentes" value={stats.alerts.toString()} color="border-l-[var(--color-geolog-accent)]" />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, color }: { title: string, value: string, color: string }) {
  return (
    <div className={`bg-[var(--color-geolog-blue)] p-8 rounded-2xl border border-white/5 hover:shadow-xl transition-all border-l-4 ${color}`}>
      <p className="text-sm font-bold text-[var(--color-geolog-accent)] uppercase tracking-widest mb-2">{title}</p>
      <div className="flex items-end gap-2">
        <p className="text-5xl font-black text-white">{value}</p>
        <span className="text-xs text-[var(--color-geolog-accent)] mb-2 font-bold">UNIDADES</span>
      </div>
    </div>
  );
}
