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

export default function AnimatedChart({ 
  data, 
  field,
  plotData,
  chartType = 'standard',
  speed = 100, // animation speed in ms
  showEWS = false,
  showAttackRegion = false,
  title = "",
  colors = {
    benign: 'rgba(0,128,0,1)',     // green for benign
    attack: 'rgba(255,0,0,1)',     // red for attack
    standard: 'rgba(75,192,192,1)', // teal for standard
    highlight: 'rgba(255,165,0,1)', // orange for highlights
    ews1: 'green',
    ews2: 'orange',
    ews3: 'red',
    ews4: 'purple'
  }
}) {
  // frame = number of points drawn so far
  const [frame, setFrame] = useState(1);
  const [isPaused, setIsPaused] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  
  const maxFrames = data.length;
  const timerRef = useRef(null);
  const chartRef = useRef(null);

  // restart animation
  const restart = () => {
    clearInterval(timerRef.current);
    setFrame(1);
    setIsPaused(false);
    setIsComplete(false);
  };

  // toggle animation pause state
  const togglePause = () => {
    setIsPaused(prev => !prev);
  };

  // Animation effect
  useEffect(() => {
    if (isPaused || isComplete) return;
    
    // advance frame by 1 every X ms until we hit max
    timerRef.current = setInterval(() => {
      setFrame(f => {
        if (f >= maxFrames) {
          clearInterval(timerRef.current);
          setIsComplete(true);
          return f;
        }
        return f + 1;
      });
    }, speed);

    return () => clearInterval(timerRef.current);
  }, [maxFrames, speed, isPaused, isComplete]);

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
            borderColor: 'rgba(128, 0, 128, 0.7)', // purple
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
                borderColor: 'rgba(0, 0, 255, 0.7)', // blue
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
              
              // Add peak marker
              chartDatasets.push({
                label: 'Peak Point',
                data: [{ x: peakTime, y: attackRows[peakIdx][field] }],
                backgroundColor: 'black',
                borderColor: 'black',
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
      // Base traffic flow
      chartDatasets.push({
        label: 'Traffic Flow',
        data: values.map((v, i) => ({ x: labels[i], y: v })),
        borderColor: 'gray',
        backgroundColor: 'gray',
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
      
      // Add EWS points if they exist
      if (showEWS && slice.some(r => r.EWS > 0)) {
        const warningPoints = slice
          .filter(r => r.EWS > 0)
          .filter((_, i) => i % 10 === 0) // Show only 1 of every 10 warnings
          .map(r => ({ x: r.Seconds, y: r[field] }));
        
        chartDatasets.push({
          label: 'Early Warning',
          data: warningPoints,
          borderColor: 'red',
          backgroundColor: 'red',
          pointRadius: 3,
          pointStyle: 'circle',
          showLine: false
        });
      }
      break;
      
    case 'ews-confusion':
      // Skip chart creation for this specialized type
      // Not easily visualized with line/scatter chart
      break;
      
    case 'alerts':
      // For displaying all alert levels (like plot_all_alerts)
      // Base traffic flow
      chartDatasets.push({
        label: 'Traffic Flow',
        data: values.map((v, i) => ({ x: labels[i], y: v })),
        borderColor: 'gray',
        backgroundColor: 'gray',
        pointRadius: 0,
        borderWidth: 1
      });
      
      // Add points for each alert level
      [1, 2, 3, 4].forEach(level => {
        const levelPoints = slice
          .filter(r => r.EWS === level)
          .map(r => ({ x: r.Seconds, y: r[field] }));
        
        const levelColor = colors[`ews${level}`];
        chartDatasets.push({
          label: `Level ${level} Alert`,
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
            borderColor: 'rgba(255, 0, 0, 0.7)',
            borderWidth: 2,
            borderDash: [6, 3],
            label: {
              display: true,
              content: 'Attack Start',
              position: 'start',
              color: 'red',
              font: { weight: 'bold' }
            }
          };
          
          if (frame > lastAttackIdx) {
            const endTime = data[lastAttackIdx].Seconds;
            annotations.attackEnd = {
              type: 'line',
              xMin: endTime,
              xMax: endTime,
              borderColor: 'rgba(180, 0, 0, 0.7)',
              borderWidth: 2,
              borderDash: [6, 3],
              label: {
                display: true,
                content: 'Attack Stop',
                position: 'start',
                color: 'darkred',
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
        borderColor: 'blue',
        backgroundColor: 'rgba(0, 0, 255, 0.1)',
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
            borderColor: 'rgba(255, 0, 0, 0.7)',
            borderWidth: 2,
            borderDash: [6, 3],
            label: {
              display: true,
              content: 'Start',
              position: 'start',
              color: 'red',
              font: { weight: 'bold' }
            }
          };
          
          if (frame > lastAttackIdx) {
            const endTime = data[lastAttackIdx].Seconds;
            annotations.attackEnd = {
              type: 'line',
              xMin: endTime,
              xMax: endTime,
              borderColor: 'rgba(180, 0, 0, 0.7)',
              borderWidth: 2,
              borderDash: [6, 3],
              label: {
                display: true,
                content: 'Stop',
                position: 'start',
                color: 'darkred',
                font: { weight: 'bold' }
              }
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
                backgroundColor: 'purple',
                borderColor: 'purple',
                pointRadius: 8,
                pointStyle: 'star',
                showLine: false
              });
            }
          }
        }
      }
      
      // Add first 3 high alerts (EWS Level 4)
      if (showEWS && plotData?.ews_alerts?.level4) {
        const highAlerts = plotData.ews_alerts.level4.slice(0, 3);
        const colors = ['green', 'orange', 'purple'];
        
        highAlerts.forEach((idx, i) => {
          if (frame > idx) {
            const sec = data[idx].Seconds;
            const flow = data[idx][field];
            
            annotations[`ews-${i}`] = {
              type: 'line',
              xMin: sec,
              xMax: sec,
              borderColor: colors[i],
              borderWidth: 2,
              borderDash: [6, 2],
              label: {
                display: true,
                content: `EWS ${i+1}`,
                position: 'start',
                color: colors[i],
                font: { weight: 'bold' }
              }
            };
            
            chartDatasets.push({
              label: `EWS ${i+1}`,
              data: [{ x: sec, y: flow }],
              backgroundColor: colors[i],
              borderColor: colors[i],
              pointRadius: 6,
              pointStyle: 'crossRot',
              showLine: false
            });
          }
        });
      }
      break;
      
    case 'alert-levels-separately':
      // This would be multiple charts, one per level
      // Base traffic flow
      chartDatasets.push({
        label: 'Traffic Flow',
        data: values.map((v, i) => ({ x: labels[i], y: v })),
        borderColor: 'gray',
        backgroundColor: 'gray',
        pointRadius: 0,
        borderWidth: 1
      });
      
      // Only show requested alert level
      const alertLevel = parseInt(title.split(' ')[0]) || 0;
      if (alertLevel >= 1 && alertLevel <= 4) {
        const levelColor = colors[`ews${alertLevel}`]; 
        const levelPoints = slice
          .filter(r => r.EWS === alertLevel)
          .map(r => ({ x: r.Seconds, y: r[field] }));
        
        chartDatasets.push({
          label: `Level ${alertLevel} Alert`,
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
            borderColor: 'rgba(255, 0, 0, 0.7)',
            borderWidth: 2,
            borderDash: [6, 3],
            label: {
              display: true,
              content: 'Attack Start',
              position: 'start',
              color: 'red',
              font: { weight: 'bold' }
            }
          };
          
          if (frame > lastAttackIdx) {
            const endTime = data[lastAttackIdx].Seconds;
            annotations.attackEnd = {
              type: 'line',
              xMin: endTime,
              xMax: endTime,
              borderColor: 'rgba(180, 0, 0, 0.7)',
              borderWidth: 2,
              borderDash: [6, 3],
              label: {
                display: true,
                content: 'Attack Stop',
                position: 'start',
                color: 'darkred',
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
        borderColor: 'blue',
        backgroundColor: 'rgba(0, 0, 255, 0.1)',
        pointRadius: 0,
        borderWidth: 2,
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
          borderColor: 'red',
          backgroundColor: 'red',
          pointRadius: 5,
          pointStyle: 'crossRot',
          showLine: false
        });
      }
      break;
      
    default:
      // Standard single-line chart for metrics
      chartDatasets.push({
      label: field,
      data: values,
        borderColor: colors.standard,
      fill: false,
      tension: 0.1,
      pointRadius: 0
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
            borderColor: 'rgba(255, 0, 0, 0.7)',
            borderWidth: 2,
            borderDash: [6, 3],
            label: {
              display: true,
              content: 'Attack Start',
              position: 'start',
              color: 'red',
              font: { weight: 'bold' }
            }
          };
          
          if (frame > lastAttackIdx) {
            annotations.attackEnd = {
              type: 'line',
              xMin: data[lastAttackIdx].Seconds,
              xMax: data[lastAttackIdx].Seconds,
              borderColor: 'rgba(180, 0, 0, 0.7)',
              borderWidth: 2,
              borderDash: [6, 3],
              label: {
                display: true,
                content: 'Attack End',
                position: 'start',
                color: 'darkred',
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
  } else {
    chartTitle += ' (Animating...)';
  }

  const options = {
    animation: false,
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: { 
        title: { display: true, text: 'Seconds' },
        ticks: { maxTicksLimit: 10 }
      },
      y: { 
        title: { display: true, text: field },
        beginAtZero: true
      }
    },
    plugins: {
      legend: { display: true },
      annotation: { annotations },
      title: {
        display: true,
        text: chartTitle,
        font: { size: 16 }
      }
    },
    elements: {
      line: {
        tension: 0.3 // slightly smoother lines
      }
    }
  };

  return (
    <div>
      <div style={{ height: "400px" }}>
        <Line ref={chartRef} data={chartData} options={options} />
      </div>
      <div className="flex justify-between mt-2">
        <button 
          onClick={restart}
          className="px-2 py-1 bg-blue-500 text-white text-sm rounded"
        >
          Restart
        </button>
        <button 
          onClick={togglePause}
          className="px-2 py-1 bg-gray-500 text-white text-sm rounded"
        >
          {isPaused ? 'Play' : 'Pause'}
        </button>
        <div className="text-sm text-gray-500">
          {frame}/{maxFrames} frames
        </div>
      </div>
    </div>
  );
}
