import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

export const MetricsChart = ({ data, type, height = 250 }) => {
  if (type === 'latency') {
    return (
      <div className="w-full" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorLatency" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
            <XAxis 
              dataKey="timestamp" 
              stroke="#71717a" 
              fontSize={11} 
              tickLine={false} 
              axisLine={false}
              tick={{ fill: '#71717a' }}
            />
            <YAxis 
              stroke="#71717a" 
              fontSize={11} 
              tickLine={false} 
              axisLine={false}
              tick={{ fill: '#71717a' }}
              tickFormatter={(val) => `${val}ms`} 
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#000000', 
                border: '1px solid #27272a', 
                borderRadius: '6px', 
                color: '#ffffff',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)'
              }}
              itemStyle={{ color: '#ffffff' }}
              labelStyle={{ color: '#a1a1aa', fontSize: '11px' }}
            />
            <Area 
              type="monotone" 
              dataKey="latency" 
              stroke="#8b5cf6" 
              strokeWidth={2} 
              fillOpacity={1} 
              fill="url(#colorLatency)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
          <XAxis 
            dataKey="timestamp" 
            stroke="#71717a" 
            fontSize={11} 
            tickLine={false} 
            axisLine={false}
            tick={{ fill: '#71717a' }}
          />
          <YAxis 
            stroke="#71717a" 
            fontSize={11} 
            tickLine={false} 
            axisLine={false}
            tick={{ fill: '#71717a' }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#000000', 
              border: '1px solid #27272a', 
              borderRadius: '6px', 
              color: '#ffffff',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)'
            }}
            labelStyle={{ color: '#a1a1aa', fontSize: '11px' }}
          />
          <Line 
            type="monotone" 
            dataKey="cpu" 
            stroke="#3b82f6" 
            strokeWidth={2} 
            dot={false} 
            name="CPU" 
          />
          <Line 
            type="monotone" 
            dataKey="memory" 
            stroke="#8b5cf6" 
            strokeWidth={2} 
            dot={false} 
            name="Memory" 
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
