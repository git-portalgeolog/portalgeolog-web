'use client';

import React, { ReactNode } from 'react';
import { Search, Loader2 } from 'lucide-react';

type ColumnRender<T> = {
  bivarianceHack: (value: unknown, item: T, index: number) => ReactNode;
}['bivarianceHack'];

export interface Column<T> {
  key: keyof T | string;
  title: string;
  render?: ColumnRender<T>;
  width?: string;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  searchTerm?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  emptyMessage?: string;
  emptyIcon?: ReactNode;
  className?: string;
  showHeader?: boolean;
  hover?: boolean;
  striped?: boolean;
  compact?: boolean;
}

export function DataTable<T extends { id?: string | number }>({
  data,
  columns,
  loading = false,
  searchTerm = '',
  onSearchChange,
  searchPlaceholder = 'Buscar...',
  emptyMessage = 'Nenhum registro encontrado.',
  emptyIcon,
  className = '',
  showHeader = true,
  hover = true,
  striped = true,
  compact = false
}: DataTableProps<T>) {
  const filteredData = searchTerm
    ? data.filter(item =>
        Object.values(item).some(value =>
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    : data;

  const getAlignmentClass = (align?: 'left' | 'center' | 'right') => {
    switch (align) {
      case 'center': return 'text-center';
      case 'right': return 'text-right';
      default: return 'text-left';
    }
  };

  const getPaddingClass = () => {
    if (compact) return 'px-4 py-2';
    return 'px-6 py-4';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="py-20 flex flex-col items-center justify-center gap-4">
          <Loader2 className="animate-spin text-blue-500" size={32} />
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {onSearchChange && (
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder={searchPlaceholder}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
          <div className="flex gap-3 text-xs font-black uppercase tracking-[0.3em] text-slate-400">
            <span>Total: {filteredData.length}</span>
            <span className="text-slate-300">|</span>
            <span>Registros</span>
          </div>
        </div>
      )}

      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/40 overflow-hidden">
        <table className="w-full text-left">
          {showHeader && (
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200">
                {columns.map((column, index) => (
                  <th
                    key={String(column.key)}
                    className={`${getPaddingClass()} text-[12px] font-black uppercase tracking-widest text-slate-600 ${getAlignmentClass(column.align)} ${column.className}`}
                    style={{ width: column.width }}
                  >
                    {column.title}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody className={striped ? 'divide-y divide-slate-100' : ''}>
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-20">
                  <div className="flex flex-col items-center justify-center gap-4 text-slate-400">
                    {emptyIcon}
                    <p className="font-bold italic">{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredData.map((item, index) => (
                <tr
                  key={item.id || index}
                  className={`${hover ? 'hover:bg-slate-50/50 transition-colors' : ''} ${striped && index % 2 === 0 ? 'bg-white' : ''}`}
                >
                  {columns.map((column) => (
                    <td
                      key={String(column.key)}
                      className={`${getPaddingClass()} ${getAlignmentClass(column.align)} ${column.className}`}
                    >
                      {column.render
                        ? column.render(item[column.key as keyof T], item, index)
                        : String(item[column.key as keyof T] ?? '')
                      }
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
