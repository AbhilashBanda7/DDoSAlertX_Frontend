import React, { useState, useEffect } from 'react';
import DataTable from './DataTable';

export default function TablesPanel({ results, workingTables }) {
  const [currentTableIndex, setCurrentTableIndex] = useState(0);
  
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

  // Generate table data based on current index
  const getTableData = () => {
    // Check if we have pre-processed table data
    if (results.tableDf && Array.isArray(results.tableDf) && results.tableDf.length > currentTableIndex) {
      console.log(`Using pre-processed table data for table ${currentTableIndex}`);
      return results.tableDf[currentTableIndex];
    }
    
    // Fallback to generating tables from cleanedDf
    console.log(`Generating table data for table ${currentTableIndex}`);
    
    switch (currentTableIndex) {
      case 0:
        return results.cleanedDf.map(row => ({
          'Seconds': row['Seconds'] || 0,
          'Flow Packets/s': row['Flow Packets/s'] || 0,
          'Flow Bytes/s': row['Flow Bytes/s'] || 0,
          'Label': row['Label'] || 'UNKNOWN'
        }));
      case 1:
        return results.cleanedDf.map(row => {
          // Get derivative values with fallbacks for different column names
          const dpdt = row['dp/dt'] || row['DP/DT'] || 0;
          const dbdt = row['db/dt'] || row['DB/DT'] || 0;
          const d2pdt2 = row['d2p/dt2'] || row['D2P/DT2'] || 0;
          const d2bdt2 = row['d2b/dt2'] || row['D2B/DT2'] || 0;
          
          return {
            'Seconds': row['Seconds'] || 0,
            '∂p/∂t': dpdt,
            '∂b/∂t': dbdt,
            '∂²p/∂t²': d2pdt2,
            '∂²b/∂t²': d2bdt2,
            'R1': row['R1'] || 0,
            'R2': row['R2'] || 0
          };
        });
      case 2:
        return results.cleanedDf.map(row => ({
          'Seconds': row['Seconds'] || 0,
          'Label': row['Label'] || 'UNKNOWN',
          'Pre Label': row['Pre Label'] || '-',
          'MAX_Z_Score': row['MAX_Z_Score'] || 0,
          'CR': row['CR'] || 0
        }));
      case 3:
        // Alert Statistics Table for EWS levels
        if (results.plotData && results.plotData.ews_alerts) {
          return [1, 2, 3, 4].map(level => {
            const alertCount = (results.plotData.ews_alerts[`level${level}`] || []).length;
            const firstAlertIdx = (results.plotData.ews_alerts[`level${level}`] || [])[0];
            const firstAlertTime = firstAlertIdx !== undefined 
              ? results.cleanedDf[firstAlertIdx]?.Seconds 
              : '-';
              
            return {
              'ALERT LEVEL': level,
              'COUNT': alertCount,
              'FIRST ALERT TIME': firstAlertTime !== '-' ? Math.round(firstAlertTime) : '-',
              // Add severity class for styling
              'SEVERITY': level
            };
          });
        }
        
        // Fallback EWS table from cleanedDf
        return results.cleanedDf.map(row => ({
          'Seconds': row['Seconds'],
          'EWS': row['EWS'],
          'Z_Score_R1': row['Z_Score_R1'],
          'Z_Score_R2': row['Z_Score_R2'],
          'MAX_Z_Score': row['MAX_Z_Score']
        }));
      default:
        return [];
    }
  };

  useEffect(() => {
    // Log table data on mount or when results change
    console.log("TablesPanel mounted with data:", results);
    if (results.tableDf) {
      console.log("Pre-processed tables available:", results.tableDf.length);
    }
  }, [results]);

  return (
    <div className="card-container mt-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">
            {workingTables[currentTableIndex].title}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {workingTables[currentTableIndex].description}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="join">
            {workingTables.map((table, index) => (
              <button
                key={index}
                onClick={() => setCurrentTableIndex(index)}
                className={`join-item btn btn-sm ${currentTableIndex === index ? 'btn-primary' : 'btn-ghost'}`}
              >
                {index + 1}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      {/* Table content based on current index */}
      <div className="relative">
        <div className={`transition-opacity duration-300 ${currentTableIndex === 3 ? 'animate-fade-in' : ''}`}>
          <DataTable 
            rows={getTableData()} 
            title={workingTables[currentTableIndex].title}
          />
        </div>
        
        {/* Alert levels legend for the EWS table */}
        {currentTableIndex === 3 && (
          <div className="mt-4 flex flex-wrap gap-4">
            <div className="flex items-center">
              <span className="w-3 h-3 inline-block rounded-full bg-green-500 mr-2"></span>
              <span className="text-xs text-gray-600">Level 1 - Low</span>
            </div>
            <div className="flex items-center">
              <span className="w-3 h-3 inline-block rounded-full bg-yellow-500 mr-2"></span>
              <span className="text-xs text-gray-600">Level 2 - Medium</span>
            </div>
            <div className="flex items-center">
              <span className="w-3 h-3 inline-block rounded-full bg-orange-500 mr-2"></span>
              <span className="text-xs text-gray-600">Level 3 - High</span>
            </div>
            <div className="flex items-center">
              <span className="w-3 h-3 inline-block rounded-full bg-red-500 mr-2"></span>
              <span className="text-xs text-gray-600">Level 4 - Very High</span>
            </div>
          </div>
        )}
      </div>
      
      {/* Pagination controls */}
      <div className="flex justify-between items-center mt-6">
        <button 
          onClick={goToPreviousTable}
          disabled={currentTableIndex === 0}
          className="btn btn-outline btn-primary btn-sm gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Previous Table
        </button>
        
        <span className="text-sm font-medium text-gray-600">
          Table {currentTableIndex + 1} of {workingTables.length}
        </span>
        
        <button 
          onClick={goToNextTable}
          disabled={currentTableIndex === workingTables.length - 1}
          className="btn btn-outline btn-primary btn-sm gap-2"
        >
          Next Table
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
} 