import React from 'react';

export default function UploadForm({
  file,
  setFile,
  loading,
  handleUpload,
  showWorkingTables,
  toggleWorkingTables,
  results
}) {
  return (
    <div className="glass-card p-6 rounded-xl shadow-xl bg-gray-800/80 border border-gray-700 mb-8">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Upload Network Traffic CSV
          </label>
          <div className="upload-area p-6 h-24 flex items-center">
            <input
              type="file"
              accept=".csv"
              onChange={e => setFile(e.target.files[0])}
              className="block w-full text-sm text-gray-400
                      file:mr-4 file:py-2.5 file:px-4
                      file:rounded-full file:border file:border-gray-600
                      file:text-sm file:font-medium
                      file:bg-gray-700 file:text-blue-400
                      hover:file:bg-gray-600 hover:file:text-blue-300
                      file:transition-colors"
            />
            <div className="ml-4 text-gray-400 text-sm">
              {file ? (
                <span className="text-blue-400">{file.name}</span>
              ) : (
                "Select a CSV file to analyze"
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-3 mb-1">
          <button
            onClick={handleUpload}
            disabled={!file || loading}
            className="btn-primary rounded-full py-2.5 px-6 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Process Data
              </>
            )}
          </button>

          {results && (
            <button
              onClick={toggleWorkingTables}
              className="btn-secondary rounded-full py-2.5 px-6 flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              {showWorkingTables ? 'Hide Working' : 'Show Working'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
} 