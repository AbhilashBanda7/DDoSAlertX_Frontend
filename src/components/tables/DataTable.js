import React, { useState, useMemo } from 'react';

export default function DataTable({ rows, title }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  // Calculate pagination values - moved outside of any conditions
  const totalPages = useMemo(() => {
    if (!rows || rows.length === 0) return 0;
    return Math.ceil(rows.length / pageSize);
  }, [rows, pageSize]);
  
  const startIndex = useMemo(() => (currentPage - 1) * pageSize, [currentPage, pageSize]);
  
  // Current range info (x-y of z results)
  const rangeInfo = useMemo(() => {
    if (!rows || rows.length === 0) return "0 items";
    const start = rows.length === 0 ? 0 : startIndex + 1;
    const end = Math.min(startIndex + pageSize, rows.length);
    return `${start}-${end} of ${rows.length}`;
  }, [startIndex, pageSize, rows]);
  
  if (!rows || rows.length === 0) {
    return (
      <div className="glass-card p-8 text-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <p className="text-gray-400">No data available</p>
      </div>
    );
  }

  const visibleRows = rows.slice(startIndex, startIndex + pageSize);
  
  // Define the preferred column order
  const preferredColumnOrder = [
    "Seconds",
    "Flow Packets/s",
    "Flow Bytes/s",
    "∂p/∂t",
    "∂b/∂t",
    "∂²p/∂t²",
    "∂²b/∂t²",
    "R1",
    "R2",
    "CR",
    "Pre Label",
    "Z_Score_R1",
    "Z_Score_R2",
    "MAX_Z_Score",
    "EWS",
    "Label"
  ];
  
  // Map column names to display format
  const mapColumnName = (column) => {
    // Map derivative column names to proper mathematical notation
    const columnMapping = {
      'dp/dt': '∂p/∂t',
      'db/dt': '∂b/∂t',
      'd2p/dt2': '∂²p/∂t²',
      'd2b/dt2': '∂²b/∂t²',
      'Flow_packets_per_sec': 'Flow Packets/s',
      'Flow_bytes_per_sec': 'Flow Bytes/s',
      'flow_packets_s': 'Flow Packets/s',
      'flow_bytes_s': 'Flow Bytes/s'
    };
    
    return columnMapping[column] || column;
  };

  // Get available columns from data
  const availableColumns = Object.keys(rows[0]);
  
  // Sort columns based on preferred order
  const columns = [
    // First add columns in the preferred order if they exist in the data
    ...preferredColumnOrder.filter(col => {
      // Check if the column exists directly or needs mapping
      return availableColumns.includes(col) || 
             (col === '∂p/∂t' && availableColumns.includes('dp/dt')) ||
             (col === '∂b/∂t' && availableColumns.includes('db/dt')) ||
             (col === '∂²p/∂t²' && availableColumns.includes('d2p/dt2')) ||
             (col === '∂²b/∂t²' && availableColumns.includes('d2b/dt2'));
    }),
    // Then add any remaining columns not in the preferred order
    ...availableColumns.filter(col => {
      // Exclude derivative columns that will be mapped
      if (['dp/dt', 'db/dt', 'd2p/dt2', 'd2b/dt2'].includes(col)) {
        return false;
      }
      // Check if the column is already in the preferred order
      return !preferredColumnOrder.includes(col);
    })
  ];

  // Navigation functions
  const goToPage = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  // Format cell value based on type
  const formatCellValue = (value) => {
    if (typeof value === 'number') {
      // Format numbers with 2 decimal places if they have decimals
      return Number.isInteger(value) ? value : value.toFixed(2);
    }
    
    // Return as is for other types
    return value;
  };

  // Get cell color class based on column and value
  const getCellClass = (column, value) => {
    // Special styling for the EWS column to color based on value
    if (column === 'EWS' || column === 'SEVERITY') {
      const level = parseInt(value);
      if (level === 1) return 'bg-green-900/30 text-green-100';
      if (level === 2) return 'bg-yellow-900/30 text-yellow-100';
      if (level === 3) return 'bg-orange-900/30 text-orange-100';
      if (level === 4) return 'bg-red-900/30 text-red-100 font-medium';
    }
    
    // Special styling for the Label column (DDoS vs benign)
    if (column === 'Label' && value !== 'BENIGN') {
      return 'bg-red-900/30 text-red-100 font-medium';
    }
    
    return ''; // Default, no special styling
  };

  // Get the column value with handling for different possible column names
  const getColumnValue = (row, column) => {
    // Special handling for derivative columns that might have different names
    if (column === '∂p/∂t') {
      return row['dp/dt'] || row['DP/DT'] || row['∂p/∂t'] || 0;
    }
    if (column === '∂b/∂t') {
      return row['db/dt'] || row['DB/DT'] || row['∂b/∂t'] || 0;
    }
    if (column === '∂²p/∂t²') {
      return row['d2p/dt2'] || row['D2P/DT2'] || row['∂²p/∂t²'] || 0;
    }
    if (column === '∂²b/∂t²') {
      return row['d2b/dt2'] || row['D2B/DT2'] || row['∂²b/∂t²'] || 0;
    }
    // For other columns, just use the column name directly
    return row[column];
  };

  return (
    <div className="bg-gray-800 card-container overflow-hidden rounded-lg shadow-lg border border-gray-700">
      {title && (
        <div className="py-3 px-4 border-b border-gray-700 flex justify-between items-center bg-gray-800">
          <h3 className="text-lg font-semibold text-gray-100">{title}</h3>
          <span className="text-sm text-gray-400">{rangeInfo}</span>
        </div>
      )}
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-700">
          <thead className="bg-gray-800">
            <tr>
              {columns.map(column => (
                <th 
                  key={column} 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider"
                >
                  {mapColumnName(column)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-gray-700 divide-y divide-gray-600">
            {visibleRows.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-gray-600 transition-colors">
                {columns.map(column => (
                  <td 
                    key={`${rowIndex}-${column}`} 
                    className={`px-4 py-3 whitespace-nowrap text-sm text-gray-200 ${getCellClass(column, getColumnValue(row, column))}`}
                  >
                    {formatCellValue(getColumnValue(row, column))}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {totalPages > 1 && (
        <div className="py-3 px-4 border-t border-gray-700 flex justify-between items-center bg-gray-800">
          <div className="flex items-center text-sm text-gray-400">
            <span className="mr-2">Rows per page:</span>
            <select 
              className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={pageSize}
              onChange={e => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
            >
              {[5, 10, 25, 50].map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => goToPage(1)}
              disabled={currentPage === 1}
              className="p-1 rounded focus:outline-none text-gray-400 hover:text-blue-400 disabled:text-gray-600 disabled:cursor-not-allowed"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-1 rounded focus:outline-none text-gray-400 hover:text-blue-400 disabled:text-gray-600 disabled:cursor-not-allowed"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            <span className="px-3 py-1 text-sm text-gray-300 bg-gray-700 rounded-md">
              {currentPage} / {totalPages}
            </span>
            
            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-1 rounded focus:outline-none text-gray-400 hover:text-blue-400 disabled:text-gray-600 disabled:cursor-not-allowed"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <button
              onClick={() => goToPage(totalPages)}
              disabled={currentPage === totalPages}
              className="p-1 rounded focus:outline-none text-gray-400 hover:text-blue-400 disabled:text-gray-600 disabled:cursor-not-allowed"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 