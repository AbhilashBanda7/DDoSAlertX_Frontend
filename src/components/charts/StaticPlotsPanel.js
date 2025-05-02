import React, { useState, useMemo } from 'react';

// Get API URL from environment variables
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export default function StaticPlotsPanel({ plots, sessionId }) {
  const [selectedPlot, setSelectedPlot] = useState(null);
  const [currentCategory, setCurrentCategory] = useState('all');

  // Extract session ID from the first plot URL if not provided directly
  const extractedSessionId = useMemo(() => {
    if (sessionId) return sessionId;
    if (plots && plots.length > 0) {
      const firstPlot = plots[0];
      const matches = firstPlot.match(/\/plots\/([^/]+)/);
      return matches ? matches[1] : null;
    }
    return null;
  }, [plots, sessionId]);

  const openPlotModal = (url) => {
    setSelectedPlot(url);
  };

  const closePlotModal = () => {
    setSelectedPlot(null);
  };
  
  // Categorize plots based on their filenames
  const categorizedPlots = useMemo(() => {
    const categories = {
      all: plots,
      flow: plots.filter(url => 
        url.includes('flow') || 
        url.includes('bytes') || 
        url.includes('packet')),
      alerts: plots.filter(url => 
        url.includes('alert') || 
        url.includes('early_warning') || 
        url.includes('ews') ||
        url.includes('level')),
      derivatives: plots.filter(url => 
        url.includes('dp_dt') || 
        url.includes('db_dt') || 
        url.includes('d2p') || 
        url.includes('d2b')),
      analysis: plots.filter(url => 
        url.includes('benign') || 
        url.includes('confusion') || 
        url.includes('peak') ||
        url.includes('ews_confusion'))
    };
    
    return categories;
  }, [plots]);
  
  // Get current plots to display
  const displayedPlots = currentCategory === 'all' 
    ? plots 
    : categorizedPlots[currentCategory] || plots;

  // Download all plots as zip
  const downloadAllPlots = () => {
    if (!extractedSessionId) return;
    window.location.href = `${API_URL}/download-plots/${extractedSessionId}`;
  };

  return (
    <>
      <h2 className="text-xl font-semibold mt-8 border-b pb-2">Static Plots (Original)</h2>
      
      <div className="flex flex-wrap justify-between gap-2 mb-4 mt-2">
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={() => setCurrentCategory('all')}
            className={`px-3 py-1 rounded text-sm ${currentCategory === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800'}`}
          >
            All Plots ({plots.length})
          </button>
          <button 
            onClick={() => setCurrentCategory('flow')}
            className={`px-3 py-1 rounded text-sm ${currentCategory === 'flow' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800'}`}
          >
            Flow Metrics
          </button>
          <button 
            onClick={() => setCurrentCategory('alerts')}
            className={`px-3 py-1 rounded text-sm ${currentCategory === 'alerts' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800'}`}
          >
            EWS & Alerts
          </button>
          <button 
            onClick={() => setCurrentCategory('derivatives')}
            className={`px-3 py-1 rounded text-sm ${currentCategory === 'derivatives' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800'}`}
          >
            Derivatives
          </button>
          <button 
            onClick={() => setCurrentCategory('analysis')}
            className={`px-3 py-1 rounded text-sm ${currentCategory === 'analysis' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800'}`}
          >
            Analysis
          </button>
        </div>
        
        {extractedSessionId && (
          <button
            onClick={downloadAllPlots}
            className="px-3 py-1 rounded text-sm bg-green-600 text-white hover:bg-green-700 flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download All Plots
          </button>
        )}
      </div>
      
      <p className="text-sm text-gray-500 mt-2 mb-4">
        Click on any plot to view it in a larger size. 
        Viewing: <span className="font-semibold">{displayedPlots.length}</span> plots.
      </p>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {displayedPlots.map((url, i) => (
          <div 
            key={i} 
            className="border rounded-lg p-2 bg-white shadow-sm hover:shadow-md transition cursor-pointer"
            onClick={() => openPlotModal(url)}
          >
            <div className="text-xs text-gray-500 mb-1 truncate">
              {url.split('/').pop().replace('.png', '').replace(/_/g, ' ')}
            </div>
            <img
              src={url}
              alt={`Plot ${i}`}
              className="w-full rounded shadow"
              onError={e => e.currentTarget.src = '/placeholder.png'}
            />
          </div>
        ))}
      </div>

      {/* Modal for enlarged plot viewing */}
      {selectedPlot && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" onClick={closePlotModal}>
          <div className="relative bg-white rounded-lg p-4 max-w-4xl max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <button 
              className="absolute top-3 right-3 bg-red-600 hover:bg-red-700 text-white rounded-full w-10 h-10 flex items-center justify-center shadow-lg z-10"
              onClick={closePlotModal}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="text-lg font-medium mb-2">
              {selectedPlot.split('/').pop().replace('.png', '').replace(/_/g, ' ')}
            </div>
            <img 
              src={selectedPlot} 
              alt="Enlarged plot" 
              className="max-w-full max-h-[80vh] object-contain"
              onError={e => e.currentTarget.src = '/placeholder.png'}
            />
          </div>
        </div>
      )}
    </>
  );
} 