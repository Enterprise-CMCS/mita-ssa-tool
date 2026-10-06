/**
 * Capability area row component for the dashboard table
 * Clean design matching mita-3.0 reference
 */

import { JSX, useState, Fragment } from 'react';
import { Box, Button, IconButton, TableCell, TableRow, Tooltip, Typography } from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { CapabilityProgressBar } from './ProgressBar';
import { ActionMenu } from './ActionMenu';
import { HistoryPanel } from './HistoryPanel';
import { TagsDisplay } from './TagsDisplay';
import { useHistory } from '../../hooks';
import type { CapabilityArea } from '../../types';

type Status = 'not_started' | 'in_progress' | 'finalized';

interface CapabilityRowProps {
  area: CapabilityArea;
  status: Status;
  score: number | null;
  tags: string[];
  completion: number;
  onStart: () => void;
  onResume: () => void;
  onEdit: () => void;
  onView: () => void;
  onDelete: () => void;
  onViewHistory: (historyId: string) => void;
  onDeleteHistory: (historyId: string) => void;
  indentLevel?: number;
}

/**
 * Table row for a single capability area
 */
export function CapabilityRow({
  area,
  status,
  score,
  tags,
  completion,
  onStart,
  onResume,
  onEdit,
  onView,
  onDelete,
  onViewHistory,
  onDeleteHistory,
  indentLevel = 1,
}: CapabilityRowProps): JSX.Element {
  const [historyOpen, setHistoryOpen] = useState(false);
  const { getHistoryCountForArea } = useHistory();
  const historyCount = getHistoryCountForArea(area.id);
  const hasHistory = historyCount > 0 || status === 'finalized';

  const toggleHistory = (): void => {
    setHistoryOpen(!historyOpen);
  };

  // Build tooltip content with description and topics
  const tooltipContent = (
    <Box>
      <Typography variant="body2" sx={{ mb: area.topics.length > 0 ? 1 : 0 }}>
        {area.description}
      </Typography>
      {area.topics.length > 0 && (
        <>
          <Typography variant="caption" fontWeight={600} sx={{ display: 'block', mb: 0.5 }}>
            Topics:
          </Typography>
          <Box component="ul" sx={{ m: 0, pl: 2 }}>
            {area.topics.map((topic) => (
              <Typography component="li" variant="caption" key={topic}>
                {topic}
              </Typography>
            ))}
          </Box>
        </>
      )}
    </Box>
  );

  return (
    <Fragment>
      <TableRow hover sx={{ backgroundColor: 'grey.50' }}>
        {/* Name with info icon */}
        <TableCell>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              pl: indentLevel * 3,
            }}
          >
            <Typography variant="body2">{area.name}</Typography>
            <Tooltip
              title={tooltipContent}
              placement="right"
              arrow
              enterDelay={200}
              slotProps={{
                tooltip: {
                  sx: { maxWidth: 400 },
                },
              }}
            >
              <InfoOutlinedIcon
                aria-hidden="true"
                sx={{
                  fontSize: 16,
                  color: 'text.disabled',
                  cursor: 'help',
                  '&:hover': { color: 'primary.main' },
                }}
              />
            </Tooltip>
          </Box>
        </TableCell>

        {/* Score */}
        <TableCell align="center">
          <Typography
            variant="body2"
            fontWeight={score !== null ? 500 : 400}
            color={score !== null ? 'text.primary' : 'text.disabled'}
          >
            {score !== null ? score.toFixed(1) : '—'}
          </Typography>
        </TableCell>

        {/* Tags */}
        <TableCell align="center">
          <TagsDisplay tags={tags} maxVisible={3} />
        </TableCell>

        {/* Status (progress bar) */}
        <TableCell>
          <CapabilityProgressBar status={status} progress={completion} />
        </TableCell>

        {/* Completion % */}
        <TableCell align="center">
          <Typography
            variant="body2"
            fontWeight={status === 'finalized' ? 500 : 400}
            color={
              status === 'finalized'
                ? 'success.main'
                : status === 'not_started'
                  ? 'text.disabled'
                  : 'text.secondary'
            }
          >
            {status === 'not_started' ? '—' : `${status === 'finalized' ? 100 : completion}%`}
          </Typography>
        </TableCell>

        {/* Action */}
        <TableCell align="center">
          {status === 'not_started' ? (
            hasHistory ? (
              <Tooltip title="View history">
                <IconButton
                  size="small"
                  onClick={toggleHistory}
                  sx={{ p: 0.25 }}
                  aria-expanded={historyOpen}
                  aria-label={`${historyOpen ? 'Hide' : 'View'} history for ${area.name}`}
                >
                  <HistoryIcon fontSize="small" aria-hidden="true" />
                </IconButton>
              </Tooltip>
            ) : (
              <Button
                size="small"
                variant="contained"
                onClick={onStart}
                sx={{
                  textTransform: 'none',
                  minWidth: 64,
                  py: 0.25,
                  fontSize: '0.75rem',
                }}
              >
                Start
              </Button>
            )
          ) : (
            <ActionMenu
              status={status}
              hasHistory={hasHistory}
              onStart={onStart}
              onResume={onResume}
              onEdit={onEdit}
              onView={onView}
              onDelete={onDelete}
              onViewHistory={toggleHistory}
            />
          )}
        </TableCell>
      </TableRow>

      {/* History Panel */}
      {historyOpen && (
        <TableRow>
          <TableCell colSpan={6} sx={{ backgroundColor: 'grey.100', py: 1 }}>
            <HistoryPanel
              capabilityAreaId={area.id}
              open={true}
              onViewHistory={onViewHistory}
              onDeleteHistory={onDeleteHistory}
            />
          </TableCell>
        </TableRow>
      )}
    </Fragment>
  );
}
