import React, { useEffect, useState, useMemo } from 'react';
import AnimatedChart from './AnimatedChart';

export default function ChartGrid({ results, isAnalysisRunning }) {
  // Add state to track if plots have been generated
  const [plotsGenerated, setPlotsGenerated] = useState(false);

  // Define all chart configurations to match the backend static plots
  const allCharts = [
    // 1. Early warnings
    {
      id: 'early-warnings',
      title: 'Flow Packets/s vs Seconds with Early Warnings',
      field: 'Flow Packets/s',
      chartType: 'early-warnings',
      showAttackRegion: false,
      showEWS: true,
      featured: true,
      speed: 30
    },
    // 2. Benign vs Attack
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
    // 3. EWS Confusion Matrix
    {
      id: 'ews-confusion-matrix',
      title: 'EWS Confusion Matrix',
      field: 'Flow Packets/s',
      chartType: 'confusion-matrix',
      showAttackRegion: false,
      showEWS: true,
      featured: true,
      speed: 30
    },
    // 4. Test Peak Region
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
    // 5. Flow Packets/s
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
    // 6. Flow Bytes/s
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
    // 7. dp/dt
    {
      id: 'dp-dt',
      title: '∂p/∂t vs Seconds',
      field: 'dp/dt',
      chartType: 'derivative',
      showAttackRegion: true,
      showEWS: false,
      featured: true,
      speed: 30
    },
    // 8. db/dt
    {
      id: 'db-dt',
      title: '∂b/∂t vs Seconds',
      field: 'db/dt',
      chartType: 'derivative',
      showAttackRegion: true,
      showEWS: false,
      featured: true,
      speed: 30
    },
    // 9. d2p/dt2
    {
      id: 'd2p-dt2',
      title: '∂²p/∂t² vs Seconds',
      field: 'd2p/dt2',
      chartType: 'derivative',
      showAttackRegion: true,
      showEWS: false,
      featured: true,
      speed: 30
    },
    // 10. d2b/dt2
    {
      id: 'd2b-dt2',
      title: '∂²b/∂t² vs Seconds',
      field: 'd2b/dt2',
      chartType: 'derivative',
      showAttackRegion: true,
      showEWS: false,
      featured: true,
      speed: 30
    },
    // 11-14. Individual alert levels (1-4)
    {
      id: 'alert-level-1',
      title: 'Level 1 Alerts - Flow Packets/s',
      field: 'Flow Packets/s',
      chartType: 'alert-levels-separately',
      alertLevel: 1,
      showAttackRegion: true,
      showEWS: true,
      featured: true,
      speed: 30
    },
    {
      id: 'alert-level-2',
      title: 'Level 2 Alerts - Flow Packets/s',
      field: 'Flow Packets/s',
      chartType: 'alert-levels-separately',
      alertLevel: 2,
      showAttackRegion: true,
      showEWS: true,
      featured: true,
      speed: 30
    },
    {
      id: 'alert-level-3',
      title: 'Level 3 Alerts - Flow Packets/s',
      field: 'Flow Packets/s',
      chartType: 'alert-levels-separately',
      alertLevel: 3,
      showAttackRegion: true,
      showEWS: true,
      featured: true,
      speed: 30
    },
    {
      id: 'alert-level-4',
      title: 'Level 4 Alerts - Flow Packets/s',
      field: 'Flow Packets/s',
      chartType: 'alert-levels-separately',
      alertLevel: 4,
      showAttackRegion: true,
      showEWS: true,
      featured: true,
      speed: 30
    },
    // 15. Emergency Alerts
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
    // 16. All Alerts
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
    // 17. Flow with EWS
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

  // Add a useMemo to filter out specific chart types
  const filteredCharts = useMemo(() => {
    return allCharts.filter(chart => {
      // Remove confusion matrix chart from animated display
      return chart.id !== 'ews-confusion-matrix';
    });
  }, [allCharts]);

  // Listen for plotsGenerated event
  useEffect(() => {
    // Handler for plots generated event
    const handlePlotsGenerated = () => {
      console.log("Plots generated event received");
      setPlotsGenerated(true);
      
      // Play a beep sound
      const beep = new Audio("data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU");
      beep.volume = 0.5;
      beep.play().catch(err => console.error("Error playing beep:", err));
      
      // Or use a more elaborate sound
      try {
        const successSound = new Audio("/notification.mp3");
        successSound.volume = 0.3;
        successSound.play().catch(err => console.error("Error playing sound:", err));
      } catch (err) {
        console.error("Could not play notification sound:", err);
      }
    };
    
    // Add event listener
    document.addEventListener('plotsGenerated', handlePlotsGenerated);
    
    // Cleanup
    return () => {
      document.removeEventListener('plotsGenerated', handlePlotsGenerated);
    };
  }, []);
  
  // Reset plotsGenerated when new results are received
  useEffect(() => {
    if (results && results.cleanedDf && results.cleanedDf.length > 0) {
      setPlotsGenerated(false);
    }
  }, [results]);

  // Check if we have the required data for charts
  const hasRequiredData = () => {
    if (!results || !results.cleanedDf || results.cleanedDf.length === 0) {
      console.log("Missing required data for charts");
      return false;
    }

    const sample = results.cleanedDf[0];
    const requiredFields = ['Seconds', 'Flow Packets/s', 'Flow Bytes/s', 'Label'];
    const missingFields = requiredFields.filter(field => !(field in sample));
    
    if (missingFields.length > 0) {
      console.log("Missing required fields for charts:", missingFields);
      return false;
    }
    
    return true;
  };

  useEffect(() => {
    // Log information about the data we have for charts
    console.log("ChartGrid received results with data length:", results?.cleanedDf?.length || 0);
    
    if (results?.cleanedDf?.length > 0) {
      console.log("Sample data for charts:", results.cleanedDf[0]);
    }
    
    if (results?.plotData) {
      console.log("Plot data available:", Object.keys(results.plotData));
    }
  }, [results]);

  // If we don't have the required data, show a message
  if (!hasRequiredData()) {
    return (
      <div className="p-8 bg-gray-100 rounded-lg text-center">
        <h2 className="text-xl font-semibold mt-6 border-b pb-2">Animated Network Analysis Charts</h2>
        <p className="text-sm text-gray-500 mt-4">
          Insufficient data available for charts. Please check the capture file or try again.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gray-100 p-6 rounded-lg mb-8">
      <h2 className="text-xl font-semibold mt-2 border-b pb-2">Animated Network Analysis Charts</h2>
      <p className="text-sm text-gray-500 mt-2 mb-4">Each chart has controls for pausing/playing, adjusting plotting speed, and a fullscreen option. Click the fullscreen icon to view a chart in detail.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
        {filteredCharts.map(chart => (
          <div key={chart.id} className="p-4 border rounded-lg shadow-sm bg-white hover:shadow-md transition">
            <h3 className="text-lg font-medium mb-4 text-blue-800">{chart.title}</h3>
            <AnimatedChart 
              data={results.cleanedDf} 
              field={chart.field}
              plotData={results.plotData}
              chartType={chart.chartType}
              showEWS={chart.showEWS}
              showAttackRegion={chart.showAttackRegion}
              title={chart.title}
              speed={chart.speed}
              isAnalysisRunning={isAnalysisRunning}
              chartId={chart.id}
            />
          </div>
        ))}
      </div>
    </div>
  );
} 