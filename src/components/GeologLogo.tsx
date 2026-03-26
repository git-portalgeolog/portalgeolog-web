import React from 'react';

interface LogoProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
}

export const GeologLogo = ({ className = "h-10 w-10", ...props }: LogoProps) => {
  return (
    <svg 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className={className}
      aria-hidden="true"
      {...props}
    >
      {/* Círculo Externo (Aura de Controle) */}
      <circle 
        cx="50" 
        cy="50" 
        r="44" 
        stroke="currentColor" 
        strokeWidth="6" 
      />
      
      {/* Linha de Base Inclinada (Rampa/Estrada) */}
      <path 
        d="M2 75 L110 50" 
        stroke="currentColor" 
        strokeWidth="6" 
        strokeLinecap="round" 
      />
      
      {/* Corpo Inferior do Veículo (Silhouette) */}
      <path 
        d="M26 68
           L34 50
           C36 45 40 43 46 43
           L82 35
           C88 33 93 38 95 45
           L98 55
           L26 68 Z" 
        fill="currentColor" 
      />
      
      {/* Cabine Superior (Geometria Executiva) */}
      <path 
        d="M48 43
           L56 30
           C58 26 64 24 70 24
           L85 22
           L88 36
           L48 43 Z" 
        fill="currentColor"
      />

      {/* Detalhe de Brilho/Janela (Opcional, mantém o estilo flat premium) */}
      <path 
        d="M60 28 L78 26 L80 34 L62 36 Z" 
        fill="rgba(255,255,255,0.2)"
      />
    </svg>
  );
};
