/**
 * Action menu for capability area rows
 * Uses ••• button style matching mita-3.0
 */

import { JSX, useState } from 'react';
import { Button, Menu, MenuItem } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import HistoryIcon from '@mui/icons-material/History';
import DeleteIcon from '@mui/icons-material/Delete';

type Status = 'not_started' | 'in_progress' | 'finalized';

interface ActionMenuProps {
  status: Status;
  hasHistory: boolean;
  onStart: () => void;
  onResume: () => void;
  onEdit: () => void;
  onView: () => void;
  onDelete: () => void;
  onViewHistory: () => void;
}

/**
 * Action menu with context-sensitive options based on assessment status
 */
export function ActionMenu({
  status,
  hasHistory,
  onResume,
  onEdit,
  onView,
  onDelete,
  onViewHistory,
}: ActionMenuProps): JSX.Element {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>): void => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleClose = (): void => {
    setAnchorEl(null);
  };

  const handleAction = (action: () => void): void => {
    handleClose();
    action();
  };

  return (
    <>
      <Button
        size="small"
        variant="outlined"
        onClick={handleClick}
        aria-label="actions"
        aria-controls={open ? 'action-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={open ? 'true' : undefined}
        sx={{
          textTransform: 'none',
          minWidth: 64,
          py: 0.25,
          fontSize: '0.875rem',
        }}
      >
        •••
      </Button>
      <Menu
        id="action-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {status === 'in_progress' && (
          <MenuItem onClick={() => handleAction(onView)}>
            <VisibilityIcon fontSize="small" sx={{ mr: 1 }} />
            View
          </MenuItem>
        )}
        {status === 'in_progress' && (
          <MenuItem onClick={() => handleAction(onResume)}>
            <PlayArrowIcon fontSize="small" sx={{ mr: 1 }} />
            Resume
          </MenuItem>
        )}
        {status === 'in_progress' && (
          <MenuItem onClick={() => handleAction(onDelete)} sx={{ color: 'error.main' }}>
            <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
            Delete
          </MenuItem>
        )}

        {status === 'finalized' && (
          <MenuItem onClick={() => handleAction(onView)}>
            <VisibilityIcon fontSize="small" sx={{ mr: 1 }} />
            View
          </MenuItem>
        )}
        {status === 'finalized' && (
          <MenuItem onClick={() => handleAction(onEdit)}>
            <EditIcon fontSize="small" sx={{ mr: 1 }} />
            Edit
          </MenuItem>
        )}
        {hasHistory && (
          <MenuItem onClick={() => handleAction(onViewHistory)}>
            <HistoryIcon fontSize="small" sx={{ mr: 1 }} />
            View History
          </MenuItem>
        )}
        {status === 'finalized' && (
          <MenuItem onClick={() => handleAction(onDelete)} sx={{ color: 'error.main' }}>
            <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
            Delete
          </MenuItem>
        )}
      </Menu>
    </>
  );
}
