import React, { useState, useEffect } from 'react';

export const RateLimitWait = ({ onClose }) => {
  const [timeLeft, setTimeLeft] = useState(240); // 4 minutes in seconds (3-4 min wait)

  useEffect(() => {
    if (timeLeft <= 0) {
      onClose();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, onClose]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
      <div className="bg-black border-2 border-yellow-500/50 p-8 rounded-lg max-w-md w-full mx-4">
        <div className="text-center">
          <div className="mb-4">
            <svg 
              className="w-16 h-16 mx-auto text-yellow-500 animate-pulse" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" 
              />
            </svg>
          </div>
          
          <h2 className="text-2xl font-bold text-yellow-500 font-mono mb-2">
            Rate Limit Reached
          </h2>
          
          <p className="text-zinc-300 font-mono mb-6">
            Too many requests. Please wait before making more requests.
          </p>
          
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-6">
            <div className="text-5xl font-bold text-cyan-400 font-mono mb-2">
              {formatTime(timeLeft)}
            </div>
            <div className="text-sm text-zinc-400 font-mono">
              Time remaining
            </div>
          </div>
          
          <div className="w-full bg-zinc-800 rounded-full h-2 mb-4">
            <div 
              className="bg-cyan-400 h-2 rounded-full transition-all duration-1000"
              style={{ width: `${(timeLeft / 240) * 100}%` }}
            ></div>
          </div>
          
          <p className="text-xs text-zinc-500 font-mono">
            You can continue using the app after the timer expires
          </p>
        </div>
      </div>
    </div>
  );
};

