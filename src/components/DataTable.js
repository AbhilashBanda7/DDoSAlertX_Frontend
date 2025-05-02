import React from 'react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

export default function DataTable({ rows }) {
  if (!rows || rows.length === 0) {
    return <p>No data to display.</p>;
  }

  // build column defs from the first row's keys
  const columnDefs = Object.keys(rows[0]).map(key => ({
    field: key,
    headerName: key.replace(/_/g, ' ')
  }));

  return (
    <div
      className="ag-theme-alpine"
      style={{ height: 400, width: '100%' }}
    >
      <AgGridReact
        rowData={rows}
        columnDefs={columnDefs}
        pagination={true}
        paginationPageSize={20}
      />
    </div>
  );
}
