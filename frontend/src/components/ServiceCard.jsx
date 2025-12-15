import React from 'react';
import { StatusBadge } from './StatusBadge';

export const ServiceCard = ({ service, onClick, onDelete }) => {
  return (
    <div 
      onClick={() => onClick(service.id)}
      className="bg-black border border-zinc-800 rounded-lg p-5 hover:border-zinc-600 transition-colors cursor-pointer group relative"
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white group-hover:text-indigo-400 transition-colors font-mono">{service.name}</h3>
          <p className="text-sm text-zinc-500 font-mono mt-1">{service.group || 'Default'}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={service.status} />
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(service.id, service.name);
              }}
              className="opacity-0 group-hover:opacity-100 transition-opacity bg-red-600 hover:bg-red-700 text-white p-1.5 rounded z-10"
              title="Delete service"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 border-t border-zinc-800 pt-4">
        <div>
          <p className="text-xs text-white uppercase font-semibold font-mono mb-1">LATENCY</p>
          <p className={`text-lg font-mono font-medium ${service.latency > 500 ? 'text-amber-400' : 'text-white'}`}>
            {service.latency || 0}ms
          </p>
        </div>
        <div>
          <p className="text-xs text-white uppercase font-semibold font-mono mb-1">UPTIME</p>
          <p className={`text-lg font-mono font-medium ${(service.uptime || 0) < 99.9 ? 'text-rose-400' : 'text-emerald-400'}`}>
            {(service.uptime || 0).toFixed(2)}%
          </p>
        </div>
        <div>
          <p className="text-xs text-white uppercase font-semibold font-mono mb-1">CPU</p>
          <p className="text-lg font-mono font-medium text-white">
            {service.cpu || 0}%
          </p>
        </div>
      </div>
    </div>
  );
};
