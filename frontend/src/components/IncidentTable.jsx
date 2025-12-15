import React from 'react';

export const IncidentTable = ({ incidents, onClose }) => {
  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-800 bg-black">
      <table className="min-w-full divide-y divide-zinc-800">
        <thead className="bg-black">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider font-mono">SEVERITY</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider font-mono">SERVICE</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider font-mono">TYPE</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider font-mono">DURATION</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider font-mono">MESSAGE</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider font-mono">STATUS</th>
            {onClose && <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider font-mono">ACTIONS</th>}
          </tr>
        </thead>
        <tbody className="bg-black divide-y divide-zinc-800">
          {incidents.map((incident, index) => {
            const startedAt = new Date(incident.startedAt);
            const resolvedAt = incident.resolvedAt ? new Date(incident.resolvedAt) : null;
            const duration = resolvedAt 
              ? Math.floor((resolvedAt.getTime() - startedAt.getTime()) / 60000)
              : Math.floor((Date.now() - startedAt.getTime()) / 60000);
              
            return (
              <tr 
                key={incident.id} 
                className="bg-black hover:bg-zinc-900"
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-bold uppercase font-mono
                    ${incident.severity === 'critical' 
                      ? 'bg-red-600 text-white' 
                      : incident.severity === 'warning' 
                      ? 'bg-yellow-500 text-black' 
                      : 'bg-zinc-600 text-white'}`}>
                    {incident.severity === 'critical' ? 'CRITICAL' : incident.severity.toUpperCase()}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white font-mono">{incident.serviceName || 'Unknown'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-mono capitalize">{incident.type ? incident.type.replace('_', ' ') : 'Down'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-mono">{duration} min</td>
                <td className="px-6 py-4 text-sm text-white font-mono max-w-xs truncate">{incident.description || incident.message || 'Service unreachable. Response code: N/A'}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                   {incident.resolved ? (
                     <span className="text-green-400 flex items-center text-sm font-medium font-mono">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Resolved
                     </span>
                   ) : (
                     <span className="text-white flex items-center text-sm font-medium font-mono">
                       <span className="relative flex h-2 w-2 mr-2">
                          <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                        </span>
                        Active
                     </span>
                   )}
                </td>
                {onClose && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {!incident.resolved && (
                      <button
                        onClick={() => onClose(incident.id)}
                        className="text-white hover:text-zinc-300 font-semibold underline font-mono"
                      >
                        Close
                      </button>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
          {incidents.length === 0 && (
            <tr>
              <td colSpan={onClose ? 7 : 6} className="px-6 py-10 text-center text-sm text-zinc-400 font-mono">
                No recent incidents recorded.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
