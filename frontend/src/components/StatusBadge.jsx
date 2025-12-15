import React from 'react';

export const StatusBadge = ({ status, size = 'md' }) => {
  let colorClass = '';
  let label = '';

  switch (status) {
    case 'ok':
      colorClass = 'bg-green-500 text-white';
      label = 'HEALTHY';
      break;
    case 'degraded':
      colorClass = 'bg-orange-500 text-white';
      label = 'DEGRADED';
      break;
    case 'down':
      colorClass = 'bg-red-600 text-white';
      label = 'DOWN';
      break;
    default:
      colorClass = 'bg-gray-500 text-white';
      label = status?.toUpperCase() || 'UNKNOWN';
  }

  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-xs';

  return (
    <span className={`inline-block font-bold uppercase font-mono rounded ${colorClass} ${sizeClass}`}>
      {label}
    </span>
  );
};
