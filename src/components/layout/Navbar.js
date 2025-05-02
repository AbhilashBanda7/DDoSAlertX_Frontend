import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function Navbar() {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Check if current path is related to analysis
  const isAnalysisRoute = location.pathname.includes('/analysis');
  
  return (
    <nav className="bg-gray-900/90 backdrop-blur-md border-b border-gray-800 text-gray-100 shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          {/* Logo and site name */}
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-blue-600 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <Link to="/" className="text-xl font-bold text-white cyber-text">
              DDoS-<span className="text-gradient">EWS</span>
            </Link>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex space-x-8">
            <Link 
              to="/" 
              className={`text-gray-300 hover:text-blue-400 font-medium transition-colors duration-200 py-1 px-2 ${
                location.pathname === '/' ? 'text-blue-400 border-b-2 border-blue-500' : ''
              }`}
            >
              Home
            </Link>
            <Link 
              to="/analysis" 
              className={`text-gray-300 hover:text-blue-400 font-medium transition-colors duration-200 py-1 px-2 ${
                isAnalysisRoute ? 'text-blue-400 border-b-2 border-blue-500' : ''
              }`}
            >
              Analysis
            </Link>
            {/* Dropdown menu for Analysis options */}
            {isAnalysisRoute && (
              <div className="flex space-x-6 ml-6">
                <Link 
                  to="/analysis/csv" 
                  className={`text-gray-300 hover:text-blue-400 font-medium transition-colors duration-200 py-1 px-2 ${
                    location.pathname === '/analysis/csv' ? 'text-blue-400 border-b border-blue-500' : ''
                  }`}
                >
                  CSV Upload
                </Link>
                <Link 
                  to="/analysis/live" 
                  className={`text-gray-300 hover:text-purple-400 font-medium transition-colors duration-200 py-1 px-2 ${
                    location.pathname === '/analysis/live' ? 'text-purple-400 border-b border-purple-500' : ''
                  }`}
                >
                  Live Capture
                </Link>
              </div>
            )}
          </div>
          
          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              type="button"
              className="text-gray-300 hover:text-white focus:outline-none p-1.5 rounded-lg hover:bg-gray-800"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
        
        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden pt-4 pb-3 border-t border-gray-700 animate-slide-up">
            <div className="flex flex-col space-y-3">
              <Link 
                to="/" 
                className={`block px-3 py-2 rounded-lg text-base font-medium ${
                  location.pathname === '/' ? 'bg-gray-800 text-blue-400' : 'text-gray-300 hover:bg-gray-800 hover:text-blue-400'
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Home
              </Link>
              <Link 
                to="/analysis" 
                className={`block px-3 py-2 rounded-lg text-base font-medium ${
                  location.pathname === '/analysis' ? 'bg-gray-800 text-blue-400' : 'text-gray-300 hover:bg-gray-800 hover:text-blue-400'
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Analysis Options
              </Link>
              <Link 
                to="/analysis/csv" 
                className={`block px-3 py-2 rounded-lg text-base font-medium ${
                  location.pathname === '/analysis/csv' ? 'bg-gray-800 text-blue-400' : 'text-gray-300 hover:bg-gray-800 hover:text-blue-400'
                } ml-4`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                CSV Analysis
              </Link>
              <Link 
                to="/analysis/live" 
                className={`block px-3 py-2 rounded-lg text-base font-medium ${
                  location.pathname === '/analysis/live' ? 'bg-gray-800 text-purple-400' : 'text-gray-300 hover:bg-gray-800 hover:text-purple-400'
                } ml-4`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Live Capture
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
} 