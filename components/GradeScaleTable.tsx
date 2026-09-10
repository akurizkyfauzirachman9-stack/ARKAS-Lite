
import React from 'react';
import type { GradeScale } from '../types';

const gradeScaleData: GradeScale[] = [
  { range: '91 - 100', letter: 'A', predicate: 'Sangat Baik' },
  { range: '81 - 90', letter: 'B', predicate: 'Baik' },
  { range: '71 - 80', letter: 'C', predicate: 'Cukup' },
  { range: '61 - 70', letter: 'D', predicate: 'Kurang' },
  { range: '0 - 60', letter: 'E', predicate: 'Sangat Kurang' },
];

const GradeScaleTable: React.FC = () => {
  return (
    <div className="w-full max-w-md mt-10">
      <h3 className="text-xl font-semibold text-gray-700 mb-4 text-center">Skala Penilaian</h3>
      <div className="overflow-hidden border border-gray-200 rounded-lg shadow-sm">
        <table className="min-w-full bg-white">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rentang Nilai
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nilai Huruf
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Predikat
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {gradeScaleData.map((item, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.range}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.letter}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.predicate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default GradeScaleTable;
