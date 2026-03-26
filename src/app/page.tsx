'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Truck, ShieldCheck, TrendingUp, ChevronRight, LogIn } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Home() {
  const [isLoginHovered, setIsLoginHovered] = useState(false);

  return (
    <div className="min-h-screen bg-white text-[var(--color-geolog-blue)] font-sans selection:bg-[var(--color-geolog-accent)] selection:text-white">
      {/* Navbar */}
      <nav className="flex justify-between items-center py-6 px-8 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Geolog Logo" className="h-10 w-auto" />
          <span className="text-2xl font-bold tracking-tight text-[var(--color-geolog-blue)]">Portal Geolog</span>
          <span className="px-2 py-0.5 bg-amber-500 text-white text-[10px] font-bold rounded-sm uppercase tracking-widest animate-pulse">Teste</span>
        </div>
        
        <Link href="/login">
          <button 
            onMouseEnter={() => setIsLoginHovered(true)}
            onMouseLeave={() => setIsLoginHovered(false)}
            className="flex items-center gap-2 bg-[var(--color-geolog-blue)] hover:bg-[var(--color-geolog-dark)] text-white px-6 py-2.5 rounded-full font-medium transition-all duration-300 shadow-lg shadow-blue-900/10"
          >
            <span>Área do Cliente</span>
            <motion.div
              animate={{ x: isLoginHovered ? 4 : 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              <LogIn className="w-4 h-4" />
            </motion.div>
          </button>
        </Link>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-8 pt-20 pb-24 flex flex-col md:flex-row items-center gap-16">
        <div className="flex-1 space-y-8 text-left">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-[var(--color-geolog-blue)] text-sm font-bold tracking-wide uppercase border border-blue-100"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-600 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
            </span>
            SaaS Logístico On-Demand
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl md:text-7xl font-black leading-[1.1] tracking-tighter text-[var(--color-geolog-blue)]"
          >
            Inteligência e <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-sky-500">
              Controle Total
            </span><br/>
            na sua Frota.
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg md:text-xl text-slate-500 max-w-2xl leading-relaxed"
          >
            Gira a chave da digitalização. Gerencie motoristas, acompanhe ordens de serviço em tempo real e reduza custos operacionais com IA e automação preditiva.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex items-center gap-4"
          >
             <button className="flex items-center gap-2 bg-[var(--color-geolog-blue)] dark:bg-white text-white dark:text-[var(--color-geolog-blue)] px-8 py-4 rounded-full font-bold text-lg hover:scale-105 transition-transform duration-300">
                Começar Agora
                <ChevronRight className="w-5 h-5" />
             </button>
          </motion.div>
        </div>
        
        {/* Abstract 3D/Dashboard Mockup Graphic */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="flex-1 relative w-full aspect-square md:aspect-auto md:h-[600px] bg-gradient-to-tr from-[var(--color-geolog-blue)] to-[var(--color-geolog-dark)] rounded-[3rem] overflow-hidden shadow-2xl shadow-blue-900/20 border border-white/10"
        >
          {/* Glassmorphism Elements inside the dark box */}
          <div className="absolute top-1/4 left-10 right-20 h-32 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6 shadow-xl transform -rotate-6">
            <div className="flex justify-between items-center mb-4">
              <div className="h-4 w-24 bg-white/20 rounded-full"></div>
              <div className="h-6 w-16 bg-green-400/80 rounded-full"></div>
            </div>
            <div className="h-2 w-full bg-white/10 rounded-full mb-2"></div>
            <div className="h-2 w-4/5 bg-white/10 rounded-full"></div>
          </div>
          
          <div className="absolute top-1/2 left-20 right-10 h-40 bg-[var(--color-geolog-secondary)]/90 backdrop-blur-md rounded-2xl border border-blue-400/30 p-6 shadow-2xl transform rotate-3 z-10 flex flex-col justify-center">
             <div className="flex items-center gap-4 text-white">
                <div className="p-3 bg-white/20 rounded-xl"><TrendingUp className="w-8 h-8" /></div>
                <div>
                  <p className="text-sm text-cyan-200 font-medium">+24% de Lucro</p>
                  <p className="text-2xl font-bold">Custos Otimizados</p>
                </div>
             </div>
          </div>

          <div className="absolute bottom-1/4 right-5 left-32 h-24 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6 shadow-xl transform -rotate-2 flex items-center gap-4 text-white">
             <ShieldCheck className="w-8 h-8 text-blue-300" />
             <div>
                <p className="font-semibold">Docs Motoristas em Dia</p>
                <p className="text-xs text-blue-200">Verificado há 2 mins</p>
             </div>
          </div>
          
        </motion.div>
      </main>
    </div>
  );
}
