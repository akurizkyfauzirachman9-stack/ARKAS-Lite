
import React from 'react';
import type { Grade } from '../types';

interface ResultDisplayProps {
  grade: Grade | null;
  finalScore: number | null;
}

const ResultDisplay: React.FC<ResultDisplayProps> = ({ grade, finalScore }) => {
  if (!grade || finalScore === null) {
    return (
        <div className="w-full h-48 flex items-center justify-center bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg mt-6">
            <p className="text-gray-400 text-sm">Masukkan kedua nilai untuk melihat hasil.</p>
        </div>
    );
  }

  return (
    <div className={`w-full p-6 mt-6 rounded-lg shadow-lg transition-all duration-300 ${grade.color}`}>
      <div className="flex flex-col items-center justify-center text-center">
        <p className="text-white/80 text-sm font-medium uppercase tracking-wider mb-2">Nilai Akhir Rapor</p>
        <div className="bg-white/20 px-6 py-2 rounded-lg mb-6 backdrop-blur-sm">
            <span className={`text-4xl font-bold ${grade.textColor}`}>{finalScore}</span>
        </div>

        <div className="flex items-center justify-center gap-4">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center bg-white/30 border-2 border-white`}>
            <span className={`text-4xl font-bold ${grade.textColor}`}>{grade.letter}</span>
            </div>
            <div className="text-left">
                <p className={`text-sm opacity-80 ${grade.textColor}`}>Predikat:</p>
                <p className={`text-xl font-bold ${grade.textColor}`}>{grade.predicate}</p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ResultDisplay;
