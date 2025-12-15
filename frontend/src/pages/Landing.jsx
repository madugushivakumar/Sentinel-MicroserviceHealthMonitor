import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export const Landing = () => {
  const navigate = useNavigate();
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  return (
    <div className="min-h-screen bg-black text-zinc-300 font-sans selection:bg-white selection:text-black">
      {/* Technical Grid Overlay */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-20" 
        style={{ 
          backgroundImage: 'linear-gradient(#27272a 1px, transparent 1px), linear-gradient(90deg, #27272a 1px, transparent 1px)', 
          backgroundSize: '40px 40px' 
        }}
      />

      {/* Navbar */}
      <nav className="fixed w-full z-50 top-0 left-0 bg-black/90 border-b border-zinc-800 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-white flex items-center justify-center">
                <div className="w-2 h-2 bg-black"></div>
              </div>
              <span className="font-bold text-xl text-white tracking-tight font-mono">SENTINEL</span>
            </div>
            
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-xs font-bold font-mono text-zinc-500 hover:text-white uppercase tracking-widest transition-colors">Modules</a>
              <a href="#npm" className="text-xs font-bold font-mono text-zinc-500 hover:text-white uppercase tracking-widest transition-colors">Documentation</a>
              <div className="h-4 w-px bg-zinc-800"></div>
              <button 
                onClick={() => setIsLoginOpen(true)}
                className="text-xs font-bold font-mono text-white hover:text-zinc-300 uppercase tracking-widest transition-colors"
              >
                Access_Terminal
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="pt-32 pb-20 border-b border-zinc-800 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-16 items-center relative z-10">
          
          {/* Text Content */}
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 border border-zinc-700 bg-zinc-900/50 text-white text-[10px] font-mono font-bold uppercase tracking-widest">
              <span className="w-1.5 h-1.5 bg-white animate-pulse"></span>
              System Status: ONLINE
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold text-white tracking-tighter leading-none font-mono">
              TOTAL<br/>
              SYSTEM<br/>
              <span className="text-zinc-500">AWARENESS</span>
            </h1>
            
            <p className="text-lg text-zinc-500 font-mono border-l-2 border-zinc-800 pl-6 max-w-md">
              &gt; INITIALIZING MONITORING PROTOCOLS<br/>
              &gt; DETECTING MICROSERVICES...<br/>
              &gt; INSTRUMENTATION COMPLETE.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="px-8 py-4 bg-white hover:bg-zinc-200 text-black font-mono font-bold text-sm transition-all flex items-center justify-center gap-2 group"
              >
                INITIATE_DASHBOARD
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <button 
                onClick={() => navigate('/projects')}
                className="px-8 py-4 bg-transparent border border-zinc-700 hover:border-white text-white font-mono font-bold text-sm transition-colors flex items-center justify-center gap-2"
              >
                VIEW_DOCS
              </button>
            </div>
          </div>

          {/* ANIMATED SCANNER */}
          <div className="relative h-[400px] w-full border border-zinc-800 bg-black/50 backdrop-blur-sm overflow-hidden flex flex-col">
            {/* Header */}
            <div className="h-8 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between px-3">
               <span className="text-[10px] font-mono text-zinc-500">LIVE_FEED :: 192.168.0.1</span>
               <div className="flex gap-1">
                 <div className="w-2 h-2 bg-zinc-700"></div>
                 <div className="w-2 h-2 bg-zinc-700"></div>
                 <div className="w-2 h-2 bg-white"></div>
               </div>
            </div>
            
            {/* Grid Content */}
            <div className="flex-1 p-6 relative">
               <div className="grid grid-cols-4 gap-2 h-full opacity-50">
                 {Array.from({length: 16}).map((_, i) => (
                   <div key={i} className="border border-zinc-800 bg-zinc-900/20 relative overflow-hidden">
                     {Math.random() > 0.7 && <div className="absolute inset-0 bg-white/10 animate-pulse"></div>}
                   </div>
                 ))}
               </div>

               {/* Center HUD */}
               <div className="absolute inset-0 flex items-center justify-center">
                 <div className="w-40 h-40 border-2 border-white/30 rounded-full flex items-center justify-center relative animate-pulse-ring">
                   <div className="w-32 h-32 border border-white/20 rounded-full"></div>
                 </div>
                 <div className="absolute text-black font-mono font-bold text-xs tracking-widest bg-white px-2 border border-white">
                   SCANNING
                 </div>
               </div>
            </div>

            {/* Footer Logs */}
            <div className="h-24 border-t border-zinc-800 bg-black p-3 font-mono text-[10px] text-zinc-500 overflow-hidden leading-relaxed">
               <p>&gt; [10:42:01] CONNECTED TO CLUSTER_MAIN</p>
               <p>&gt; [10:42:02] FETCHING METRICS... OK (23ms)</p>
               <p className="text-white">&gt; [10:42:02] OPTIMIZATION ON NODE_4</p>
               <p>&gt; [10:42:03] RE-ROUTING TRAFFIC...</p>
               <p>&gt; [10:42:04] SYSTEM STABILIZED.</p>
            </div>
          </div>

        </div>
      </div>

      {/* Features Grid */}
      <div id="features" className="py-24 border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-px bg-zinc-800 border border-zinc-800">
             {[
               { 
                 icon: (
                   <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                   </svg>
                 ), 
                 title: 'REAL-TIME_MONITORING', 
                 desc: 'Sub-second polling intervals for instant status updates.' 
               },
               { 
                 icon: (
                   <div className="text-4xl font-mono text-zinc-500">&gt;_</div>
                 ), 
                 title: 'NPM_INTEGRATION', 
                 desc: 'Single line of code to expose all necessary endpoints.' 
               },
               { 
                 icon: (
                   <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                   </svg>
                 ), 
                 title: 'SLA_ENFORCEMENT', 
                 desc: 'Automated uptime tracking and error budget calculation.' 
               }
             ].map((feat, i) => (
               <div key={i} className="bg-black p-10 group hover:bg-zinc-900/50 transition-colors">
                 <div className="mb-6 text-zinc-500 group-hover:text-white transition-colors">
                   {feat.icon}
                 </div>
                 <h3 className="text-lg font-bold text-white font-mono mb-3">{feat.title}</h3>
                 <p className="text-sm text-zinc-500 leading-relaxed font-mono">{feat.desc}</p>
               </div>
             ))}
          </div>
        </div>
      </div>

      {/* NPM Section */}
      <div id="npm" className="py-24 bg-zinc-900/30">
        <div className="max-w-5xl mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold text-white font-mono mb-8">DEPLOYMENT_PROTOCOL</h2>
            
            <div className="bg-black border border-zinc-800 p-8 max-w-2xl mx-auto text-left shadow-2xl">
               <div className="flex items-center gap-2 mb-6 border-b border-zinc-900 pb-4">
                  <div className="w-3 h-3 bg-white"></div>
                  <span className="text-xs font-mono text-zinc-500">BASH</span>
               </div>
               <code className="text-sm font-mono text-white block mb-6">
                 <span className="text-zinc-500">$</span> npm install microservice-health-endpoint
               </code>
               <div className="flex items-center gap-2 mb-6 border-b border-zinc-900 pb-4">
                  <div className="w-3 h-3 bg-zinc-500"></div>
                  <span className="text-xs font-mono text-zinc-500">JAVASCRIPT</span>
               </div>
               <code className="text-sm font-mono text-zinc-400 block">
                 const health = require(<span className="text-white">"microservice-health-endpoint"</span>);<br/>
                 app.use(health()); <span className="text-zinc-600">// AUTO-INJECT /health</span>
               </code>
            </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-12 border-t border-zinc-800 bg-black text-center font-mono text-[10px] text-zinc-600">
        <p>SENTINEL SYSTEMS INC // EST. 2024</p>
        <p className="mt-2">ALL SYSTEMS OPERATIONAL</p>
      </footer>

      {/* Login Modal */}
      {isLoginOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-sm">
           <div className="bg-black border border-zinc-700 w-full max-w-md p-1">
              <div className="border border-zinc-800 p-8 bg-zinc-950">
                <div className="flex justify-between items-center mb-8">
                   <h2 className="text-xl font-bold text-white font-mono uppercase">System Login</h2>
                   <button onClick={() => setIsLoginOpen(false)} className="text-zinc-500 hover:text-white">
                     <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                     </svg>
                   </button>
                </div>
                
                <div className="space-y-6">
                   <div>
                     <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-2 font-mono">Operator ID</label>
                     <input type="email" className="w-full bg-zinc-900 border border-zinc-800 px-4 py-3 text-white focus:border-white focus:outline-none font-mono text-sm" />
                   </div>
                   <div>
                     <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-2 font-mono">Access Key</label>
                     <input type="password" className="w-full bg-zinc-900 border border-zinc-800 px-4 py-3 text-white focus:border-white focus:outline-none font-mono text-sm" />
                   </div>
                   
                   <button className="w-full bg-white hover:bg-zinc-200 text-black font-bold font-mono py-3 uppercase tracking-widest transition-all">
                     Authenticate
                   </button>
                </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
