import React from 'react';

const HistorySkeleton: React.FC = () => {
  return (
    <div className="pt-2 space-y-4 animate-pulse">
      <div className="h-3 w-12 bg-white/5 rounded-full mb-6"></div>
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="bg-white/5 border border-white/5 rounded-2xl p-4 space-y-3">
          <div className="flex justify-between items-start">
            <div className="h-4 w-2/3 bg-white/10 rounded-full"></div>
            <div className="h-3 w-12 bg-white/5 rounded-full"></div>
          </div>
          <div className="h-3 w-full bg-white/5 rounded-full"></div>
          <div className="h-3 w-4/5 bg-white/5 rounded-full"></div>
        </div>
      ))}
    </div>
  );
};

export default HistorySkeleton;
