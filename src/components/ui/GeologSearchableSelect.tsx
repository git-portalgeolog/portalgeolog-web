'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search } from 'lucide-react';

interface Option {
  id: string;
  nome: string;
  sublabel?: string;
}

interface GeologSearchableSelectProps {
  label: string;
  options: Option[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function GeologSearchableSelect({ 
  label, 
  options, 
  value, 
  onChange, 
  disabled = false, 
  placeholder = 'Pesquisar...'
}: GeologSearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const [mounted, setMounted] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.id === value);

  useEffect(() => {
    setMounted(true);
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      const isInsideWrapper = wrapperRef.current?.contains(target);
      const isInsidePortal = (target as HTMLElement).closest?.('.geolog-select-portal');
      
      if (!isInsideWrapper && !isInsidePortal) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Atualiza a posição quando abre ou quando há redimensionamento/scroll
  useEffect(() => {
    const updateCoords = () => {
      if (triggerRef.current && isOpen) {
        const rect = triggerRef.current.getBoundingClientRect();
        setCoords({
          top: rect.bottom,
          left: rect.left,
          width: rect.width
        });
      }
    };

    if (isOpen) {
      updateCoords();
      window.addEventListener('scroll', updateCoords, true);
      window.addEventListener('resize', updateCoords);
    }

    return () => {
      window.removeEventListener('scroll', updateCoords, true);
      window.removeEventListener('resize', updateCoords);
    };
  }, [isOpen]);

  const filteredOptions = options.filter(opt => 
    opt.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (opt.sublabel && opt.sublabel.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const dropdownContent = (
    <div 
      className="geolog-select-portal fixed z-[9999] bg-white border-2 border-slate-100 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] rounded-3xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
      style={{
        top: `${coords.top + 8}px`,
        left: `${coords.left}px`,
        width: `${coords.width}px`,
      }}
    >
      <div className="p-4 border-b-2 border-slate-50 relative bg-slate-50/50">
        <Search size={18} className="absolute left-8 top-1/2 -translate-y-1/2 text-slate-400" />
        <input 
          autoFocus
          type="text"
          placeholder="Digite para filtrar..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-white rounded-xl text-sm font-bold text-slate-900 outline-none border-2 border-transparent focus:border-blue-500 shadow-sm"
        />
      </div>
      
      <div className="max-h-60 overflow-y-auto custom-scrollbar">
        {filteredOptions.length > 0 ? (
          filteredOptions.map((opt) => (
            <div 
              key={opt.id}
              onClick={() => {
                onChange(opt.id);
                setIsOpen(false);
                setSearchTerm('');
              }}
              className={`px-6 py-4 hover:bg-blue-50 cursor-pointer flex flex-col gap-0.5 transition-colors border-l-4 border-transparent ${value === opt.id ? 'bg-blue-50/50 border-blue-600' : ''}`}
            >
              <span className="font-bold text-slate-900 text-base">{opt.nome}</span>
              {opt.sublabel && (
                <span className="text-[10px] font-black text-blue-600/60 uppercase tracking-widest">{opt.sublabel}</span>
              )}
            </div>
          ))
        ) : (
          <div className="px-6 py-8 text-center text-slate-400 font-bold text-sm">
            Nenhum resultado
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-2 group relative" ref={wrapperRef}>
      <label className="text-sm font-black uppercase text-slate-500 tracking-wider ml-1">
        {label}
      </label>
      
      <div 
        ref={triggerRef}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`geolog-searchable-trigger w-full px-5 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl flex items-center justify-between cursor-pointer transition-all hover:bg-white hover:border-blue-300 ${isOpen ? 'ring-4 ring-blue-500/10 border-blue-500 bg-white' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} shadow-sm`}
      >
        <span className={`font-bold text-base ${selectedOption ? 'text-slate-900' : 'text-slate-400'}`}>
          {selectedOption ? selectedOption.nome : placeholder}
        </span>
        <ChevronDown size={18} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180 text-blue-500' : ''}`} />
      </div>

      {isOpen && !disabled && mounted && createPortal(dropdownContent, document.body)}
    </div>
  );
}

