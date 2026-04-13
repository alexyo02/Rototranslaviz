import React from 'react';
import { Matrix4 } from 'three';

interface MatrixDisplayProps {
  matrix: Matrix4;
  title?: string;
  className?: string;
  highlight?: boolean;
}

export const MatrixDisplay: React.FC<MatrixDisplayProps> = ({ matrix, title, className = "", highlight = false }) => {
  const elements = matrix.elements; 
  // Three.js stores matrices in column-major order.
  // We need to read them as rows for display: [0, 4, 8, 12], [1, 5, 9, 13], etc.
  
  const rows = [0, 1, 2, 3].map(row => 
    [0, 1, 2, 3].map(col => elements[row + col * 4])
  );

  const formatValue = (val: number) => {
    // Avoid -0 or -0.00
    if (Math.abs(val) < 0.005) return "0.00";
    return val.toFixed(2);
  };

  return (
    <div className={`p-3 bg-slate-800 rounded-lg border ${highlight ? 'border-blue-500 shadow-lg shadow-blue-500/20' : 'border-slate-700'} ${className}`}>
      {title && <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 text-center">{title}</h4>}
      <div className="grid grid-cols-4 gap-1 font-mono text-xs sm:text-sm">
        {rows.map((row, rIndex) => (
          <React.Fragment key={rIndex}>
            {row.map((val, cIndex) => (
              <div 
                key={`${rIndex}-${cIndex}`} 
                className={`
                  flex items-center justify-center p-1 rounded
                  ${rIndex < 3 && cIndex < 3 ? 'bg-slate-700/50 text-slate-200' : ''} 
                  ${rIndex < 3 && cIndex === 3 ? 'bg-indigo-900/30 text-indigo-300' : ''}
                  ${rIndex === 3 ? 'bg-slate-900/50 text-slate-500' : ''}
                `}
              >
                {formatValue(val)}
              </div>
            ))}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};