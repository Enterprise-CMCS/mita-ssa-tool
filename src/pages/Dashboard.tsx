/**
 * Dashboard page - Central hub for viewing and managing capability assessments
 */

import { JSX, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  InputAdornment,
  Paper,
  Snackbar,
  Alert,
  TextField,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { DashboardStats, DomainTable, TagFilter, DeleteDialog } from '../components/dashboard';
import { useCapabilityAssessments, useScores, useHistory } from '../hooks';
import { getAllDomains, getAreaById } from '../services/capabilities';

type DeleteTarget =
  | { type: 'assessment'; areaId: string; areaName: string }
  | { type: 'history'; historyId: string };

/**
 * Main dashboard page component
 */
export default function Dashboard(): JSX.Element {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const { startAssessment, editAssessment, deleteAssessment, getAssessmentForArea } =
    useCapabilityAssessments();
  const { getStatusCounts, getOverallScore, getAllTagsInUse } = useScores();
  const { deleteHistoryEntry } = useHistory();

  const domains = getAllDomains();
  const statusCounts = getStatusCounts();
  const overallScore = getOverallScore();
  const availableTags = getAllTagsInUse();

  const showSnackbar = (message: string, severity: 'success' | 'error'): void => {
    setSnackbar({ open: true, message, severity });
  };

  const handleStartAssessment = useCallback(
    async (areaId: string) => {
      try {
        const assessmentId = await startAssessment(areaId);
        navigate(`/assessment/${assessmentId}`);
      } catch {
        showSnackbar('Failed to start assessment', 'error');
      }
    },
    [startAssessment, navigate]
  );

  const handleResumeAssessment = useCallback(
    (areaId: string) => {
      const assessment = getAssessmentForArea(areaId);
      if (assessment) {
        navigate(`/assessment/${assessment.id}`);
      }
    },
    [getAssessmentForArea, navigate]
  );

  const handleEditAssessment = useCallback(
    async (areaId: string) => {
      const assessment = getAssessmentForArea(areaId);
      if (assessment) {
        try {
          await editAssessment(assessment.id);
          navigate(`/assessment/${assessment.id}`);
        } catch {
          showSnackbar('Failed to edit assessment', 'error');
        }
      }
    },
    [getAssessmentForArea, editAssessment, navigate]
  );

  const handleViewAssessment = useCallback(
    (areaId: string) => {
      const assessment = getAssessmentForArea(areaId);
      if (assessment) {
        navigate(`/assessment/${assessment.id}?view=true`);
      }
    },
    [getAssessmentForArea, navigate]
  );

  const handleDeleteAssessment = useCallback((areaId: string) => {
    const area = getAreaById(areaId);
    if (area) {
      setDeleteTarget({ type: 'assessment', areaId, areaName: area.name });
    }
  }, []);

  const handleViewHistory = useCallback(
    (historyId: string) => {
      navigate(`/history/${historyId}`);
    },
    [navigate]
  );

  const handleDeleteHistory = useCallback((historyId: string) => {
    setDeleteTarget({ type: 'history', historyId });
  }, []);

  const confirmDelete = async (): Promise<void> => {
    if (!deleteTarget) return;

    try {
      if (deleteTarget.type === 'assessment') {
        const assessment = getAssessmentForArea(deleteTarget.areaId);
        if (assessment) {
          await deleteAssessment(assessment.id);
          showSnackbar('Assessment deleted', 'success');
        }
      } else {
        await deleteHistoryEntry(deleteTarget.historyId);
        showSnackbar('History entry deleted', 'success');
      }
    } catch {
      showSnackbar('Failed to delete', 'error');
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Assessment Dashboard
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        View all capability domains and manage your MITA maturity assessments
      </Typography>

      {/* Stats Summary */}
      <DashboardStats
        total={statusCounts.total}
        finalized={statusCounts.finalized}
        inProgress={statusCounts.inProgress}
        notStarted={statusCounts.notStarted}
        overallScore={overallScore}
      />

      {/* Filter Bar */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box
          sx={{
            display: 'flex',
            gap: 2,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <TextField
            size="small"
            placeholder="Search capabilities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            inputProps={{
              'aria-label': 'Search capabilities by name, description, or topic',
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" aria-hidden="true" />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 250 }}
          />
          <TagFilter
            selectedTags={selectedTags}
            onChange={setSelectedTags}
            availableTags={availableTags}
          />
          {(searchQuery || selectedTags.length > 0) && (
            <Typography variant="body2" color="text.secondary">
              Filtering results...
            </Typography>
          )}
        </Box>
      </Paper>

      {/* Domain Table */}
      <DomainTable
        domains={domains}
        searchQuery={searchQuery}
        selectedTags={selectedTags}
        onStartAssessment={handleStartAssessment}
        onResumeAssessment={handleResumeAssessment}
        onEditAssessment={handleEditAssessment}
        onViewAssessment={handleViewAssessment}
        onDeleteAssessment={handleDeleteAssessment}
        onViewHistory={handleViewHistory}
        onDeleteHistory={handleDeleteHistory}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteDialog
        open={deleteTarget !== null}
        title={deleteTarget?.type === 'assessment' ? 'Delete Assessment?' : 'Delete History Entry?'}
        message={
          deleteTarget?.type === 'assessment'
            ? `Are you sure you want to delete the assessment for "${deleteTarget.areaName}"? This action cannot be undone.`
            : 'Are you sure you want to delete this history entry? This action cannot be undone.'
        }
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          variant="filled"
          role="status"
          aria-live="polite"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}
