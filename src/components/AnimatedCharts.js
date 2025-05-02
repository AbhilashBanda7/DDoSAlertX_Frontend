import React, { useState, useEffect, useRef } from 'react';
import { Line, Scatter } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  annotationPlugin
);

export default function AnimatedCharts({ 
  data, 
  field,
  plotData,
  chartType = 'standard',
  speed = 30, // Faster default animation speed
  showEWS = false,
  showAttackRegion = false,
  title = ""
}) {
  // frame = number of points drawn so far
  const [frame, setFrame] = useState(1);
  const [animationSpeed, setAnimationSpeed] = useState(speed);
  const [isComplete, setIsComplete] = useState(false);
  const [showStats, setShowStats] = useState(false);
  
  const maxFrames = data.length;
  const timerRef = useRef(null);
  const chartRef = useRef(null);

  // Animation effect - resets when speed changes
  useEffect(() => {
    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    // Skip if animation is complete
    if (isComplete) return;
    
    // Set new timer with updated speed
    timerRef.current = setInterval(() => {
      setFrame(f => {
        if (f >= maxFrames) {
          clearInterval(timerRef.current);
          setIsComplete(true);
          
          // Create and dispatch a custom event when animation completes
          if (chartType === 'flow-with-ews') {
            // This is the last chart in the sequence
            const event = new CustomEvent('animationComplete', { detail: { chartId: chartType } });
            document.dispatchEvent(event);
          }
          
          return f;
        }
        return f + 1;
      });
    }, animationSpeed);

    return () => clearInterval(timerRef.current);
  }, [maxFrames, animationSpeed, isComplete, chartType]);

  // Colors from data_processing.py
  const colors = {
    benign: 'green',    // From plot_benign_attack, plot_Flow_Packets_s, etc.
    attack: 'red',      // From plot_benign_attack, plot_Flow_Packets_s, etc.
    trafficFlow: 'gray', // From plot_early_warnings, plot_alert_levels_separately
    flowPackets: 'blue', // From plot_Flow_Packets_s_with_Attack_EWS
    // Alert level colors from plot_alert_levels_separately and plot_All_alerts
    ews1: 'green',
    ews2: 'orange',
    ews3: 'red',
    ews4: 'purple',
    // Attack markers colors
    attackStart: 'red',
    attackStop: 'darkred',
    peakStart: 'purple', // From plot_test_peak_region
    peakPoint: {
      marker: 'black',
      line: 'blue'
    },
    earlyWarning: 'red',
    // EWS line colors from plot_Flow_Packets_s_with_Attack_EWS
    ewsLines: ['green', 'orange', 'purple'],
    // Peak attack color from plot_Flow_Packets_s_with_Attack_EWS
    peakAttack: 'purple',
    // Emergency alert color from generate_emergency_alerts
    emergency: 'red'
  };

  // slice off just the first `frame` rows
  const slice = data.slice(0, frame);
  const labels = slice.map(r => r.Seconds);
  const values = slice.map(r => r[field] ?? null);
  
  // For benign vs attack plots
  const benignRows = slice.filter(r => r.Label === 'BENIGN');
  const attackRows = slice.filter(r => r.Label !== 'BENIGN');
  
  const benignData = benignRows.map(r => ({ x: r.Seconds, y: r[field] }));
  const attackData = attackRows.map(r => ({ x: r.Seconds, y: r[field] }));

  // Different datasets for different chart types
  const chartDatasets = [];
  const annotations = {};
  
  // Set up datasets based on chart type
  switch(chartType) {
    case 'benign-attack':
      // Basic benign vs attack plot (like plot_benign_attack)
      chartDatasets.push({
        label: 'Benign',
        data: benignData,
        borderColor: colors.benign,
        backgroundColor: colors.benign,
        pointRadius: 0,
        borderWidth: 2
      });
      
      chartDatasets.push({
        label: 'Attack',
        data: attackData, 
        borderColor: colors.attack,
        backgroundColor: colors.attack,
        pointRadius: 0,
        borderWidth: 2
      });
      break;
    
    case 'derivative':
      // For derivative plots (dp/dt, db/dt, d2p/dt2, d2b/dt2)
      // These use benign/attack split like plot_dp_dt, etc.
      chartDatasets.push({
        label: 'Benign',
        data: benignData,
        borderColor: colors.benign,
        backgroundColor: colors.benign,
        pointRadius: 0,
        borderWidth: 2
      });
      
      chartDatasets.push({
        label: 'Attack',
        data: attackData, 
        borderColor: colors.attack,
        backgroundColor: colors.attack,
        pointRadius: 0,
        borderWidth: 2
      });
      break;
      
    case 'peak-region':
      // For peak region chart (like plot_test_peak_region)
      chartDatasets.push({
        label: 'Benign',
        data: benignData,
        borderColor: colors.benign,
        backgroundColor: colors.benign,
        pointRadius: 0,
        borderWidth: 2
      });
      
      chartDatasets.push({
        label: 'Attack',
        data: attackData, 
        borderColor: colors.attack,
        backgroundColor: colors.attack,
        pointRadius: 0,
        borderWidth: 2
      });
      
      // Add attack start/peak markers if we have attack data
      if (plotData?.first_attack_idx !== -1 && attackRows.length > 0) {
        // Only add if we've reached that frame
        if (frame > plotData?.first_attack_idx) {
          // Get attack start timestamp
          const attackTime = data[plotData.first_attack_idx].Seconds;
          annotations.attackStart = {
            type: 'line',
            xMin: attackTime,
            xMax: attackTime,
            borderColor: colors.peakStart, // purple from plot_test_peak_region
            borderWidth: 2,
            borderDash: [6, 3],
            label: {
              display: true,
              content: 'Attack Start',
              position: 'start',
              color: 'purple',
              font: { weight: 'bold' }
            }
          };
        }
        
        // Find peak point if we have attack data and frame has reached it
        if (attackRows.length > 0) {
          const peakIdx = attackRows.reduce((maxIdx, row, idx, arr) => 
            row[field] > arr[maxIdx][field] ? idx : maxIdx, 0);
          
          if (peakIdx < attackRows.length) {
            const peakTime = attackRows[peakIdx].Seconds;
            const lastFrameIdx = data.findIndex(r => r.Seconds === peakTime);
            
            if (frame > lastFrameIdx) {
              annotations.peakPoint = {
                type: 'line',
                xMin: peakTime,
                xMax: peakTime,
                borderColor: colors.peakPoint.line,
                borderWidth: 2,
                borderDash: [6, 3],
                label: {
                  display: true,
                  content: 'Peak Point',
                  position: 'start',
                  color: 'blue',
                  font: { weight: 'bold' }
                }
              };
              
              // Add peak marker - black X marker as in plot_test_peak_region
              chartDatasets.push({
                label: 'Peak Point',
                data: [{ x: peakTime, y: attackRows[peakIdx][field] }],
                backgroundColor: colors.peakPoint.marker,
                borderColor: colors.peakPoint.marker,
                pointRadius: 5,
                pointStyle: 'crossRot',
                showLine: false
              });
            }
          }
        }
      }
      break;
      
    case 'early-warnings':
      // For early warnings overlay (like plot_early_warnings)
      // Base traffic flow - gray line as in the original plot
      chartDatasets.push({
        label: 'Traffic Flow',
        data: values.map((v, i) => ({ x: labels[i], y: v })),
        borderColor: colors.trafficFlow,
        backgroundColor: colors.trafficFlow,
        pointRadius: 0,
        borderWidth: 1
      });
      
      // Color by class
      const uniqueLabels = [...new Set(slice.map(r => r.Label))];
      uniqueLabels.forEach((label, idx) => {
        const labelData = slice
          .filter(r => r.Label === label)
          .map(r => ({ x: r.Seconds, y: r[field] }));
        
        chartDatasets.push({
          label: label,
          data: labelData,
          borderColor: `hsl(${(idx * 137) % 360}, 70%, 60%)`,
          backgroundColor: `hsl(${(idx * 137) % 360}, 70%, 60%)`,
          pointRadius: 2,
          showLine: false
        });
      });
      
      // Add EWS points if they exist - red dots as in plot_early_warnings
      if (showEWS && slice.some(r => r.EWS > 0)) {
        const warningPoints = slice
          .filter(r => r.EWS > 0)
          .filter((_, i) => i % 10 === 0) // Show only 1 of every 10 warnings
          .map(r => ({ x: r.Seconds, y: r[field] }));
        
        chartDatasets.push({
          label: 'Early Warning (1 per 10)',
          data: warningPoints,
          borderColor: colors.earlyWarning,
          backgroundColor: colors.earlyWarning,
          pointRadius: 3,
          pointStyle: 'circle',
          showLine: false,
          zOrder: 5
        });
      }
      break;
      
    case 'ews-confusion':
      // Skip chart creation for this specialized type
      // Not easily visualized with line/scatter chart
      break;
      
    case 'alerts':
      // For displaying all alert levels (like plot_All_alerts)
      // Base traffic flow - gray line as in the original plot
      chartDatasets.push({
        label: 'Traffic Flow',
        data: values.map((v, i) => ({ x: labels[i], y: v })),
        borderColor: colors.trafficFlow,
        backgroundColor: colors.trafficFlow,
        pointRadius: 0,
        borderWidth: 1
      });
      
      // Add points for each alert level
      [1, 2, 3, 4].forEach(level => {
        const levelPoints = slice
          .filter(r => r.EWS === level)
          .map(r => ({ x: r.Seconds, y: r[field] }));
        
        if (levelPoints.length === 0) return;
        
        const levelColor = colors[`ews${level}`];
        const levelMap = {1: 'Low', 2: 'Medium', 3: 'High', 4: 'Very High'};
        chartDatasets.push({
          label: `${levelMap[level]} Alert - ${levelPoints.length}`,
          data: levelPoints,
          borderColor: levelColor,
          backgroundColor: levelColor,
          pointRadius: 4,
          pointStyle: 'circle',
          showLine: false
        });
      });
      
      // Add attack region markers
      if (showAttackRegion && plotData?.attack_indices?.length > 0) {
        const attackIndices = plotData.attack_indices;
        const firstAttackIdx = attackIndices[0];
        const lastAttackIdx = attackIndices[attackIndices.length - 1];
        
        if (frame > firstAttackIdx) {
          const startTime = data[firstAttackIdx].Seconds;
          annotations.attackStart = {
            type: 'line',
            xMin: startTime,
            xMax: startTime,
            borderColor: colors.attackStart,
            borderWidth: 2,
            borderDash: [6, 3],
            label: {
              display: true,
              content: 'Attack Start',
              position: 'start',
              color: colors.attackStart,
              font: { weight: 'bold' }
            }
          };
          
          if (frame > lastAttackIdx) {
            const endTime = data[lastAttackIdx].Seconds;
            annotations.attackEnd = {
              type: 'line',
              xMin: endTime,
              xMax: endTime,
              borderColor: colors.attackStop,
              borderWidth: 2,
              borderDash: [6, 3],
              label: {
                display: true,
                content: 'Attack Stop',
                position: 'start',
                color: colors.attackStop,
                font: { weight: 'bold' }
              }
            };
          }
        }
      }
      break;
      
    case 'flow-with-ews':
      // For flow with EWS alerts (like plot_Flow_Packets_s_with_Attack_EWS)
      chartDatasets.push({
        label: field,
        data: values.map((v, i) => ({ x: labels[i], y: v })),
        borderColor: colors.flowPackets,
        backgroundColor: `rgba(0, 0, 255, 0.1)`,
        pointRadius: 0,
        borderWidth: 2,
        fill: false
      });
      
      // Add attack region markers
      if (showAttackRegion && plotData?.attack_indices?.length > 0) {
        const attackIndices = plotData.attack_indices;
        const firstAttackIdx = attackIndices[0];
        const lastAttackIdx = attackIndices[attackIndices.length - 1];
        
        if (frame > firstAttackIdx) {
          const startTime = data[firstAttackIdx].Seconds;
          annotations.attackStart = {
            type: 'line',
            xMin: startTime,
            xMax: startTime,
            borderColor: colors.attackStart,
            borderWidth: 2,
            borderDash: [6, 3],
            label: {
              display: true,
              content: 'Start',
              position: 'start',
              color: colors.attackStart,
              font: { weight: 'bold' }
            },
            zOrder: 4
          };
          
          if (frame > lastAttackIdx) {
            const endTime = data[lastAttackIdx].Seconds;
            annotations.attackEnd = {
              type: 'line',
              xMin: endTime,
              xMax: endTime,
              borderColor: colors.attackStop,
              borderWidth: 2,
              borderDash: [6, 3],
              label: {
                display: true,
                content: 'Stop',
                position: 'start',
                color: colors.attackStop,
                font: { weight: 'bold' }
              },
              zOrder: 4
            };
          }
        }
        
        // Find peak point in attack traffic
        if (attackRows.length > 0) {
          const peakIdx = attackRows.reduce((maxIdx, row, idx, arr) => 
            row[field] > arr[maxIdx][field] ? idx : maxIdx, 0);
          
          if (peakIdx < attackRows.length) {
            const peakTime = attackRows[peakIdx].Seconds;
            const peakValue = attackRows[peakIdx][field];
            const lastFrameIdx = data.findIndex(r => r.Seconds === peakTime);
            
            if (frame > lastFrameIdx) {
              chartDatasets.push({
                label: 'Peak Attack',
                data: [{ x: peakTime, y: peakValue }],
                backgroundColor: colors.peakAttack,
                borderColor: colors.peakAttack,
                pointRadius: 8,
                pointStyle: 'star',
                showLine: false,
                zOrder: 6
              });
              
              // Add peak text label
              annotations.peakLabel = {
                type: 'label',
                xValue: peakTime + 10,
                yValue: peakValue - 0.1 * peakValue,
                content: `peak_second\n${peakTime.toFixed(2)}s`,
                color: 'darkred',
                font: {
                  weight: 'bold',
                  size: 9
                }
              };
            }
          }
        }
      }
      
      // Add first 3 high alerts (EWS Level 4)
      if (showEWS && plotData?.ews_alerts?.level4) {
        const highAlerts = plotData.ews_alerts.level4.slice(0, 3);
        
        highAlerts.forEach((idx, i) => {
          if (frame > idx) {
            const sec = data[idx].Seconds;
            const flow = data[idx][field];
            const color = colors.ewsLines[i % colors.ewsLines.length];
            
            annotations[`ews-${i}`] = {
              type: 'line',
              xMin: sec,
              xMax: sec,
              borderColor: color,
              borderWidth: 2,
              borderDash: [6, 2],
              label: {
                display: true,
                content: `EWS ${i+1}\n${sec.toFixed(2)}s`,
                position: 'start',
                color: color,
                font: { weight: 'bold' }
              },
              zOrder: 6
            };
            
            chartDatasets.push({
              label: `EWS ${i+1}`,
              data: [{ x: sec, y: flow }],
              backgroundColor: color,
              borderColor: color,
              pointRadius: 6,
              pointStyle: 'crossRot',
              showLine: false,
              zOrder: 5
            });
          }
        });
      }
      break;
      
    case 'alert-levels-separately':
      // This would be multiple charts, one per level
      // Base traffic flow - gray as in the original plot
      chartDatasets.push({
        label: 'Traffic Flow',
        data: values.map((v, i) => ({ x: labels[i], y: v })),
        borderColor: colors.trafficFlow,
        backgroundColor: colors.trafficFlow,
        pointRadius: 0,
        borderWidth: 1
      });
      
      // Only show requested alert level
      const alertLevel = parseInt(title.split(' ')[0]) || 0;
      if (alertLevel >= 1 && alertLevel <= 4) {
        const levelColor = colors[`ews${alertLevel}`]; 
        const levelMap = {1: 'Low', 2: 'Medium', 3: 'High', 4: 'Very High'};
        const levelPoints = slice
          .filter(r => r.EWS === alertLevel)
          .map(r => ({ x: r.Seconds, y: r[field] }));
        
        chartDatasets.push({
          label: `${levelMap[alertLevel]} Alert - ${levelPoints.length}`,
          data: levelPoints,
          borderColor: levelColor,
          backgroundColor: levelColor,
          pointRadius: 4,
          pointStyle: 'circle',
          showLine: false
        });
      }
      
      // Add attack markers
      if (showAttackRegion && plotData?.attack_indices?.length > 0) {
        const attackIndices = plotData.attack_indices;
        const firstAttackIdx = attackIndices[0];
        const lastAttackIdx = attackIndices[attackIndices.length - 1];
        
        if (frame > firstAttackIdx) {
          const startTime = data[firstAttackIdx].Seconds;
          annotations.attackStart = {
            type: 'line',
            xMin: startTime,
            xMax: startTime,
            borderColor: colors.attackStart,
            borderWidth: 2,
            borderDash: [6, 3],
            label: {
              display: true,
              content: 'Attack Start',
              position: 'start',
              color: colors.attackStart,
              font: { weight: 'bold' }
            }
          };
          
          if (frame > lastAttackIdx) {
            const endTime = data[lastAttackIdx].Seconds;
            annotations.attackEnd = {
              type: 'line',
              xMin: endTime,
              xMax: endTime,
              borderColor: colors.attackStop,
              borderWidth: 2,
              borderDash: [6, 3],
              label: {
                display: true,
                content: 'Attack Stop',
                position: 'start',
                color: colors.attackStop,
                font: { weight: 'bold' }
              }
            };
          }
        }
      }
      break;
      
    case 'emergency-alerts':
      // For emergency alerts (like generate_emergency_alerts)
      chartDatasets.push({
        label: field,
        data: values.map((v, i) => ({ x: labels[i], y: v })),
        borderColor: colors.flowPackets,
        backgroundColor: `rgba(0, 0, 255, 0.1)`,
        pointRadius: 0,
        borderWidth: 1,
        fill: false
      });
      
      // Add emergency alerts (EWS level 4)
      if (plotData?.ews_alerts?.level4) {
        const emergencyAlerts = slice
          .filter((_, i) => plotData.ews_alerts.level4.includes(i))
          .map(r => ({ x: r.Seconds, y: r[field] }));
        
        chartDatasets.push({
          label: 'Emergency Alerts',
          data: emergencyAlerts,
          borderColor: colors.emergency,
          backgroundColor: colors.emergency,
          pointRadius: 5,
          pointStyle: 'crossRot',
          showLine: false
        });
      }
      break;
      
    default:
      // Standard single-line chart for metrics (Flow_Packets_s, etc.)
      // For these plots, we also split benign/attack like plot_Flow_Packets_s
      chartDatasets.push({
        label: 'Benign',
        data: benignData,
        borderColor: colors.benign,
        backgroundColor: colors.benign,
        pointRadius: 0,
        borderWidth: 2
      });
      
      chartDatasets.push({
        label: 'Attack',
        data: attackData, 
        borderColor: colors.attack,
        backgroundColor: colors.attack,
        pointRadius: 0,
        borderWidth: 2
      });
      
      // Add attack region if requested
      if (showAttackRegion && plotData?.attack_indices?.length > 0) {
        const attackIndices = plotData.attack_indices;
        const firstAttackIdx = attackIndices[0];
        const lastAttackIdx = attackIndices[attackIndices.length - 1];
        
        if (frame > firstAttackIdx) {
          annotations.attackStart = {
            type: 'line',
            xMin: data[firstAttackIdx].Seconds,
            xMax: data[firstAttackIdx].Seconds,
            borderColor: colors.attackStart,
            borderWidth: 2,
            borderDash: [6, 3],
            label: {
              display: true,
              content: 'Attack Start',
              position: 'start',
              color: colors.attackStart,
              font: { weight: 'bold' }
            }
          };
          
          if (frame > lastAttackIdx) {
            annotations.attackEnd = {
              type: 'line',
              xMin: data[lastAttackIdx].Seconds,
              xMax: data[lastAttackIdx].Seconds,
              borderColor: colors.attackStop,
              borderWidth: 2,
              borderDash: [6, 3],
              label: {
                display: true,
                content: 'Attack End',
                position: 'start',
                color: colors.attackStop,
                font: { weight: 'bold' }
              }
            };
          }
        }
      }
      
      // Add EWS alerts if enabled
      if (showEWS && plotData?.ews_alerts) {
        const ewsColors = {
          level1: colors.ews1,
          level2: colors.ews2,
          level3: colors.ews3,
          level4: colors.ews4
        };
        
        Object.entries(plotData.ews_alerts).forEach(([level, indices]) => {
          indices.forEach((idx, i) => {
            if (frame > idx) {
              const color = ewsColors[level];
              annotations[`ews-${level}-${i}`] = {
                type: 'point',
                xValue: data[idx].Seconds,
                yValue: data[idx][field],
                backgroundColor: color,
                borderColor: 'white',
                borderWidth: 1,
                radius: 4
              };
            }
          });
        });
      }
      break;
  }

  const chartData = {
    labels,
    datasets: chartDatasets
  };

  // Set chart title based on props or chart type
  let chartTitle = title || `${field} Over Time`;
  if (isComplete) {
    chartTitle += ' (Complete)';
  }

  // Add grid lines to match matplotlib's default appearance
  const options = {
    animation: false,
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: { 
        title: { display: true, text: 'Seconds' },
        ticks: { maxTicksLimit: 10 },
        grid: { display: true, color: 'rgba(0,0,0,0.1)' }
      },
      y: { 
        title: { display: true, text: field },
        beginAtZero: true,
        grid: { display: true, color: 'rgba(0,0,0,0.1)' }
      }
    },
    plugins: {
      legend: { display: true, position: 'top' },
      annotation: { annotations },
      title: {
        display: true,
        text: chartTitle,
        font: { size: 16 }
      }
    },
    elements: {
      line: {
        tension: 0.0 // No curve to match matplotlib's straight lines
      },
      point: {
        radius: 0 // Hide points on the lines
      }
    }
  };

  // Handle speed slider change
  const handleSpeedChange = (e) => {
    const newSpeed = parseInt(e.target.value);
    setAnimationSpeed(newSpeed);
  };

  // Calculate and format alert statistics
  const generateAlertStats = () => {
    if (!plotData || !data || data.length === 0) return [];
    
    // Find attack peak time
    const attackIndices = plotData.attack_indices || [];
    if (attackIndices.length === 0) return [];
    
    const peakIdx = attackIndices.reduce((maxIdx, idx) => 
      data[idx]['Flow Packets/s'] > data[maxIdx]['Flow Packets/s'] ? idx : maxIdx, 
      attackIndices[0]
    );
    const peakTime = data[peakIdx].Seconds;
    
    // Get alerts data specifically for the ones actually shown in the chart
    const alertStats = [];

    // For the Flow with EWS chart, we specifically show the first 3 high alerts
    // corresponding to the colored vertical lines in the plot
    const highAlerts = plotData.ews_alerts?.level4 || [];
    const firstThreeHighAlerts = highAlerts.slice(0, 3);
    
    // Add the shown EWS markers (the ones with vertical lines)
    firstThreeHighAlerts.forEach((alertIdx, i) => {
      const alertSecond = data[alertIdx].Seconds;
      alertStats.push({
        level: `EWS ${i+1}`,
        second: alertSecond,
        timeBeforeAttackPeak: Math.round(peakTime - alertSecond),
        peakAttackTime: peakTime
      });
    });
    
    return alertStats;
  };

  return (
    <div>
      <div style={{ height: "400px" }}>
        <Line ref={chartRef} data={chartData} options={options} />
      </div>
      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center space-x-2 w-full">
          <span className="text-sm text-gray-600 w-24">Animation Speed:</span>
          <input 
            type="range" 
            min="10" 
            max="100" 
            step="5" 
            value={animationSpeed}
            onChange={handleSpeedChange}
            className="w-full"
          />
          <span className="text-sm text-gray-600 w-20 text-right">{animationSpeed}ms</span>
        </div>
        <div className="text-sm text-gray-500 ml-4">
          {frame}/{maxFrames} points
        </div>
      </div>
      
      {/* Add View Statistics button for flow-with-ews chart */}
      {chartType === 'flow-with-ews' && (
        <div className="mt-4 text-right">
          <button 
            onClick={() => setShowStats(!showStats)}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            {showStats ? 'Close Statistics' : 'View Statistics'}
          </button>
        </div>
      )}
      
      {/* Alert Statistics Table Popup */}
      {showStats && chartType === 'flow-with-ews' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Alert Statistics</h2>
              <button 
                onClick={() => setShowStats(false)}
                className="px-4 py-2 bg-gray-500 text-white rounded"
              >
                Close
              </button>
            </div>
            
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-2 text-left">ALERT</th>
                  <th className="border p-2 text-left">SECOND</th>
                  <th className="border p-2 text-left">TIME BEFORE ATTACK PEAK (S)</th>
                  <th className="border p-2 text-left">PEAK ATTACK TIME (S)</th>
                </tr>
              </thead>
              <tbody>
                {generateAlertStats().map((stat, index) => (
                  <tr key={index}>
                    <td className="border p-2">{stat.level}</td>
                    <td className="border p-2">{Math.round(stat.second)}</td>
                    <td className="border p-2">{stat.timeBeforeAttackPeak}</td>
                    <td className="border p-2">{Math.round(stat.peakAttackTime)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
} 