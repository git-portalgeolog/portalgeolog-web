'use client';

import React from 'react';
import { ChevronDown } from 'lucide-react';

interface Option {
  id: string;
  nome: string;
  sublabel?: string;
}

interface GeologSelectProps {
  label: string;
  options: Option[];
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  disabled?: boolean;
  placeholder?: string;
  name?: string;
}

export default function GeologSelect({ 
  label, 
  options, 
  value, 
  onChange, 
  disabled = false, 
  placeholder = 'Selecione...',
  name
}: GeologSelectProps) {
  return (
    <div className="space-y-2 focus-within:z-10 group">
      <label className="text-sm font-bold uppercase text-slate-500 tracking-widest group-focus-within:text-blue-600 transition-colors">
        {label}
      </label>
      <div className="relative">
        <select
          name={name}
          value={value}
          onChange={onChange}
          disabled={disabled}
          className="geolog-select-trigger w-full px-5 py-4 bg-slate-50/80 border border-slate-200/70 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-base cursor-pointer appearance-none disabled:opacity-50 disabled:cursor-not-allowed shadow-sm text-slate-900"
        >
          <option value="" disabled className="text-slate-400 font-bold">{placeholder}</option>
          {options.map((opt) => (
            <option key={opt.id} value={opt.id} className="font-bold py-2">
              {opt.nome} {opt.sublabel ? `(${opt.sublabel})` : ''}
            </option>
          ))}
        </select>
        <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
          <ChevronDown size={18} strokeWidth={3} />
        </div>
      </div>
    </div>
  );
}
