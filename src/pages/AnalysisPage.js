import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import UploadForm from '../components/forms/UploadForm';
import TablesPanel from '../components/tables/TablesPanel';
import DataTable from '../components/tables/DataTable';
import ChartGrid from '../components/charts/ChartGrid';
import StaticPlotsPanel from '../components/charts/StaticPlotsPanel';
import { useLocation } from 'react-router-dom';

// Replace hardcoded URLs with environment variable
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export default function AnalysisPage() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [showStaticPlots, setShowStaticPlots] = useState(false);
  const [showWorkingTables, setShowWorkingTables] = useState(false);
  const [isAnalysisRunning, setIsAnalysisRunning] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [autoDownloadPlots, setAutoDownloadPlots] = useState(true);
  const location = useLocation();

  // Define table names for the working data
  const workingTables = [
    { title: "Cleaned CSV", description: "Raw data after initial cleaning" },
    { title: "Grouped by Timestamps", description: "Data grouped by timestamp values" },
    { title: "Processed Metrics", description: "Calculated attack metrics and EWS levels" },
    { title: "Alert Statistics", description: "Early warning signals statistics" }
  ];

  // Start/stop sound based on location
  useEffect(() => {
    // When component mounts on the analysis page, ensure sound is stopped
    document.dispatchEvent(new CustomEvent('stopTickingSound'));
    
    // When leaving the analysis page, stop any sound
    return () => {
      document.dispatchEvent(new CustomEvent('stopTickingSound'));
    };
  }, []);
  
  // Listen for animation complete
  useEffect(() => {
    const handleAnimationComplete = (event) => {
      if (event.detail?.chartId === 'flow-with-ews') {
        // Stop ticking and play completion sound
        document.dispatchEvent(new CustomEvent('stopTickingSound'));
        document.dispatchEvent(new CustomEvent('playPlottingEndedSound'));
        setIsAnalysisRunning(false);
      }
    };
    
    document.addEventListener('animationComplete', handleAnimationComplete);
    
    return () => {
      document.removeEventListener('animationComplete', handleAnimationComplete);
    };
  }, []);

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setIsAnalysisRunning(true);
    setResults(null); // Clear previous results
    
    // Start ticking sound for processing
    document.dispatchEvent(new CustomEvent('startTickingSound'));

    const fd = new FormData();
    fd.append('file', file);

    try {
      // Add a timestamp to the request URL to prevent caching
      const { data } = await axios.post(
        `${API_URL}/upload?t=${Date.now()}`,
        fd,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      // Store session ID
      setSessionId(data.session_id);
      
      // Ensure unique URLs for each plot to avoid caching issues
      const timestamp = Date.now();
      setResults({
        plots: data.plots.map(u => `${API_URL}${u}?t=${timestamp}`),
        cleanedDf: data.cleaned_df,
        plotData: data.plot_data
      });
      
      // Dispatch plotting started event only after we have data to plot
      // This ensures the notification appears when animation starts, not during upload
      document.dispatchEvent(new CustomEvent('plottingStarted'));
      document.dispatchEvent(new CustomEvent('playPlottingStartedSound'));
      
      // Auto-download plots if enabled
      if (autoDownloadPlots && data.plots && data.plots.length > 0) {
        // Small delay to ensure plots are ready
        setTimeout(() => {
          window.location.href = `${API_URL}/download-plots/${data.session_id}`;
        }, 1000);
      }
      
    } catch (err) {
      console.error(err);
      alert('Upload failed');
      // Stop sound on error
      document.dispatchEvent(new CustomEvent('stopTickingSound'));
      setIsAnalysisRunning(false);
    }

    setLoading(false);
  };

  // Stop ongoing analysis
  const stopAnalysis = () => {
    if (!isAnalysisRunning) return;
    
    // Stop all animations and sounds
    document.dispatchEvent(new CustomEvent('stopTickingSound'));
    document.dispatchEvent(new CustomEvent('playPlottingEndedSound'));
    document.dispatchEvent(new CustomEvent('stopAllAnimations')); // New event for stopping animations
    
    // Reset analysis state
    setIsAnalysisRunning(false);
    
    // Display notification
    document.dispatchEvent(new CustomEvent('plottingEnded'));
  };

  // Toggle static plots display
  const toggleStaticPlots = () => {
    setShowStaticPlots(!showStaticPlots);
  };

  // Toggle working tables display
  const toggleWorkingTables = () => {
    setShowWorkingTables(!showWorkingTables);
  };
  
  // Toggle auto-download plots setting
  const toggleAutoDownloadPlots = () => {
    setAutoDownloadPlots(!autoDownloadPlots);
  };
  
  // Download captured data
  const downloadCaptureData = () => {
    if (!sessionId) return;
    window.location.href = `${API_URL}/download-data/${sessionId}`;
  };

  return (
    <div className="space-y-4 max-w-screen-2xl mx-auto bg-white bg-opacity-90 rounded-lg shadow-xl p-6">
      <h1 className="text-3xl font-bold text-blue-800 mb-4">Network Traffic Analysis</h1>
      
      {/* File Upload Form and Controls */}
      <div className="bg-gray-700 rounded-lg p-6 mb-4">
        <h2 className="text-xl font-semibold text-white mb-4">Upload Network Traffic CSV</h2>
        
        <div className="flex flex-col space-y-4">
          {/* File selector */}
          <div className="border-2 border-blue-400 border-dashed rounded-lg p-4">
            <div className="flex items-center">
              <button
                onClick={() => document.getElementById('file-upload').click()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
                disabled={loading}
              >
                Choose File
              </button>
              <input
                id="file-upload"
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => setFile(e.target.files[0])}
                disabled={loading}
              />
              <p className="ml-4 text-gray-300">
                {file ? file.name : 'No file selected'}
              </p>
            </div>
          </div>

          {/* Action buttons in a row */}
          <div className="flex flex-wrap gap-4 items-center justify-center md:justify-start">
            <button
              onClick={handleUpload}
              disabled={!file || loading}
              className={`flex items-center px-6 py-3 rounded-md transition ${
                !file || loading
                  ? 'bg-gray-500 text-gray-300 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"></path>
                  </svg>
                  Process Data
                </>
              )}
            </button>

            {isAnalysisRunning && (
              <button
                onClick={stopAnalysis}
                className="flex items-center px-6 py-3 bg-red-600 text-white rounded-md shadow hover:bg-red-700 transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                </svg>
                Stop Analysis
              </button>
            )}

            {results && (
              <button
                onClick={toggleWorkingTables}
                className="flex items-center px-6 py-3 bg-purple-600 text-white rounded-md shadow hover:bg-purple-700 transition"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7"></path>
                </svg>
                {showWorkingTables ? 'Hide Working Tables' : 'Show Working Tables'}
              </button>
            )}
            
            {/* Download Data button */}
            {sessionId && results && !isAnalysisRunning && (
              <button
                onClick={downloadCaptureData}
                className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-md shadow hover:bg-blue-700 transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download CSV Data
              </button>
            )}
            
            {/* Auto-download Plots Toggle */}
            <div className="flex items-center text-sm text-white">
              <input 
                type="checkbox" 
                id="autoDownloadPlots" 
                checked={autoDownloadPlots} 
                onChange={toggleAutoDownloadPlots}
                className="mr-2 h-5 w-5 rounded"
              />
              <label htmlFor="autoDownloadPlots">Auto-download plots</label>
            </div>
          </div>
        </div>
      </div>
      
      {/* Working Tables */}
      {results && showWorkingTables && (
        <TablesPanel 
          results={results} 
          workingTables={workingTables} 
        />
      )}

      {results && (
        <>
          {/* Animated Charts Grid */}
          <ChartGrid 
            results={results}
            isAnalysisRunning={isAnalysisRunning}
          />

          {/* Toggle Button for Static Plots */}
          <div className="mt-8 text-center">
            <button
              onClick={toggleStaticPlots}
              className="px-6 py-3 bg-green-600 text-white rounded-lg shadow-md hover:bg-green-700 transition"
            >
              {showStaticPlots ? 'Hide Static Plots' : 'Show Static Plots'}
            </button>
          </div>

          {/* Static Plots Panel */}
          {showStaticPlots && (
            <StaticPlotsPanel 
              plots={results.plots}
              sessionId={sessionId}
            />
          )}

          {/* Data Table Section */}
          <div className="mt-12 bg-gray-900 rounded-lg shadow-xl p-6 border border-gray-800">
            <h2 className="text-xl font-semibold text-gray-100 mb-4 border-b border-gray-800 pb-2">Network Traffic Data Table</h2>
            <p className="text-sm text-gray-400 mb-4">
              The table below shows all processed data points with measurements and calculated metrics. 
              Use the pagination controls to navigate through the data.
            </p>
            <DataTable rows={results.cleanedDf} />
          </div>
        </>
      )}
    </div>
  );
} 