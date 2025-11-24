import { useState } from 'react';

import { StorageProvider, useStorageContext, StorageStatus } from '../components/storage';

/**
 * Example component that uses the storage context
 */
function StorageExample() {
  const {
    isInitialized,
    isStorageAvailable,
    isLoading,
    error,
    assessmentSummaries,
    deleteAssessment,
    exportAssessment,
  } = useStorageContext();

  const [exportStatus, setExportStatus] = useState<string>('');

  // Handle assessment export
  const handleExport = async (id: string) => {
    try {
      setExportStatus(`Exporting assessment ${id}...`);
      const blob = await exportAssessment(id);

      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `assessment-${id}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExportStatus(`Assessment ${id} exported successfully`);
    } catch (err) {
      setExportStatus(`Export failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // Handle assessment deletion
  const handleDelete = async (id: string) => {
    if (window.confirm(`Are you sure you want to delete assessment ${id}?`)) {
      const success = await deleteAssessment(id);
      if (success) {
        alert(`Assessment ${id} deleted successfully`);
      } else {
        alert('Failed to delete assessment');
      }
    }
  };

  if (!isInitialized || isLoading) {
    return <div>Loading storage...</div>;
  }

  if (error) {
    return (
      <div>
        <h2>Storage Error</h2>
        <p>{error.message}</p>
      </div>
    );
  }

  if (!isStorageAvailable) {
    return (
      <div>
        <h2>Storage Unavailable</h2>
        <p>Browser storage is not available. Your assessment data will not be saved.</p>
      </div>
    );
  }

  return (
    <div className="storage-example">
      <h1>Storage Example</h1>

      <div className="storage-example__status">
        <h2>Storage Status</h2>
        <StorageStatus showDetails={true} />
      </div>

      <div className="storage-example__assessments">
        <h2>Saved Assessments</h2>

        {assessmentSummaries.length === 0 ? (
          <p>No assessments found</p>
        ) : (
          <table className="assessment-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>State</th>
                <th>Status</th>
                <th>Completion</th>
                <th>Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {assessmentSummaries.map(assessment => (
                <tr key={assessment.id}>
                  <td>{assessment.id}</td>
                  <td>{assessment.stateName}</td>
                  <td>{assessment.status}</td>
                  <td>{assessment.completionPercentage}%</td>
                  <td>{new Date(assessment.updatedAt).toLocaleDateString()}</td>
                  <td>
                    <button onClick={() => handleExport(assessment.id)}>Export</button>
                    <button onClick={() => handleDelete(assessment.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {exportStatus && <div className="export-status">{exportStatus}</div>}
      </div>
    </div>
  );
}

/**
 * Example page demonstrating the Storage Service
 */
export default function StorageExamplePage() {
  return (
    <StorageProvider>
      <StorageExample />
    </StorageProvider>
  );
}
