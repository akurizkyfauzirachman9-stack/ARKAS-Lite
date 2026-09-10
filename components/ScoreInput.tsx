
import React from 'react';

interface ScoreInputProps {
  label: string;
  score: string;
  onScoreChange: (value: string) => void;
  placeholder?: string;
}

const ScoreInput: React.FC<ScoreInputProps> = ({ label, score, onScoreChange, placeholder }) => {
  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <input
        type="number"
        min="0"
        max="100"
        value={score}
        onChange={(e) => onScoreChange(e.target.value)}
        placeholder={placeholder || "0-100"}
        className="w-full px-4 py-3 text-lg text-center text-gray-900 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow placeholder-gray-400"
        autoComplete="off"
      />
    </div>
  );
};

export default ScoreInput;
