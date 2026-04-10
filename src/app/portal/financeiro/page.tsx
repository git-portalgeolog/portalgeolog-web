'use client';

import React, { useMemo, useState } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  Download, 
  CheckCircle2, 
  AlertCircle
} from 'lucide-react';
import { useData } from '@/context/DataContext';
import { useAuth } from '@/context/AuthContext';
import { DataTable } from '@/components/ui/DataTable';

export default function MedicaoFinanceiraPage() {
  const { osList, clientes, updateOSStatus } = useData();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

  // Simulating Admin check (since real role isn't in AuthContext yet)
  const isAdmin = user?.email?.includes('admin') || true; // Force true for demo or if admin email is used

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const filteredData = useMemo(() => {
    return osList.filter(item => {
      const matchMonth = item.data.startsWith(selectedMonth);
      const clienteNome = clientes.find(c => c.id === item.clienteId)?.nome || '';
      const matchSearch = searchTerm === '' || 
        item.os.includes(searchTerm) || 
        clienteNome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.motorista.toLowerCase().includes(searchTerm.toLowerCase());
      return matchMonth && matchSearch;
    });
  }, [osList, selectedMonth, searchTerm, clientes]);

  const totals = useMemo(() => {
    return filteredData.reduce((acc, current) => {
      acc.bruto += current.valorBruto;
      acc.custo += current.custo;
      acc.imposto += current.imposto;
      acc.lucro += current.lucro;
      return acc;
    }, { bruto: 0, custo: 0, imposto: 0, lucro: 0 });
  }, [filteredData]);

  const handleDarBaixa = (id: string) => {
    updateOSStatus(id, { financeiro: 'Faturado' });
  };

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center text-red-500">
          <AlertCircle size={40} />
        </div>
        <h2 className="text-2xl font-black text-slate-800">Acesso Restrito</h2>
        <p className="text-slate-500 max-w-md">Esta página é exclusiva para usuários com perfil administrativo/financeiro.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex justify-end items-center gap-3">
        <input 
          type="month" 
          className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
        />
        <button className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-emerald-900/10 hover:bg-emerald-700 transition-all text-sm">
          <Download size={18} />
          Exportar CSV
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <FinanceStatCard 
          label="Total faturamento mensal" 
          value={formatCurrency(totals.bruto)} 
          subValue={`Impostos retidos: ${formatCurrency(totals.imposto)}`}
          icon={<DollarSign className="text-blue-600" size={28} />}
          color="blue"
        />
        <FinanceStatCard 
          label="Repasse a motoristas" 
          value={formatCurrency(totals.custo)} 
          subValue={`${filteredData.length} ordens de serviço executadas`}
          icon={<AlertCircle className="text-orange-600" size={28} />}
          color="orange"
        />
        <FinanceStatCard 
          label="Lucro líquido disponível" 
          value={formatCurrency(totals.lucro)} 
          subValue={`Margem operacional de ${((totals.lucro / (totals.bruto || 1)) * 100).toFixed(1)}%`}
          icon={<TrendingUp className="text-emerald-600" size={28} />}
          color="emerald"
        />
      </div>

      {/* Finance Table */}
      <DataTable
        data={filteredData}
        columns={[
          {
            key: 'documento',
            title: 'Documento / Data',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            render: (_: any, item: any) => (
              <div className="flex flex-col gap-1">
                <span className="text-base font-bold text-slate-800 leading-none">#{item.os}</span>
                <span className="text-xs text-slate-400 font-semibold">{new Date(item.data).toLocaleDateString('pt-BR')}</span>
              </div>
            )
          },
          {
            key: 'cliente',
            title: 'Cliente',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            render: (_: unknown, item: any) => {
              const clienteNome = clientes.find(c => c.id === item.clienteId)?.nome || 'N/A';
              return (
                <span className="text-base font-semibold text-slate-700">{clienteNome}</span>
              );
            }
          },
          {
            key: 'trecho',
            title: 'Itinerário / KM',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            render: (_: any, item: any) => (
              <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-800">{item.trecho}</span>
                {item.distancia && (
                  <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{item.distancia} KM</span>
                )}
              </div>
            )
          },
          {
            key: 'valorBruto',
            title: 'Faturamento (R$)',
            align: 'right',
            render: (value: unknown) => (
              <span className="text-right font-black text-slate-900 tabular-nums text-lg">
                {formatCurrency(value as number)}
              </span>
            )
          },
          {
            key: 'imposto',
            title: 'Deduções (12%)',
            align: 'right',
            render: (value: unknown) => (
              <span className="text-right font-bold text-red-500 tabular-nums text-sm">
                -{formatCurrency(value as number)}
              </span>
            )
          },
          {
            key: 'custo',
            title: 'Repasse (R$)',
            align: 'right',
            render: (value: unknown) => (
              <span className="text-right font-bold text-slate-600 tabular-nums text-sm">
                {formatCurrency(value as number)}
              </span>
            )
          },
          {
            key: 'lucro',
            title: 'Lucro Líquido',
            align: 'right',
            render: (value: unknown) => (
              <span className={`text-right text-lg font-black tabular-nums ${(value as number) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {formatCurrency(value as number)}
              </span>
            )
          },
          {
            key: 'status',
            title: 'Status',
            align: 'center',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            render: (_: any, item: any) => (
              <div className="flex justify-center">
                {item.status.financeiro === 'Faturado' ? (
                  <span className="inline-flex items-center gap-2 px-5 py-2 bg-emerald-100 text-emerald-700 rounded-full text-xs font-black uppercase shadow-sm border border-emerald-200">
                    <CheckCircle2 size={16} />
                    Faturado
                  </span>
                ) : (
                  <button 
                    onClick={() => handleDarBaixa(item.id)}
                    className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-black uppercase hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-95"
                  >
                    Dar Baixa
                  </button>
                )}
              </div>
            )
          }
        ]}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Buscar por OS, Cliente ou Motorista..."
        emptyMessage="Nenhuma transação financeira encontrada."
        emptyIcon={<DollarSign size={48} />}
      />
    </div>
  );
}

function FinanceStatCard({ label, value, subValue, icon, color }: { label: string, value: string, subValue: string, icon: React.ReactNode, color: string }) {
  const bgColors: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-100',
    orange: 'bg-orange-50 border-orange-100',
    emerald: 'bg-emerald-50 border-emerald-100',
  };

  return (
    <div className={`p-8 rounded-[2.5rem] border bg-white shadow-sm flex items-start gap-6 hover:shadow-xl hover:scale-[1.02] transition-all`}>
      <div className={`p-5 rounded-2xl ${bgColors[color]} shadow-inner`}>
        {icon}
      </div>
      <div>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em] mb-2">{label}</p>
        <h3 className="text-3xl font-black text-slate-800 tabular-nums tracking-tighter">{value}</h3>
        <p className="text-sm font-semibold text-slate-600 mt-2">{subValue}</p>
      </div>
    </div>
  );
}
