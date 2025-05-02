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
import * as d3 from 'd3';

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
  title = "",
  isAnalysisRunning = true,
  chartId = ""
}) {
  // frame = number of points drawn so far
  const [frame, setFrame] = useState(1);
  const [animationSpeed, setAnimationSpeed] = useState(speed);
  const [isComplete, setIsComplete] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [paused, setPaused] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [dataError, setDataError] = useState(null);
  
  const maxFrames = data?.length || 0;
  const timerRef = useRef(null);
  const chartRef = useRef(null);
  const chartContainerRef = useRef(null);
  const animationRef = useRef(null);
  const svgRef = useRef(null);

  // Validate data and field existence immediately
  useEffect(() => {
    // Reset data error state
    setDataError(null);
    
    // Check if we have valid data to work with
    if (!data || data.length === 0) {
      console.error(`Chart ${chartId}: No data provided`);
      setDataError("No data available");
      return;
    }
    
    // Verify the field exists in the data
    const sample = data[0];
    if (!sample || !(field in sample)) {
      console.error(`Chart ${chartId}: Field "${field}" not found in data`);
      console.log("Available fields:", Object.keys(sample || {}));
      setDataError(`Field "${field}" not found in data`);
      return;
    }
    
    console.log(`Chart ${chartId}: Data validation passed, ${data.length} records available`);
    console.log(`Chart ${chartId}: First few values:`, data.slice(0, 5).map(d => d[field]));
    
    // Reset animation if data changes
    setFrame(1);
    setIsComplete(false);
    
  }, [data, field, chartId]);

  // Debug logs to diagnose data issues
  useEffect(() => {
    console.log(`Chart ${chartId} data count:`, data?.length || 0);
    console.log(`Chart ${chartId} field:`, field);
    if (data && data.length > 0) {
      const sample = data[0];
      console.log(`Sample data keys:`, Object.keys(sample));
      console.log(`Sample field value:`, sample[field]);
    }
  }, [data, field, chartId]);

  // Listen for stop all animations event
  useEffect(() => {
    const handleStopAllAnimations = () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setPaused(true);
      setIsComplete(true);
    };

    document.addEventListener('stopAllAnimations', handleStopAllAnimations);
    
    return () => {
      document.removeEventListener('stopAllAnimations', handleStopAllAnimations);
    };
  }, []);

  // Update when isAnalysisRunning changes
  useEffect(() => {
    if (!isAnalysisRunning && timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
      setPaused(true);
    }
  }, [isAnalysisRunning]);

  // Update when isAnalysisRunning changes - don't automatically pause
  useEffect(() => {
    // We no longer automatically pause when analysis completes
    // When a capture stops, we want the animation to continue
    console.log(`Chart ${chartId}: Analysis running state changed to ${isAnalysisRunning}`);
    
    // Only restart if the animation was manually paused by the user
    if (isAnalysisRunning && paused && timerRef.current === null) {
      console.log(`Chart ${chartId}: Restarting animation that was manually paused`);
      setPaused(false);
    }
  }, [isAnalysisRunning, paused, chartId]);

  // Animation effect - resets when speed changes or pause state changes
  useEffect(() => {
    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // Skip animation if we have data errors
    if (dataError) {
      console.log(`Chart ${chartId}: Animation paused due to data error:`, dataError);
      return;
    }
    
    // Skip if animation is complete or paused - but don't pause when analysis stops
    if (isComplete || paused) {
      console.log(`Chart ${chartId}: Animation paused - complete:${isComplete}, paused:${paused}`);
      return;
    }
    
    // Ensure we have valid data and a field to plot
    if (!data || data.length === 0 || !field) {
      console.log(`Chart ${chartId}: Can't start animation - missing data or field`);
      return;
    }
    
    console.log(`Chart ${chartId}: Starting animation at ${animationSpeed}ms intervals, current frame: ${frame}/${maxFrames}`);
    
    // Set new timer with updated speed - use requestAnimationFrame for smoother animation
    const startAnimation = () => {
      if (frame >= maxFrames) {
        console.log(`Chart ${chartId}: Animation complete at frame ${frame}/${maxFrames}`);
        setIsComplete(true);
        
        // Create and dispatch a custom event when animation completes
        if (chartType === 'flow-with-ews') {
          // This is the last chart in the sequence
          document.dispatchEvent(new CustomEvent('animationComplete', { 
            detail: { chartId: chartType } 
          }));
          
          // Also dispatch plottingEnded event for notification
          document.dispatchEvent(new CustomEvent('plottingEnded'));
        }
        return;
      }
      
      // Check for attack start event
      if (plotData?.attack_indices?.length > 0) {
        const firstAttackIdx = plotData.attack_indices[0];
        const lastAttackIdx = plotData.attack_indices[plotData.attack_indices.length - 1];
        
        // If we just crossed the attack start threshold
        if (frame === firstAttackIdx - 1 && frame + 1 === firstAttackIdx) {
          // Trigger attack started event
          document.dispatchEvent(new CustomEvent('attackDetected'));
          document.dispatchEvent(new CustomEvent('playAttackStartedSound'));
        }
        
        // If we just crossed the attack end threshold
        if (frame === lastAttackIdx - 1 && frame + 1 === lastAttackIdx) {
          // Trigger attack ended event
          document.dispatchEvent(new CustomEvent('attackEnded'));
          document.dispatchEvent(new CustomEvent('playAttackEndedSound'));
        }
      }
      
      // Check for EWS alerts in flow-with-ews chart
      if (chartType === 'flow-with-ews' && showEWS && plotData?.ews_alerts?.level4) {
        const highAlerts = plotData.ews_alerts.level4.slice(0, 3);
        highAlerts.forEach((alertIdx, i) => {
          // Only trigger when we cross the alert threshold
          if (frame === alertIdx - 1 && frame + 1 === alertIdx) {
            // Trigger EWS alert detected event with the specific EWS number
            document.dispatchEvent(new CustomEvent('ewsAlertDetected', { 
              detail: { ewsNumber: i + 1 } 
            }));
            document.dispatchEvent(new CustomEvent('playEWSAlertSound'));
          }
        });
      }
      
      // Increment frame using functional update to avoid stale closures
      setFrame(prevFrame => Math.min(prevFrame + 1, maxFrames));
      
      // Schedule next animation frame
      animationRef.current = setTimeout(startAnimation, animationSpeed);
    };
    
    // Start the animation
    timerRef.current = setTimeout(startAnimation, animationSpeed);
    
    // Cleanup on unmount or when dependencies change
    return () => {
      if (animationRef.current) {
        clearTimeout(animationRef.current);
        animationRef.current = null;
      }
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [maxFrames, animationSpeed, isComplete, chartType, paused, plotData, showEWS, isAnalysisRunning, field, data, frame, dataError, chartId]);

  // Toggle pause/play
  const togglePause = () => {
    console.log(`Chart ${chartId}: Toggling pause state from ${paused} to ${!paused}`);
    setPaused(prev => !prev);
  };

  // Toggle fullscreen mode for the chart
  const toggleFullscreen = () => {
    if (!isFullscreen) {
      // Enter fullscreen mode
      const chartContainer = chartContainerRef.current;
      if (chartContainer) {
        if (chartContainer.requestFullscreen) {
          chartContainer.requestFullscreen();
        } else if (chartContainer.webkitRequestFullscreen) {
          chartContainer.webkitRequestFullscreen();
        } else if (chartContainer.msRequestFullscreen) {
          chartContainer.msRequestFullscreen();
        }
        setIsFullscreen(true);
      }
    } else {
      // Exit fullscreen
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  // Listen for fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

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
  // Ensure we don't try to access non-existent data
  const slice = data && data.length > 0 ? data.slice(0, Math.min(frame, data.length)) : [];
  const labels = slice.map(r => r.Seconds || 0);
  const values = slice.map(r => r[field] !== undefined ? r[field] : null);
  
  // For benign vs attack plots - with additional error handling
  const benignRows = slice.filter(r => r.Label === 'BENIGN');
  const attackRows = slice.filter(r => r.Label !== 'BENIGN');
  
  const benignData = benignRows.map(r => ({ 
    x: r.Seconds || 0, 
    y: r[field] !== undefined ? r[field] : null 
  }));
  
  const attackData = attackRows.map(r => ({ 
    x: r.Seconds || 0, 
    y: r[field] !== undefined ? r[field] : null 
  }));

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
        
        // Ensure we have exactly 3 highAlerts to display (or as many as possible)
        const displayAlerts = highAlerts.length >= 3 ? highAlerts.slice(0, 3) : highAlerts;
        
        // Always show the alerts found, even if fewer than 3
        displayAlerts.forEach((idx, i) => {
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
    setAnimationSpeed(parseInt(e.target.value));
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
    <div ref={chartContainerRef} className={`relative ${isFullscreen ? 'fullscreen-chart' : ''}`}>
      {dataError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-80 z-20">
          <div className="bg-white p-4 rounded-lg shadow-lg">
            <h3 className="text-red-600 font-bold">Chart Error</h3>
            <p>{dataError}</p>
          </div>
        </div>
      )}
      
      <div className="absolute top-0 right-0 z-10 flex space-x-2 p-2">
        <button 
          onClick={togglePause}
          className="p-1 bg-gray-800 rounded text-white hover:bg-gray-700 transition-colors"
          title={paused ? "Play" : "Pause"}
          disabled={dataError !== null}
        >
          {paused ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
        </button>
        <button
          onClick={toggleFullscreen}
          className="p-1 bg-gray-800 rounded text-white hover:bg-gray-700 transition-colors"
          title="Fullscreen"
          disabled={dataError !== null}
        >
          {isFullscreen ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 8h-3v3m4 4h3v-3m-4-8h-3v3m8 0h3v-3m-4 8h3v-3m-8 0h-3v3" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
            </svg>
          )}
        </button>
      </div>

      <div className="pt-2">
        <Line
          ref={chartRef}
          data={{
            labels: labels,
            datasets: chartDatasets
          }}
          options={{
            responsive: true,
            animation: false,
            interaction: {
              mode: 'index',
              intersect: false,
            },
            scales: {
              x: {
                title: {
                  display: true,
                  text: 'Time (seconds)',
                  color: '#94a3b8'
                },
                grid: {
                  color: 'rgba(148, 163, 184, 0.1)'
                },
                ticks: {
                  color: '#94a3b8'
                }
              },
              y: {
                title: {
                  display: true,
                  text: field,
                  color: '#94a3b8'
                },
                grid: {
                  color: 'rgba(148, 163, 184, 0.1)'
                },
                ticks: {
                  color: '#94a3b8'
                }
              }
            },
            plugins: {
              annotation: {
                annotations: annotations
              },
              legend: {
                position: 'top',
                labels: {
                  color: '#94a3b8',
                  boxWidth: 12,
                  padding: 10
                }
              },
              tooltip: {
                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                titleColor: '#e2e8f0',
                bodyColor: '#e2e8f0',
                borderColor: 'rgba(148, 163, 184, 0.2)',
                borderWidth: 1,
                padding: 10,
                boxPadding: 5
              }
            }
          }}
        />
      </div>

      <div className="flex flex-wrap justify-between mt-4 items-center">
        <div className="w-full md:w-auto mb-2 md:mb-0">
          <div className="flex items-center">
            <label htmlFor={`speed-${chartId}`} className="text-sm text-gray-500 mr-3">Plotting Speed:</label>
            <input
              id={`speed-${chartId}`}
              type="range"
              min="5"
              max="100"
              value={animationSpeed}
              onChange={handleSpeedChange}
              className="w-32 h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer"
              disabled={dataError !== null}
            />
            <span className="ml-2 text-sm text-gray-500">{animationSpeed}ms</span>
          </div>
        </div>

        <div className="w-full md:w-auto flex justify-between items-center">
          <div className="text-sm text-gray-500">
            <span className="font-medium">Frame:</span> {frame}/{maxFrames}
          </div>
          
          {(chartType === 'flow-with-ews' || chartType === 'alerts') && !dataError && (
            <button
              onClick={() => setShowStats(!showStats)}
              className="ml-4 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              {showStats ? 'Hide Stats' : 'View Statistics'}
            </button>
          )}
        </div>
      </div>

      {showStats && (chartType === 'flow-with-ews' || chartType === 'alerts') && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg shadow-lg p-6 max-w-2xl w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">Alert Statistics</h2>
              <button 
                onClick={() => setShowStats(false)}
                className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition"
              >
                Close
              </button>
            </div>
            
            <div className="mb-4 grid grid-cols-2 gap-4">
              <div className="bg-gray-700 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-white mb-2">Alert Counts</h3>
                <div className="space-y-1">
                  <p className="text-gray-200"><span className="inline-block w-24 text-green-400">Low:</span> {data.filter(r => r.EWS === 1).length} alerts</p>
                  <p className="text-gray-200"><span className="inline-block w-24 text-yellow-400">Medium:</span> {data.filter(r => r.EWS === 2).length} alerts</p>
                  <p className="text-gray-200"><span className="inline-block w-24 text-orange-400">High:</span> {data.filter(r => r.EWS === 3).length} alerts</p>
                  <p className="text-gray-200"><span className="inline-block w-24 text-red-400">Very High:</span> {data.filter(r => r.EWS === 4).length} alerts</p>
                </div>
              </div>
              
              <div className="bg-gray-700 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-white mb-2">Attack Info</h3>
                <div className="space-y-1">
                  <p className="text-gray-200"><span className="inline-block w-32 text-purple-400">First Attack:</span> At {plotData?.first_attack_idx} seconds</p>
                  <p className="text-gray-200"><span className="inline-block w-32 text-red-400">Attack Points:</span> {plotData?.attack_indices.length} points</p>
                </div>
              </div>
            </div>
            
            {/* Only show EWS Alert Details for flow-with-ews chart */}
            {chartType === 'flow-with-ews' && (
              <>
                <h3 className="text-lg font-semibold text-white mb-2">EWS Alert Details</h3>
                <div className="overflow-auto max-h-64">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-900">
                        <th className="border border-gray-700 p-2 text-left text-gray-200">ALERT</th>
                        <th className="border border-gray-700 p-2 text-left text-gray-200">SECOND</th>
                        <th className="border border-gray-700 p-2 text-left text-gray-200">TIME BEFORE ATTACK PEAK (S)</th>
                        <th className="border border-gray-700 p-2 text-left text-gray-200">PEAK ATTACK TIME (S)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {generateAlertStats().map((stat, index) => (
                        <tr key={index} className={index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-700'}>
                          <td className="border border-gray-600 p-2 text-gray-200">{stat.level}</td>
                          <td className="border border-gray-600 p-2 text-gray-200">{Math.round(stat.second)}</td>
                          <td className="border border-gray-600 p-2 text-gray-200">{stat.timeBeforeAttackPeak}</td>
                          <td className="border border-gray-600 p-2 text-gray-200">{Math.round(stat.peakAttackTime)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 