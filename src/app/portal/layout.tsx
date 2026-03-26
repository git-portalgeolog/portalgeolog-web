'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState, ReactNode, cloneElement, ReactElement } from 'react';
import { 
  Truck, 
  LogOut, 
  LayoutDashboard, 
  Users, 
  FileText, 
  Settings, 
  Bell, 
  Menu, 
  ChevronLeft, 
  ChevronRight,
  Building,
  ShieldCheck,
  Package,
  DollarSign,
  UserSquare2} from 'lucide-react';
import Link from 'next/link';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0A2540]">
        <div className="flex flex-col items-center gap-4">
          <img src="/logo.png" alt="Portal Geolog" className="w-16 h-16 animate-pulse drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]" />
          <p className="text-[#0A2540] dark:text-white font-medium">Carregando...</p>
        </div>
      </div>
    );
  }

  const handleSignOut = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-[#FDFDFF] flex text-[var(--color-geolog-blue)]">
      {/* Sidebar - Hover to Expand */}
      <aside 
        onMouseEnter={() => setCollapsed(false)}
        onMouseLeave={() => setCollapsed(true)}
        className={`${
          collapsed ? 'w-20' : 'w-72'
        } bg-[var(--color-geolog-blue)] border-r border-blue-900 hidden md:flex flex-col fixed inset-y-0 shadow-[4px_0_24px_rgba(0,0,0,0.1)] z-50 transition-all duration-300 ease-in-out group/sidebar`}
      >
        <div className={`p-6 flex items-center ${collapsed ? 'justify-center' : 'justify-start gap-3'} border-b border-blue-800/50 h-20 overflow-hidden`}>
          <div className="p-1.5 bg-white rounded-lg flex-shrink-0">
            <img src="/logo.png" alt="Geolog Logo" className="h-6 w-auto" />
          </div>
          {!collapsed && (
            <span className="text-base font-black text-white uppercase tracking-tighter whitespace-nowrap">Portal Geolog</span>
          )}
        </div>

        <nav className="flex-1 p-4 space-y-2 mt-4">
          <NavLink 
            href="/portal/dashboard" 
            icon={<LayoutDashboard />} 
            label="Início" 
            active={pathname === '/portal/dashboard'} 
            collapsed={collapsed}
          />
          <NavLink 
            href="/portal/os" 
            icon={<FileText />} 
            label="Ordem de Serviço" 
            active={pathname === '/portal/os'} 
            collapsed={collapsed}
          />
          <NavLink 
            href="/portal/financeiro" 
            icon={<DollarSign />} 
            label="Medição Financeira" 
            active={pathname === '/portal/financeiro'} 
            collapsed={collapsed}
          />
          <NavLink 
            href="/portal/motoristas" 
            icon={<Users />} 
            label="Motoristas" 
            active={pathname === '/portal/motoristas'} 
            collapsed={collapsed}
          />
          <NavLink 
            href="/portal/passageiros" 
            icon={<UserSquare2 />} 
            label="Passageiros" 
            active={pathname === '/portal/passageiros'} 
            collapsed={collapsed}
          />

          {!collapsed && <p className="text-[10px] font-black text-blue-400/40 uppercase tracking-[0.2em] px-5 mt-6 mb-2">Módulos</p>}
          
          <NavLink 
            href="/portal/clientes" 
            icon={<Building />} 
            label="Clientes" 
            active={pathname === '/portal/clientes'} 
            collapsed={collapsed}
          />
          <NavLink 
            href="/portal/fornecedores" 
            icon={<ShieldCheck />} 
            label="Fornecedores" 
            active={pathname === '/portal/fornecedores'} 
            collapsed={collapsed}
          />
          <NavLink 
            href="/portal/servicos" 
            icon={<Package />} 
            label="Serviços" 
            active={pathname === '/portal/servicos'} 
            collapsed={collapsed}
          />
          <NavLink 
            href="/portal/config" 
            icon={<Settings />} 
            label="Configurações" 
            active={pathname === '/portal/config'} 
            collapsed={collapsed}
          />
        </nav>

        <div className="p-4 border-t border-blue-800/50">
          <button 
            onClick={handleSignOut}
            className={`w-full flex items-center ${collapsed ? 'justify-center' : 'gap-3 px-5'} py-3 text-blue-300/80 hover:text-white hover:bg-red-500/20 rounded-xl transition-all group font-bold text-sm`}
            title={collapsed ? "Sair" : ""}
          >
            <LogOut size={18} className={`${!collapsed && 'group-hover:-translate-x-1'} transition-transform`} />
            {!collapsed && <span>Sair do Portal</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className={`flex-1 ${collapsed ? 'md:ml-20' : 'md:ml-72'} flex flex-col transition-all duration-300 ease-in-out`}>
        {/* Header */}
        <header className="h-20 bg-white border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <button className="md:hidden p-2 text-slate-500">
               <Menu size={20} />
            </button>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em] leading-none mb-1.5">
                {pathname === '/portal/dashboard' ? 'Portal Geolog' : 
                 pathname.includes('/financeiro') ? 'Gestão Financeira' : 
                 'Gestão Operacional'}
              </span>
              <div className="flex items-baseline gap-4">
                <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-none uppercase">
                  {pathname === '/portal/dashboard' ? 'Visão Geral' : 
                   pathname.includes('/os') ? 'Status Operacional' : 
                   pathname.includes('/financeiro') ? 'Medição de Faturamento' :
                   pathname.split('/').pop()?.replace('-', ' ')}
                </h1>
                <span className="hidden xl:block text-slate-400 text-sm font-bold border-l border-slate-200 pl-4">
                  {pathname.includes('/os') ? 'Acompanhamento de rotas' : 
                   pathname.includes('/financeiro') ? 'Fechamento de faturamento' :
                   'Gestão administrativa'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
             <button className="p-3 text-slate-400 hover:bg-slate-100 hover:text-[var(--color-geolog-blue)] rounded-xl relative transition-all border border-slate-100">
               <Bell size={20} />
               <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-blue-600 rounded-full border-2 border-white"></span>
             </button>
             
             <div className="flex items-center gap-5 pl-8 border-l border-slate-200">
                <div className="text-right hidden sm:block">
                   <p className="text-base font-black text-[var(--color-geolog-blue)] leading-tight">{user.email?.split('@')[0]}</p>
                   <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Administrativo</p>
                </div>
                <div className="h-12 w-12 bg-[var(--color-geolog-blue)] border-2 border-white rounded-full flex items-center justify-center text-white font-black text-sm shadow-md">
                   {user.email?.[0].toUpperCase()}
                </div>
             </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 px-12 py-10 w-full">
          {children}
        </main>
      </div>
    </div>
  );
}

function NavLink({ href, icon, label, active = false, collapsed = false }: { href: string, icon: ReactElement, label: string, active?: boolean, collapsed?: boolean }) {
  return (
    <Link 
      href={href} 
      title={collapsed ? label : ""}
      className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3 px-4'} py-3 rounded-xl transition-all font-bold text-sm relative group/link ${
        active 
          ? 'bg-white text-[var(--color-geolog-blue)] shadow-md' 
          : 'text-blue-100/60 hover:text-white hover:bg-white/10'
      }`}
    >
      <div className={`${active ? 'scale-110' : 'group-hover/link:translate-x-0.5 group-hover/link:scale-110'} transition-all duration-200`}>
        {cloneElement(icon as any, { size: 20 })}
      </div>
      {!collapsed && <span className="whitespace-nowrap">{label}</span>}
      {active && !collapsed && (
        <div className="absolute right-4 w-2 h-2 bg-[var(--color-geolog-blue)] rounded-full" />
      )}
    </Link>
  );
}
