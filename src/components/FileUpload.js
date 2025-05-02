import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import DataTable from './DataTable';
import AnimatedCharts from './AnimatedCharts';

export default function FileUpload() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [showStaticPlots, setShowStaticPlots] = useState(false);
  const [showWorkingTables, setShowWorkingTables] = useState(false);
  const [currentTableIndex, setCurrentTableIndex] = useState(0);
  const [beepAudio, setBeepAudio] = useState(null);
  const [isBeeping, setIsBeeping] = useState(false);

  // Define table names for the working data
  const workingTables = [
    { title: "Cleaned CSV", description: "Raw data after initial cleaning" },
    { title: "Grouped by Timestamps", description: "Data grouped by timestamp values" },
    { title: "Processed Metrics", description: "Calculated attack metrics and EWS levels" },
    { title: "Alert Statistics", description: "Early warning signals statistics" }
  ];

  // Define all chart configurations to match the backend static plots
  const allCharts = [
    // All 13 plots from data_processing.py exactly as they appear
    {
      id: 'early-warnings',
      title: 'Flow Packets/s vs Seconds with Early Warnings',
      field: 'Flow Packets/s',
      chartType: 'early-warnings',
      showAttackRegion: false,
      showEWS: true,
      featured: true,
      speed: 30 // Increased speed
    },
    {
      id: 'benign-attack',
      title: 'Benign vs Attack Traffic',
      field: 'Flow Packets/s',
      chartType: 'benign-attack',
      showAttackRegion: false,
      showEWS: false,
      featured: true,
      speed: 30
    },
    {
      id: 'peak-region',
      title: 'Test Data with Peak Region and Attack Start',
      field: 'Flow Packets/s',
      chartType: 'peak-region',
      showAttackRegion: true,
      showEWS: false,
      featured: true,
      speed: 30
    },
    {
      id: 'flow-packets',
      title: 'T(t) - Flow Packets/s vs Seconds',
      field: 'Flow Packets/s',
      chartType: 'standard',
      showAttackRegion: true,
      showEWS: false,
      featured: true,
      speed: 30
    },
    {
      id: 'flow-bytes',
      title: 'Flow Bytes/s vs Seconds',
      field: 'Flow Bytes/s',
      chartType: 'standard',
      showAttackRegion: true,
      showEWS: false,
      featured: true,
      speed: 30
    },
    {
      id: 'dp-dt',
      title: 'dp/dt vs Seconds',
      field: 'dp/dt',
      chartType: 'derivative',
      showAttackRegion: true,
      showEWS: false,
      featured: true,
      speed: 30
    },
    {
      id: 'db-dt',
      title: 'db/dt vs Seconds',
      field: 'db/dt',
      chartType: 'derivative',
      showAttackRegion: true,
      showEWS: false,
      featured: true,
      speed: 30
    },
    {
      id: 'd2p-dt2',
      title: 'd²p/dt² vs Seconds',
      field: 'd2p/dt2',
      chartType: 'derivative',
      showAttackRegion: true,
      showEWS: false,
      featured: true,
      speed: 30
    },
    {
      id: 'd2b-dt2',
      title: 'd²b/dt² vs Seconds',
      field: 'd2b/dt2',
      chartType: 'derivative',
      showAttackRegion: true,
      showEWS: false,
      featured: true,
      speed: 30
    },
    // Individual alert level charts (from plot_alert_levels_separately)
    {
      id: 'alert-level-1',
      title: '1 Level Alerts - Flow Packets/s',
      field: 'Flow Packets/s',
      chartType: 'alert-levels-separately',
      showAttackRegion: true,
      showEWS: true,
      featured: true,
      speed: 30
    },
    {
      id: 'alert-level-2',
      title: '2 Level Alerts - Flow Packets/s',
      field: 'Flow Packets/s',
      chartType: 'alert-levels-separately',
      showAttackRegion: true,
      showEWS: true,
      featured: true,
      speed: 30
    },
    {
      id: 'alert-level-3',
      title: '3 Level Alerts - Flow Packets/s',
      field: 'Flow Packets/s',
      chartType: 'alert-levels-separately',
      showAttackRegion: true,
      showEWS: true,
      featured: true,
      speed: 30
    },
    {
      id: 'alert-level-4',
      title: '4 Level Alerts - Flow Packets/s',
      field: 'Flow Packets/s',
      chartType: 'alert-levels-separately',
      showAttackRegion: true,
      showEWS: true,
      featured: true,
      speed: 30
    },
    {
      id: 'emergency-alerts',
      title: 'Emergency Alerts',
      field: 'Flow Packets/s',
      chartType: 'emergency-alerts',
      showAttackRegion: false,
      showEWS: true,
      featured: true,
      speed: 30
    },
    {
      id: 'all-alerts',
      title: 'Flow Packets per Second with EWS Alerts',
      field: 'Flow Packets/s',
      chartType: 'alerts',
      showAttackRegion: true,
      showEWS: true,
      featured: true,
      speed: 30
    },
    {
      id: 'flow-with-ews',
      title: 'Test- Flow Packets/s with Attack & EWS',
      field: 'Flow Packets/s',
      chartType: 'flow-with-ews',
      showAttackRegion: true,
      showEWS: true,
      featured: true,
      speed: 30
    }
  ];

  // All charts are now featured
  const featuredCharts = allCharts;

  // Play continuous beep sound
  const startContinuousBeep = useCallback(() => {
    if (!beepAudio) {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.value = 600; // lower frequency for less annoying beep
      gainNode.gain.value = 0.1; // lower volume
      
      oscillator.start();
      setBeepAudio({ oscillator, audioContext, gainNode });
      setIsBeeping(true);
    }
  }, [beepAudio]);

  const stopContinuousBeep = useCallback(() => {
    if (beepAudio) {
      beepAudio.oscillator.stop();
      beepAudio.audioContext.close();
      setBeepAudio(null);
      setIsBeeping(false);
    }
  }, [beepAudio]);

  // Play beep sound function (single beep)
  const playBeepSound = () => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.type = 'sine';
    oscillator.frequency.value = 800; // frequency in hertz
    gainNode.gain.value = 0.5;
    
    oscillator.start();
    setTimeout(() => {
      oscillator.stop();
    }, 500);
  };

  // Listen for animation complete event
  useEffect(() => {
    const handleAnimationComplete = (event) => {
      if (event.detail.chartId === 'flow-with-ews') {
        stopContinuousBeep();
      }
    };

    document.addEventListener('animationComplete', handleAnimationComplete);
    
    return () => {
      document.removeEventListener('animationComplete', handleAnimationComplete);
    };
  }, [stopContinuousBeep]);

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    
    // Start continuous beep while processing
    startContinuousBeep();

    const fd = new FormData();
    fd.append('file', file);

    try {
      const { data } = await axios.post(
        'http://localhost:5000/upload',
        fd,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      setResults({
        plots: data.plots.map(u => `http://localhost:5000${u}?t=${Date.now()}`),
        cleanedDf: data.cleaned_df,
        plotData: data.plot_data
      });
      
      // Stop continuous beep and play completion beep
      stopContinuousBeep();
      playBeepSound();
    } catch (err) {
      console.error(err);
      alert('Upload failed');
      // Stop beeping on error too
      stopContinuousBeep();
    }

    setLoading(false);
  };

  // Toggle static plots display
  const toggleStaticPlots = () => {
    setShowStaticPlots(!showStaticPlots);
  };

  // Toggle working tables display
  const toggleWorkingTables = () => {
    setShowWorkingTables(!showWorkingTables);
    setCurrentTableIndex(0); // Reset to first table when toggling
  };

  // Handle table navigation
  const goToNextTable = () => {
    setCurrentTableIndex((prev) => 
      prev < workingTables.length - 1 ? prev + 1 : prev
    );
  };

  const goToPreviousTable = () => {
    setCurrentTableIndex((prev) => 
      prev > 0 ? prev - 1 : prev
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
      <input
        type="file"
        accept=".csv"
        onChange={e => setFile(e.target.files[0])}
        className="block"
      />

        <div className="flex space-x-2">
      <button
        onClick={handleUpload}
        disabled={!file || loading}
        className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
      >
        {loading ? 'Processing…' : 'Upload CSV'}
      </button>

          {results && (
            <button
              onClick={toggleWorkingTables}
              className="px-4 py-2 bg-purple-600 text-white rounded"
            >
              {showWorkingTables ? 'Hide Working' : 'Show Working'}
            </button>
          )}
        </div>
      </div>

      {/* Working Tables Display with Pagination */}
      {results && showWorkingTables && (
        <div className="mt-4 border rounded-lg p-6 bg-white shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">{workingTables[currentTableIndex].title}</h2>
            <div className="text-sm text-gray-600">
              {workingTables[currentTableIndex].description}
            </div>
          </div>
          
          {/* Table content based on current index */}
          <div className="overflow-auto" style={{ maxHeight: '400px' }}>
            {currentTableIndex === 0 && (
              <table className="min-w-full bg-white">
                <thead className="bg-blue-800 text-white">
                  <tr>
                    <th className="py-2 px-4 border">Flow Packets/s</th>
                    <th className="py-2 px-4 border">Label</th>
                    <th className="py-2 px-4 border">Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {results.cleanedDf.slice(0, 20).map((row, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                      <td className="py-2 px-4 border">{row['Flow Packets/s']}</td>
                      <td className="py-2 px-4 border">{row['Label']}</td>
                      <td className="py-2 px-4 border">{row['Timestamp']}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {currentTableIndex === 1 && (
              <table className="min-w-full bg-white">
                <thead className="bg-blue-800 text-white">
                  <tr>
                    <th className="py-2 px-4 border">Flow Packets/s</th>
                    <th className="py-2 px-4 border">Label</th>
                    <th className="py-2 px-4 border">Seconds</th>
                  </tr>
                </thead>
                <tbody>
                  {results.cleanedDf.slice(0, 20).map((row, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                      <td className="py-2 px-4 border">{row['Flow Packets/s']}</td>
                      <td className="py-2 px-4 border">{row['Label']}</td>
                      <td className="py-2 px-4 border">{row['Seconds']}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {currentTableIndex === 2 && (
              <table className="min-w-full bg-white">
                <thead className="bg-blue-800 text-white">
                  <tr>
                    <th className="py-2 px-4 border">Seconds</th>
                    <th className="py-2 px-4 border">Flow Packets/s</th>
                    <th className="py-2 px-4 border">Label</th>
                    <th className="py-2 px-4 border">dp/dt</th>
                    <th className="py-2 px-4 border">db/dt</th>
                    <th className="py-2 px-4 border">d2p/dt2</th>
                    <th className="py-2 px-4 border">d2b/dt2</th>
                    <th className="py-2 px-4 border">EWS</th>
                  </tr>
                </thead>
                <tbody>
                  {results.cleanedDf.slice(0, 20).map((row, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                      <td className="py-2 px-4 border">{row['Seconds']}</td>
                      <td className="py-2 px-4 border">{row['Flow Packets/s']}</td>
                      <td className="py-2 px-4 border">{row['Label']}</td>
                      <td className="py-2 px-4 border">{row['dp/dt']}</td>
                      <td className="py-2 px-4 border">{row['db/dt']}</td>
                      <td className="py-2 px-4 border">{row['d2p/dt2']}</td>
                      <td className="py-2 px-4 border">{row['d2b/dt2']}</td>
                      <td className="py-2 px-4 border">{row['EWS']}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {currentTableIndex === 3 && (
              <table className="min-w-full bg-white">
                <thead className="bg-blue-800 text-white">
                  <tr>
                    <th className="py-2 px-4 border">ALERT LEVEL</th>
                    <th className="py-2 px-4 border">COUNT</th>
                    <th className="py-2 px-4 border">FIRST ALERT TIME</th>
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3, 4].map(level => {
                    const alertCount = (results.plotData.ews_alerts[`level${level}`] || []).length;
                    const firstAlertIdx = (results.plotData.ews_alerts[`level${level}`] || [])[0];
                    const firstAlertTime = firstAlertIdx !== undefined 
                      ? results.cleanedDf[firstAlertIdx]?.Seconds 
                      : '-';
                      
                    return (
                      <tr key={level} className={level % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                        <td className="py-2 px-4 border">{level}</td>
                        <td className="py-2 px-4 border">{alertCount}</td>
                        <td className="py-2 px-4 border">{firstAlertTime !== '-' ? Math.round(firstAlertTime) : '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
          
          {/* Pagination controls */}
          <div className="flex justify-between mt-4">
            <button 
              onClick={goToPreviousTable}
              disabled={currentTableIndex === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
            >
              Previous
            </button>
            <div className="text-center">
              {currentTableIndex + 1} of {workingTables.length}
            </div>
            <button 
              onClick={goToNextTable}
              disabled={currentTableIndex === workingTables.length - 1}
              className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {results && (
        <>
          {/* All 13 Animated Charts */}
          <h2 className="text-xl font-semibold mt-6 border-b pb-2">Animated Network Analysis Charts</h2>

          <div className="grid grid-cols-1 gap-8 mt-4">
            {featuredCharts.map(chart => (
              <div key={chart.id} className="p-4 border rounded-lg shadow-sm">
                <h3 className="text-lg font-medium mb-4">{chart.title}</h3>
                <AnimatedCharts 
                  data={results.cleanedDf} 
                  field={chart.field}
                  plotData={results.plotData}
                  chartType={chart.chartType}
                  showEWS={chart.showEWS}
                  showAttackRegion={chart.showAttackRegion}
                  title={chart.title}
                  speed={chart.speed}
                />
              </div>
            ))}
          </div>

          {/* Toggle Button for Static Plots */}
          <div className="mt-8 text-center">
            <button
              onClick={toggleStaticPlots}
              className="px-6 py-3 bg-green-600 text-white rounded-lg shadow-md hover:bg-green-700 transition"
            >
              {showStaticPlots ? 'Hide Static Plots' : 'Show Static Plots'}
            </button>
          </div>

          {/* Original Static Plots */}
          {showStaticPlots && (
            <>
              <h2 className="text-xl font-semibold mt-8 border-b pb-2">Static Plots (Original)</h2>
              <div className="grid grid-cols-2 gap-4 mt-4">
            {results.plots.map((url, i) => (
                  <div key={i} className="border rounded-lg p-2">
              <img
                src={url}
                alt={`Plot ${i}`}
                className="w-full rounded shadow"
                onError={e => e.currentTarget.src = '/placeholder.png'}
              />
          </div>
                ))}
              </div>
            </>
          )}

          {/* Data Table Section */}
          <h2 className="text-xl font-semibold mt-8 border-b pb-2">Data Table</h2>
          <div className="mt-4">
            <DataTable rows={results.cleanedDf} />
          </div>
        </>
      )}
    </div>
  );
}
