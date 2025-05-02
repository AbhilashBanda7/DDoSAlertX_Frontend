import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import ChartGrid from '../components/charts/ChartGrid';
import TablesPanel from '../components/tables/TablesPanel';
import DataTable from '../components/tables/DataTable';
import StaticPlotsPanel from '../components/charts/StaticPlotsPanel';

// Replace hardcoded URLs with environment variable
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export default function LiveCapturePage() {
  const [isCapturing, setIsCapturing] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [results, setResults] = useState(null);
  const [loadingData, setLoadingData] = useState(false);
  const [recordsCount, setRecordsCount] = useState(0);
  const [error, setError] = useState(null);
  const [showStaticPlots, setShowStaticPlots] = useState(false);
  const [showWorkingTables, setShowWorkingTables] = useState(false);
  const [isSimulatedMode, setIsSimulatedMode] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState(null);
  const [showCaptureDetails, setShowCaptureDetails] = useState(false);
  const [captureStats, setCaptureStats] = useState({
    packetsPerSecond: 0,
    totalBytes: 0,
    protocols: {},
    lastUpdated: null
  });
  const [captureStartTime, setCaptureStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [autoDownloadPlots, setAutoDownloadPlots] = useState(true);
  
  const pollingInterval = useRef(null);
  const noDataTimeoutRef = useRef(null);
  const timerInterval = useRef(null);
  const countPollingRef = useRef(null);
  
  // Define table names for the working data
  const workingTables = [
    { title: "Network Flow Data", description: "Processed network packet data with flow metrics" },
    { title: "Flow Derivatives", description: "Flow metrics with first and second derivatives" },
    { title: "Attack Detection", description: "Attack classification and critical ratio analysis" },
    { title: "Alert Statistics", description: "Early warning signals statistics by alert level" },
    { title: "Raw Packet Data", description: "Original captured network packet information" }
  ];
  
  // Format seconds into MM:SS format
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Start timer for elapsed time
  const startTimer = () => {
    if (timerInterval.current) {
      clearInterval(timerInterval.current);
    }
    
    setCaptureStartTime(new Date());
    setElapsedTime(0);
    
    timerInterval.current = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);
  };
  
  // Stop timer
  const stopTimer = () => {
    if (timerInterval.current) {
      clearInterval(timerInterval.current);
      timerInterval.current = null;
    }
  };
  
  // Start polling for live data
  const startPolling = () => {
    if (pollingInterval.current) return;
    
    // Initial fetch immediately
    fetchLiveData();
    
    pollingInterval.current = setInterval(() => {
      fetchLiveData();
    }, 1000); // Poll every second for better real-time updates
    
    // Set a timeout to check if data is being received
    noDataTimeoutRef.current = setTimeout(() => {
      if (recordsCount === 0 && isCapturing) {
        setError("No packets captured after 30 seconds. Check if you have network traffic or consider installing Npcap for real traffic capture.");
      }
    }, 30000);
  };
  
  // Stop polling
  const stopPolling = () => {
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
      pollingInterval.current = null;
    }
    
    if (countPollingRef.current) {
      clearInterval(countPollingRef.current);
      countPollingRef.current = null;
    }
    
    if (noDataTimeoutRef.current) {
      clearTimeout(noDataTimeoutRef.current);
      noDataTimeoutRef.current = null;
    }
  };
  
  // Calculate packet statistics
  const calculateStats = (data) => {
    if (!data || data.length === 0) return;
    
    console.log("Calculating stats from data:", data.length, "records");
    
    // Count protocols
    const protocols = {};
    let totalBytes = 0;
    
    data.forEach(packet => {
      // Count protocol types
      const protocol = packet.protocol || 'unknown';
      protocols[protocol] = (protocols[protocol] || 0) + 1;
      
      // Sum bytes - check for different possible column names
      if ('flow_bytes_s' in packet) {
        totalBytes += packet.flow_bytes_s;
      } else if ('Flow Bytes/s' in packet) {
        totalBytes += packet['Flow Bytes/s'];
      } else if ('Flow_bytes_per_sec' in packet) {
        totalBytes += packet.Flow_bytes_per_sec;
      }
    });
    
    // Calculate packets per second (approximate)
    const packetsPerSecond = data.length / Math.max(1, elapsedTime);
    
    const newStats = {
      packetsPerSecond: Math.round(packetsPerSecond * 10) / 10,
      totalBytes,
      protocols,
      lastUpdated: new Date().toLocaleTimeString()
    };
    
    console.log("Updated capture stats:", newStats);
    setCaptureStats(newStats);
  };
  
  // Add a debug log for timer updates
  useEffect(() => {
    console.log("Timer updated:", elapsedTime);
  }, [elapsedTime]);

  // Add a debug log for records count updates
  useEffect(() => {
    console.log("Records updated:", recordsCount);
  }, [recordsCount]);

  // Fix the timer by manually incrementing every second
  useEffect(() => {
    let timer = null;
    if (isCapturing) {
      timer = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }
    
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isCapturing]);

  // Add direct polling for packet count without waiting for data processing
  useEffect(() => {
    if (countPollingRef.current) {
      clearInterval(countPollingRef.current);
    }
    
    if (isCapturing) {
      // Poll just for the packet count every second
      countPollingRef.current = setInterval(() => {
        axios.get(`${API_URL}/live-data`)
          .then(({data}) => {
            if (data.total_records) {
              setRecordsCount(data.total_records);
            }
          })
          .catch(err => console.error("Error fetching count:", err));
      }, 1000);
    }
    
    return () => {
      if (countPollingRef.current) clearInterval(countPollingRef.current);
    };
  }, [isCapturing]);
  
  // Simplified fetchLiveData - only for getting packet counts during capture
  const fetchLiveData = async () => {
    if (!isCapturing) return;
    
    try {
      const { data } = await axios.get(`${API_URL}/live-data`);
      
      // Check if status is inactive, which means capture stopped
      if (data.status === 'inactive') {
        setIsCapturing(false);
        stopPolling();
        stopTimer();
        setError("Capture stopped unexpectedly on the server side.");
        return;
      }
      
      // ALWAYS update the record count
      if (data.total_records) {
        setRecordsCount(data.total_records);
      }
      
      // FORCE elapsed time update by always calculating it
      if (captureStartTime) {
        const elapsedSecs = Math.floor((new Date() - captureStartTime) / 1000);
        setElapsedTime(elapsedSecs > 0 ? elapsedSecs : 0);
      }
      
    } catch (err) {
      console.error("Error fetching live data:", err);
    }
  };
  
  // Start live capture
  const startCapture = async () => {
    setError(null);
    setResults(null);
    
    try {
      console.log("Starting new capture...");
      const { data } = await axios.post(`${API_URL}/start-capture`);
      console.log("Capture started:", data);
      
      // Set session ID from response
      setSessionId(data.session_id);
      
      // Update state to indicate capturing
      setIsCapturing(true);
      
      // Start the timer
      startTimer();
      
      // Check if we're in simulation mode
      setIsSimulatedMode(data.simulation_mode || false);
      
      // Play sound and show notification
      document.dispatchEvent(new CustomEvent('startTickingSound'));
      
      // Reset results
      setRecordsCount(0);
      
      // Start polling for packet count
      if (countPollingRef.current) {
        clearInterval(countPollingRef.current);
      }
      
      countPollingRef.current = setInterval(() => {
        if (!isCapturing) {
          clearInterval(countPollingRef.current);
          return;
        }
        
        console.log("Polling for packet count...");
        axios.get(`${API_URL}/live-data`)
          .then(({data}) => {
            if (data.total_records) {
              console.log("Updated packet count:", data.total_records);
              setRecordsCount(data.total_records);
            }
          })
          .catch(err => console.error("Error fetching count:", err));
      }, 1000);
      
    } catch (err) {
      console.error("Error starting capture:", err);
      setError("Failed to start capture. Make sure the backend is running and Scapy is installed.");
      setIsCapturing(false);
    }
  };
  
  // Process captured data after stopping
  const processData = async (sessionId) => {
    console.log("Starting post-capture analysis for session:", sessionId);
    setIsAnalyzing(true);
    setLoadingData(true);
    
    try {
      // Get the processed data for the captured file
      console.log("Fetching processed data from API");
      const { data } = await axios.get(`${API_URL}/process-capture/${sessionId}`);
      console.log("Received processed data:", data);
      
      if (data.cleaned_df && data.cleaned_df.length > 0) {
        // Format plot URLs to include the domain
        const formattedPlots = (data.plots || []).map(u => 
          u.startsWith('http') ? `${u}?t=${Date.now()}` : `${API_URL}${u}?t=${Date.now()}`
        );
        
        console.log("Setting processed results with", data.cleaned_df.length, "records and", formattedPlots.length, "plots");
        
        // Create table structure matching the CSV upload format
        const tableData = organizeTablesData(data.cleaned_df);
        
        setResults({
          plots: formattedPlots,
          cleanedDf: data.cleaned_df,
          plotData: data.plot_data,
          rawDataMode: false,
          tableDf: tableData // Add organized table data
        });
        
        // Calculate and update statistics
        calculateStats(data.cleaned_df);
        
        // Show the tables automatically after capture is completed
        setShowWorkingTables(true);
        // Don't automatically show static plots - let user decide
        setShowStaticPlots(false);
        
        // Play a beep sound to indicate plots are ready
        document.dispatchEvent(new CustomEvent('plotsGenerated'));
        
        // Make sure animation continues to play now that analysis is complete
        setIsAnalyzing(false);
        
        // Auto-download plots if enabled
        if (autoDownloadPlots && formattedPlots.length > 0) {
          // Small delay to ensure plots are ready
          setTimeout(() => {
            window.location.href = `${API_URL}/download-plots/${sessionId}`;
          }, 1000);
        }
        
      } else if (data.data && data.data.length > 0) {
        // Fall back to raw data if no processed data
        console.log("Using raw data fallback with", data.data.length, "records");
        
        setResults({
          plots: data.plots || [],
          cleanedDf: data.data,
          plotData: data.plot_data || { first_attack_idx: -1, attack_indices: [] },
          rawDataMode: true
        });
        
        calculateStats(data.data);
        setShowWorkingTables(true);
        
        // Play a beep sound to indicate plots are ready
        document.dispatchEvent(new CustomEvent('plotsGenerated'));
        
        // Make sure animation continues to play now that analysis is complete
        setIsAnalyzing(false);
        
        // Auto-download plots if enabled
        if (autoDownloadPlots && data.plots && data.plots.length > 0) {
          // Small delay to ensure plots are ready
          setTimeout(() => {
            window.location.href = `${API_URL}/download-plots/${sessionId}`;
          }, 1000);
        }
      } else {
        console.error("Process-capture returned empty data");
        setError("The capture did not contain enough data to analyze.");
      }
      
    } catch (err) {
      console.error("Error processing captured data:", err);
      
      if (err.response && err.response.status === 404) {
        setError("Capture file not found. The data may not have been saved properly.");
      } else {
        setError(`Failed to process the captured data: ${err.message || "Unknown error"}`);
      }
    } finally {
      setIsAnalyzing(false);
      setLoadingData(false);
      console.log("Analysis complete");
    }
  };
  
  // Helper function to organize data into tables similar to CSV upload
  const organizeTablesData = (data) => {
    console.log("Organizing table data...");
    
    if (!data || data.length === 0) {
      console.log("No data to organize");
      return {};
    }
    
    try {
      // Log the data columns to help debug
      const sampleRow = data[0];
      console.log("Sample data row keys:", Object.keys(sampleRow));
      
      // Debug derivative columns
      console.log("Derivative column values in first row:", {
        'dp/dt': sampleRow['dp/dt'],
        'db/dt': sampleRow['db/dt'],
        'd2p/dt2': sampleRow['d2p/dt2'],
        'd2b/dt2': sampleRow['d2b/dt2']
      });
      
      // Table 1: Basic packet info
      const packetInfo = data.map(row => ({
        'Seconds': row.Seconds || 0,
        'Flow Packets/s': row['Flow Packets/s'] || 0,
        'Flow Bytes/s': row['Flow Bytes/s'] || 0,
        'Label': row.Label || 'UNKNOWN'
      }));
      
      // Table 2: Flow metrics
      const flowMetrics = data.map(row => ({
        'Seconds': row.Seconds || 0,
        '∂p/∂t': row['dp/dt'] || 0,
        '∂b/∂t': row['db/dt'] || 0,
        '∂²p/∂t²': row['d2p/dt2'] || 0,
        '∂²b/∂t²': row['d2b/dt2'] || 0,
        'R1': row.R1 || 0,
        'R2': row.R2 || 0
      }));
      
      // Table 3: Attack analysis
      const attackAnalysis = data.map(row => ({
        'Seconds': row.Seconds || 0,
        'Label': row.Label || 'UNKNOWN',
        'Pre Label': row['Pre Label'] || 0,
        'MAX_Z_Score': row['MAX_Z_Score'] || 0,
        'CR': row.CR || 0
      }));
      
      // Table 4: EWS statistics
      const ewsStats = data.map(row => ({
        'Seconds': row.Seconds || 0,
        'EWS': row.EWS || 0,
        'Z_Score_R1': row['Z_Score_R1'] || 0,
        'Z_Score_R2': row['Z_Score_R2'] || 0,
        'MAX_Z_Score': row['MAX_Z_Score'] || 0
      }));
      
      // Table 5: Raw Capture Data (if available)
      let rawCaptureData = [];
      if (data && data.length > 0) {
        // Try to find raw packet data or create minimal representation
        try {
          // Check for raw packet data field
          if (data[0].raw_packet_data || data[0].src_ip) {
            rawCaptureData = data.map((pkt, index) => ({
              'Packet #': index + 1,
              'Timestamp': pkt.Timestamp || pkt.timestamp || '',
              'Source IP': pkt.src_ip || pkt.Source || '',
              'Destination IP': pkt.dst_ip || pkt.Destination || '',
              'Protocol': pkt.protocol || pkt.Protocol || '',
              'Bytes': pkt.bytes || pkt.Length || pkt['Flow Bytes/s'] || 0,
              'Label': pkt.Label || pkt.label || 'UNKNOWN'
            }));
          } else {
            // Create simplified view from processed data
            rawCaptureData = data.map((row, index) => ({
              'Packet #': index + 1,
              'Seconds': row.Seconds || 0,
              'Flow Packets/s': row['Flow Packets/s'] || 0,
              'Flow Bytes/s': row['Flow Bytes/s'] || 0,
              'Label': row.Label || 'UNKNOWN'
            }));
          }
        } catch (err) {
          console.error("Error creating raw capture table:", err);
          // Fallback to empty array
          rawCaptureData = [];
        }
      }
      
      console.log("Organized tables with counts:", 
        packetInfo.length, 
        flowMetrics.length, 
        attackAnalysis.length, 
        ewsStats.length,
        rawCaptureData.length
      );
      
      return [
        packetInfo,
        flowMetrics,
        attackAnalysis,
        ewsStats,
        rawCaptureData
      ];
      
    } catch (err) {
      console.error("Error organizing table data:", err);
      return {};
    }
  };
  
  // Stop live capture
  const stopCapture = async () => {
    if (!isCapturing) return;
    
    try {
      setLoadingData(true);
      console.log("Stopping capture...");
      const { data } = await axios.post(`${API_URL}/stop-capture`);
      console.log("Capture stopped:", data);
      
      // Update state
      setIsCapturing(false);
      
      // Stop timer
      stopTimer();
      
      // Stop polling
      stopPolling();
      
      // Stop sounds
      document.dispatchEvent(new CustomEvent('stopTickingSound'));
      
      // Process the data if there are records
      if (data.records_captured > 0 && data.session_id) {
        console.log(`Processing ${data.records_captured} captured packets for session ${data.session_id}`);
        await processData(data.session_id || sessionId);
      } else {
        setLoadingData(false);
        console.error("No packets captured:", data);
        setError("No packets were captured during the session. Try capturing for a longer period or check network traffic.");
      }
      
    } catch (err) {
      console.error("Error stopping capture:", err);
      setError(`Failed to stop capture properly: ${err.message || "Unknown error"}`);
      // Still update the UI state to not capturing even if the API call failed
      setIsCapturing(false);
      stopPolling();
      stopTimer();
      setLoadingData(false);
    }
  };
  
  // Toggle static plots display
  const toggleStaticPlots = () => {
    setShowStaticPlots(!showStaticPlots);
  };

  // Toggle working tables display
  const toggleWorkingTables = () => {
    // Always allow viewing capture data during capture
    setShowWorkingTables(!showWorkingTables);
  };
  
  // Toggle capture details panel
  const toggleCaptureDetails = () => {
    console.log("Toggling capture details:", !showCaptureDetails);
    setShowCaptureDetails(!showCaptureDetails);
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
  
  // Automatically show tables and plots when they become available during capture
  useEffect(() => {
    if (isCapturing && results) {
      // If we have enough data, automatically show tables and plots
      if (results.cleanedDf.length > 0 && !showWorkingTables) {
        setShowWorkingTables(true);
      }
      
      if (results.cleanedDf.length >= 10 && !showStaticPlots) {
        setShowStaticPlots(true);
      }
    }
  }, [isCapturing, results, showWorkingTables, showStaticPlots]);
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopPolling();
      stopTimer();
      
      // If still capturing when leaving page, stop capture
      if (isCapturing) {
        stopCapture().catch(console.error);
      }
      
      // Stop any sounds
      document.dispatchEvent(new CustomEvent('stopTickingSound'));
    };
  }, [isCapturing]);
  
  // Determine if capture is active and receiving data
  const isCaptureHealthy = isCapturing && recordsCount > 0;
  
  return (
    <div className="min-h-screen cyber-bg-pattern bg-cyber-darker">
      <div className="space-y-4 max-w-screen-2xl mx-auto bg-gray-900/95 rounded-lg shadow-xl p-6">
        <h1 className="text-3xl font-bold text-white mb-4">
          Live Network <span className="text-gradient">Capture</span>
        </h1>
        
        {/* Debug Button - Only visible in development */}
        {process.env.NODE_ENV === 'development' && results && (
          <div className="bg-gray-800 p-2 rounded mb-4">
            <button 
              onClick={() => {
                console.log("Debug Data:", {
                  results,
                  cleanedDf: results.cleanedDf?.length,
                  plots: results.plots?.length,
                  plotData: results.plotData,
                  tableDf: results.tableDf
                });
              }}
              className="text-xs bg-purple-800 text-white px-2 py-1 rounded"
            >
              Debug Data
            </button>
          </div>
        )}
        
        {/* Simulation Mode Notice */}
        {isSimulatedMode && (
          <div className="bg-purple-900/40 border border-purple-600 rounded-lg p-4 mb-4">
            <h3 className="text-lg font-semibold text-purple-300 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              Simulation Mode Active
            </h3>
            <p className="text-gray-300 mt-2">
              The system is currently using simulated network traffic data because WinPcap/Npcap is not installed or configured correctly on this system. 
              This mode is perfect for demonstration purposes, but does not reflect your actual network traffic.
            </p>
            <div className="mt-3 text-purple-300 text-sm">
              <p>To capture real network traffic, you need to:</p>
              <ol className="list-decimal ml-6 mt-1 space-y-1">
                <li>Install <a href="https://npcap.com/" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">Npcap</a> (Windows)</li>
                <li>Run the application with administrator privileges</li>
                <li>Restart the application after installing Npcap</li>
              </ol>
            </div>
          </div>
        )}
        
        {/* Capture Status Area - Always visible when capturing */}
        {isCapturing && (
          <div className="bg-blue-900/40 border border-blue-600 rounded-lg p-4 mb-4">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse mr-2"></div>
              <h3 className="text-lg font-semibold text-blue-300">
                Capture Active - {recordsCount} packets captured
              </h3>
              <div className="ml-auto font-mono text-xl text-white bg-blue-800/50 px-3 py-1 rounded">
                {formatTime(elapsedTime)}
              </div>
            </div>
          </div>
        )}
        
        {/* Analysis Status - Show when analyzing captured data */}
        {isAnalyzing && (
          <div className="bg-yellow-900/40 border border-yellow-600 rounded-lg p-4 mb-4">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse mr-2"></div>
              <h3 className="text-lg font-semibold text-yellow-300">
                Analyzing Captured Data - Processing {recordsCount} packets
              </h3>
            </div>
          </div>
        )}
        
        {/* Network Traffic Capture Controls */}
        <div className="card p-4 mb-4 bg-gray-800 rounded-lg border border-gray-700">
          <h2 className="text-xl font-semibold text-gray-100 mb-4 border-b border-gray-700 pb-2">
            Network Traffic Capture Controls
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Left column - Capture Status */}
            <div className="bg-gray-800/80 p-4 rounded-lg border border-gray-700">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-white font-medium">Capture Status</h3>
                <button 
                  onClick={toggleCaptureDetails}
                  className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 px-2 py-1 rounded"
                >
                  {showCaptureDetails ? 'Hide Details' : 'Show Details'}
                </button>
              </div>
              
              {/* Always visible status grid */}
              <div className="grid grid-cols-2 gap-2 text-sm mt-2">
                <div className="bg-gray-700/60 p-2 rounded">
                  <div className="text-gray-400 text-xs">Status</div>
                  <div className="flex items-center">
                    <div className={`w-2 h-2 rounded-full mr-2 ${isCapturing ? 'bg-green-500 animate-pulse' : isAnalyzing ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'}`}></div>
                    <span className="text-gray-200">
                      {isCapturing ? 'Capturing' : isAnalyzing ? 'Analyzing' : 'Inactive'}
                    </span>
                  </div>
                </div>
                
                <div className="bg-gray-700/60 p-2 rounded">
                  <div className="text-gray-400 text-xs">Elapsed Time</div>
                  <div className="text-gray-200 font-mono">{formatTime(elapsedTime)}</div>
                </div>
                
                <div className="bg-gray-700/60 p-2 rounded">
                  <div className="text-gray-400 text-xs">Packets</div>
                  <div className="text-gray-200">{recordsCount}</div>
                </div>
                
                <div className="bg-gray-700/60 p-2 rounded">
                  <div className="text-gray-400 text-xs">Mode</div>
                  <div className="text-gray-200">{isSimulatedMode ? 'Simulation' : 'Real Traffic'}</div>
                </div>
              </div>
              
              {/* Additional details shown when toggled */}
              {showCaptureDetails && (
                <div className="mt-3 border-t border-gray-700 pt-3">
                  <h4 className="text-sm font-medium text-gray-300 mb-2">Advanced Details</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-gray-700/60 p-2 rounded">
                      <div className="text-gray-400">Packets/sec</div>
                      <div className="text-gray-200 font-medium">{captureStats.packetsPerSecond || 0}</div>
                    </div>
                    <div className="bg-gray-700/60 p-2 rounded">
                      <div className="text-gray-400">Total Bytes</div>
                      <div className="text-gray-200 font-medium">{(captureStats.totalBytes || 0).toLocaleString()}</div>
                    </div>
                    <div className="bg-gray-700/60 p-2 rounded col-span-2">
                      <div className="text-gray-400">Protocol Distribution</div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {Object.entries(captureStats.protocols || {}).map(([proto, count]) => (
                          <span key={proto} className="inline-block bg-gray-800 px-1.5 py-0.5 rounded text-gray-300">
                            {proto}: {count}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Right column - Session Info */}
            <div className="bg-gray-800/80 p-4 rounded-lg border border-gray-700">
              <h3 className="text-white font-medium mb-2">Session Info</h3>
              {sessionId ? (
                <div className="text-gray-300 text-sm">
                  <div className="mb-2">
                    <span className="font-medium">ID:</span> 
                    <span className="ml-1 font-mono text-xs break-all">{sessionId}</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-gray-700/60 p-2 rounded">
                      <div className="text-gray-400">Started</div>
                      <div className="text-gray-200">{captureStartTime?.toLocaleTimeString() || 'N/A'}</div>
                    </div>
                    <div className="bg-gray-700/60 p-2 rounded">
                      <div className="text-gray-400">Traffic Type</div>
                      <div className="text-gray-200">{isSimulatedMode ? 'Simulated' : 'Real'}</div>
                    </div>
                  </div>
                  
                  {/* Add Download Data button when session is complete */}
                  {!isCapturing && results && (
                    <div className="mt-3">
                      <button
                        onClick={downloadCaptureData}
                        className="w-full text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded flex items-center justify-center"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download Capture Data
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-gray-400 italic">No active session</div>
              )}
            </div>
          </div>
          
          {/* Error message */}
          {error && (
            <div className="bg-red-900/80 text-white p-3 rounded-lg border border-red-700 mb-4">
              <div className="font-bold">Error:</div>
              <div>{error}</div>
            </div>
          )}
          
          {/* Control buttons */}
          <div className="flex flex-wrap gap-4 items-center justify-center md:justify-start">
            {!isCapturing ? (
              <button
                onClick={startCapture}
                disabled={isAnalyzing}
                className={`flex items-center px-6 py-3 rounded-md shadow transition ${
                  isAnalyzing ? 'bg-gray-600 text-gray-300 cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
                Start Capture
              </button>
            ) : (
              <button
                onClick={stopCapture}
                className="flex items-center px-6 py-3 bg-red-600 text-white rounded-md shadow hover:bg-red-700 transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                </svg>
                Stop Capture & Analyze
              </button>
            )}
            
            <button
              onClick={toggleWorkingTables}
              className={`flex items-center px-6 py-3 rounded-md shadow transition ${
                results ? 'bg-purple-600 text-white hover:bg-purple-700' : 
                'bg-gray-600 text-gray-300 cursor-not-allowed'
              }`}
              disabled={!results}
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7"></path>
              </svg>
              {showWorkingTables ? 'Hide Data Tables' : 'Show Data Tables'}
            </button>
            
            {/* Auto-download Plots Toggle */}
            {!isCapturing && (
              <div className="flex items-center text-sm text-gray-300">
                <input 
                  type="checkbox" 
                  id="autoDownloadPlots" 
                  checked={autoDownloadPlots} 
                  onChange={toggleAutoDownloadPlots}
                  className="mr-2 h-5 w-5 rounded"
                />
                <label htmlFor="autoDownloadPlots">Auto-download plots</label>
              </div>
            )}
          </div>
        </div>
        
        {/* Working Tables */}
        {results && showWorkingTables && (
          <TablesPanel 
            results={results} 
            workingTables={workingTables} 
          />
        )}
        
        {/* Chart displays */}
        {results && (
          <>
            {/* Animated Charts Grid */}
            <ChartGrid 
              results={results}
              isAnalysisRunning={isAnalyzing}
            />

            {/* Button for Static Plots - Moved below Animated Charts */}
            <div className="mt-4 mb-4 flex justify-center">
              {(results && results.plots && results.plots.length > 0) && (
                <button
                  onClick={toggleStaticPlots}
                  className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-md shadow hover:bg-blue-700 transition"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                  </svg>
                  {showStaticPlots ? 'Hide Static Plots' : 'Show Static Plots'}
                </button>
              )}
            </div>

            {/* Static Plots Panel */}
            {showStaticPlots && (
              <StaticPlotsPanel 
                plots={results.plots.sort((a, b) => {
                  // Sort plots to make sure important ones appear first
                  const getPlotPriority = (url) => {
                    if (url.includes('confusion')) return 1;
                    if (url.includes('alert')) return 2;
                    if (url.includes('flow_with_ews')) return 3;
                    if (url.includes('early_warnings')) return 4;
                    if (url.includes('flow')) return 5;
                    if (url.includes('level')) return 6;
                    if (url.includes('derivative')) return 7;
                    return 10;
                  };
                  return getPlotPriority(a) - getPlotPriority(b);
                })}
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
              <DataTable 
                rows={results.cleanedDf.map(row => {
                  // Get derivative values with fallbacks for different column names
                  const dpdt = row['dp/dt'] || row['DP/DT'] || 0;
                  const dbdt = row['db/dt'] || row['DB/DT'] || 0;
                  const d2pdt2 = row['d2p/dt2'] || row['D2P/DT2'] || 0;
                  const d2bdt2 = row['d2b/dt2'] || row['D2B/DT2'] || 0;
                  
                  return {
                    'Seconds': row['Seconds'] || 0,
                    'Flow Packets/s': row['Flow Packets/s'] || 0,
                    'Flow Bytes/s': row['Flow Bytes/s'] || 0,
                    '∂p/∂t': dpdt,
                    '∂b/∂t': dbdt,
                    '∂²p/∂t²': d2pdt2,
                    '∂²b/∂t²': d2bdt2,
                    'R1': row['R1'] || 0,
                    'R2': row['R2'] || 0,
                    'Label': row['Label'] || '',
                    'CR': row['CR'] || 0,
                    'EWS': row['EWS'] || 0,
                    'Z_Score_R1': row['Z_Score_R1'] || 0,
                    'Z_Score_R2': row['Z_Score_R2'] || 0,
                    'MAX_Z_Score': row['MAX_Z_Score'] || 0,
                    'Pre Label': row['Pre Label'] || ''
                  };
                })} 
              />
            </div>
          </>
        )}
        
        {/* Loading/Empty state */}
        {!results && (
          <div className="h-64 flex items-center justify-center bg-gray-800/50 rounded-lg border border-gray-700">
            {loadingData ? (
              <div className="text-center">
                <svg className="animate-spin h-10 w-10 text-blue-500 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-gray-300">
                  {isAnalyzing ? 'Analyzing captured data...' : 'Loading...'}
                </p>
              </div>
            ) : (
              <div className="text-center">
                {isCapturing ? (
                  <div>
                    <svg className="h-16 w-16 text-blue-500 animate-pulse mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path>
                    </svg>
                    <h3 className="text-lg font-medium text-gray-300 mb-2">Capturing Network Traffic</h3>
                    <div>
                      <p className="text-gray-400">Captured <span className="font-bold text-blue-400">{recordsCount}</span> packets.</p>
                      <p className="text-gray-300 text-sm mt-2">Elapsed time: <span className="font-mono bg-gray-700 px-2 py-1 rounded">{formatTime(elapsedTime)}</span></p>
                      <p className="text-xs text-gray-400 mt-2">Analysis will be performed after capture is stopped.</p>
                      
                      <div className="mt-4">
                        <button
                          onClick={stopCapture}
                          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                        >
                          Stop Capture & Analyze
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <svg className="h-16 w-16 text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <h3 className="text-lg font-medium text-gray-300 mb-2">No Active Capture</h3>
                    <p className="text-gray-400">Click the "Start Capture" button to begin monitoring network traffic.</p>
                    <div className="mt-4">
                      <button
                        onClick={startCapture}
                        className="px-6 py-2 bg-green-600/80 hover:bg-green-600 text-white rounded-full transition-colors"
                      >
                        Start Capture
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 