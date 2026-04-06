'use client';

import React from 'react';
import { Plus } from 'lucide-react';

export interface PageHeaderProps {
  title: string;
  icon: React.ReactNode;
  buttonText: string;
  onButtonClick?: () => void;
  buttonIcon?: React.ReactNode;
}

export function PageHeader({ 
  title, 
  icon, 
  buttonText, 
  onButtonClick, 
  buttonIcon = <Plus size={18} /> 
}: PageHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shadow-sm">
            {icon}
          </div>
          <h1 className="text-2xl font-black text-[var(--color-geolog-blue)]">{title}</h1>
        </div>
      </div>
      <button 
        onClick={onButtonClick}
        className="flex items-center gap-2 bg-[var(--color-geolog-blue)] text-white px-5 py-2.5 rounded-xl font-bold hover:scale-105 active:scale-95 transition-all text-sm cursor-pointer shadow-lg shadow-blue-900/20"
      >
        {buttonIcon}
        {buttonText}
      </button>
    </div>
  );
}
