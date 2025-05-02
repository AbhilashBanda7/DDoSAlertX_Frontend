import React from 'react';
import { Link } from 'react-router-dom';

export default function AnalysisOptionsPage() {
  return (
    <div className="min-h-screen cyber-bg-pattern bg-cyber-darker">
      <div className="absolute inset-0 cyber-grid bg-grid-pattern opacity-20"></div>
      
      <div className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Choose Analysis <span className="text-gradient">Method</span>
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Select how you'd like to analyze network traffic data
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* CSV Upload Option */}
          <div className="card p-8 text-center transform transition-all duration-300 hover:-translate-y-2 hover:shadow-blue-glow">
            <div className="w-20 h-20 bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-4 text-gray-100">CSV Upload</h2>
            <p className="text-gray-400 mb-8">
              Upload and analyze pre-recorded network traffic data from a CSV file.
              Ideal for offline analysis and historical data review.
            </p>
            <Link 
              to="/analysis/csv" 
              className="btn-primary rounded-full px-8 py-3 shadow-blue-glow block"
            >
              CSV Analysis
            </Link>
          </div>
          
          {/* Live Capture Option */}
          <div className="card p-8 text-center transform transition-all duration-300 hover:-translate-y-2 hover:shadow-blue-glow">
            <div className="w-20 h-20 bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-4 text-gray-100">Live Capture</h2>
            <p className="text-gray-400 mb-8">
              Capture and analyze network traffic in real-time.
              Perfect for monitoring active networks and instant threat detection.
            </p>
            <Link 
              to="/analysis/live" 
              className="btn-primary rounded-full px-8 py-3 shadow-purple-glow block"
              style={{ backgroundColor: 'rgba(139, 92, 246, 0.8)' }}
            >
              Live Capture
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 