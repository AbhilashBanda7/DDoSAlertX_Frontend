import React from 'react';
import { Link } from 'react-router-dom';

// High-quality background image for network visualization
const bgImage = 'https://images.unsplash.com/photo-1639322537231-2f206e06af84?q=80&w=1920&auto=format&fit=crop';

// Tech icons
const icons = [
  { 
    name: 'Real-time Detection', 
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-2 w-2 text-blue-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ), 
    description: 'Advanced early warning system for threat detection before critical levels are reached' 
  },
  { 
    name: 'Interactive Visuals', 
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-indigo-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ), 
    description: 'Dynamic charts and visual analysis tools for intuitive network traffic monitoring' 
  },
  { 
    name: 'Statistical Analysis', 
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-purple-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ), 
    description: 'Comprehensive metrics and statistical models to identify anomalous network behavior' 
  },
];

// Shield SVG component for hero section
const ShieldIcon = () => (
  <svg 
    className="w-full h-full security-icon" 
    viewBox="0 0 512 512" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
  >
    <path 
      d="M256 30.4l192 85.33v128c0 119.47-96 213.33-192 256-96-42.67-192-136.53-192-256v-128L256 30.4z" 
      stroke="#3B82F6" 
      strokeWidth="20" 
      fill="#1E293B"
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
    <path 
      d="M176 233.64L232 289.64L336 185.64" 
      stroke="#60A5FA" 
      strokeWidth="20" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
    />
  </svg>
);

// Data for feature cards
const features = [
  {
    title: "Real-time Detection",
    description: "Advanced early warning system with multiple signal levels to detect threats before they reach critical severity",
    icon: (
      <svg className="w-12 h-12 text-blue-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    )
  },
  {
    title: "Comprehensive Analysis",
    description: "Interactive visualizations and statistical models for in-depth network traffic pattern identification",
    icon: (
      <svg className="w-12 h-12 text-blue-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    )
  },
  {
    title: "DDoS Prevention",
    description: "Identify and mitigate distributed denial of service attacks with predictive modeling and early signals",
    icon: (
      <svg className="w-12 h-12 text-blue-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    )
  }
];

// Badge component for EWS levels
const EwsBadge = ({ level, label }) => {
  const badges = {
    1: "ews-badge-low",
    2: "ews-badge-medium",
    3: "ews-badge-high",
    4: "ews-badge-very-high"
  };
  
  return (
    <span className={`ews-badge ${badges[level]}`}>
      {label}
    </span>
  );
};

export default function HomePage() {
  return (
    <div className="min-h-screen cyber-bg-pattern bg-cyber-darker">
      {/* Hero Section */}
      <section className="hero-container">
        <div className="absolute inset-0 cyber-grid bg-grid-pattern opacity-20"></div>
        
        {/* Animated Lines */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          {[...Array(10)].map((_, i) => (
            <div 
              key={i}
              className="absolute w-[1px] bg-blue-500/20"
              style={{
                height: Math.random() * 30 + 5 + '%',
                left: `${Math.random() * 100}%`,
                top: 0,
                opacity: Math.random() * 0.5 + 0.2
              }}
            />
          ))}
          {[...Array(10)].map((_, i) => (
            <div 
              key={i}
              className="absolute h-[1px] bg-blue-500/20"
              style={{
                width: Math.random() * 30 + 5 + '%',
                top: `${Math.random() * 80}%`,
                right: 0,
                opacity: Math.random() * 0.5 + 0.2
              }}
            />
          ))}
        </div>
        
        <div className="hero-content">
          <div className="flex flex-col md:flex-row items-center justify-center mb-12 gap-8">
            <div className="w-56 h-56 relative mb-8 md:mb-0">
              <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-2xl"></div>
              <div className="relative z-10">
                <ShieldIcon />
              </div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-14 h-14">
                <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-pulse-slow"></div>
              </div>
            </div>
            
            <div className="text-center md:text-left max-w-3xl">
              <h1 className="hero-title">
              DDoS-<span className="text-gradient">EWS</span>
              </h1>
              <p className="hero-subtitle">
                Early Warning Signal for DDoS Prevention in Network
              </p>
              <div className="mt-8 flex flex-wrap justify-center md:justify-start gap-4">
                <Link 
                  to="/analysis" 
                  className="btn-primary rounded-full shadow-blue-glow"
                >
                  Explore Options
                </Link>
                <a 
                  href="https://github.com/yourusername/ews-ddosnet" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="bg-gray-800/80 hover:bg-gray-700 text-gray-100 font-medium py-3 px-6 border border-gray-700 rounded-full transition-colors"
                >
                  View Documentation
                </a>
              </div>
            </div>
          </div>
          
          {/* EWS Levels */}
          <div className="mt-12 bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 max-w-2xl mx-auto">
            <h3 className="text-lg font-semibold text-gray-100 mb-4">Early Warning Signal Levels</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
                <EwsBadge level={1} label="EWS1" />
                <p className="mt-2 text-sm text-gray-300">Low Alert</p>
              </div>
              <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
                <EwsBadge level={2} label="EWS2" />
                <p className="mt-2 text-sm text-gray-300">Medium Alert</p>
              </div>
              <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
                <EwsBadge level={3} label="EWS3" />
                <p className="mt-2 text-sm text-gray-300">High Alert</p>
              </div>
              <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
                <EwsBadge level={4} label="EWS4" />
                <p className="mt-2 text-sm text-gray-300">Very High Alert</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Curve divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320" className="w-full h-auto">
            <path
              fill="#0F172A" 
              fillOpacity="1" 
              d="M0,224L48,229.3C96,235,192,245,288,250.7C384,256,480,256,576,234.7C672,213,768,171,864,138.7C960,107,1056,85,1152,96C1248,107,1344,149,1392,170.7L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
            ></path>
          </svg>
        </div>
      </section>
      
      {/* Features Section */}
      <section className="py-24 bg-cyber-darker relative z-10">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16 text-gray-100">
            Advanced Network <span className="text-gradient">Monitoring</span>
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 max-w-6xl mx-auto">
            {features.map((feature, index) => (
              <div 
                key={index} 
                className="card p-8 text-center transform transition-all duration-300 hover:-translate-y-2 animate-fade-in hover:shadow-blue-glow"
                style={{ animationDelay: `${index * 150}ms` }}
              >
                <div className="flex justify-center">{feature.icon}</div>
                <h3 className="text-xl font-bold mb-3 text-gray-100">{feature.title}</h3>
                <p className="text-gray-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="bg-gradient-to-r from-cyber-dark to-cyber-darker py-20 relative">
        <div className="absolute inset-0 cyber-grid bg-grid-pattern opacity-10 pointer-events-none"></div>
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6 text-gray-100">
            Ready to analyze your network traffic?
          </h2>
          <p className="text-xl max-w-3xl mx-auto mb-8 text-gray-400">
            Choose how you'd like to monitor and analyze network traffic to detect potential DDoS attacks.
          </p>
          
          <div className="flex flex-col md:flex-row gap-6 justify-center">
            <Link 
              to="/analysis/csv" 
              className="btn-primary rounded-full shadow-blue-glow px-8 py-4 flex items-center justify-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
              CSV Analysis
            </Link>
            <Link 
              to="/analysis/live" 
              className="btn-primary rounded-full shadow-purple-glow px-8 py-4 flex items-center justify-center"
              style={{ backgroundColor: 'rgba(139, 92, 246, 0.8)' }}
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Live Capture
            </Link>
          </div>
          
          <p className="text-gray-500 mt-6">
            <Link to="/analysis" className="text-blue-400 hover:underline">
              View all analysis options
            </Link>
          </p>
        </div>
      </section>

    </div>
  );
} 