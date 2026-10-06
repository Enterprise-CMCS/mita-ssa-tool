/**
 * Attachment Upload Component
 *
 * Allows users to upload files as evidence for an aspect rating.
 * Files are stored locally in IndexedDB.
 */

import React, { JSX, useCallback, useState } from 'react';
import {
  Box,
  Button,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Typography,
  Paper,
  CircularProgress,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ImageIcon from '@mui/icons-material/Image';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import type { Attachment } from '../../types';

interface AttachmentUploadProps {
  attachments: Attachment[];
  onUpload: (file: File, description?: string) => Promise<void>;
  onDelete: (attachmentId: string) => Promise<void>;
  onDownload: (attachment: Attachment) => void;
  disabled?: boolean;
  maxFileSize?: number; // in bytes, default 10MB
  /** Unique identifier for this upload component (used for input ID) */
  uploadId?: string;
}

const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/png',
  'image/jpeg',
  'image/gif',
  'text/plain',
];

const DEFAULT_MAX_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Get icon for file type
 */
function getFileIcon(fileType: string): JSX.Element {
  if (fileType === 'application/pdf') {
    return <PictureAsPdfIcon color="error" />;
  }
  if (fileType.startsWith('image/')) {
    return <ImageIcon color="primary" />;
  }
  return <InsertDriveFileIcon color="action" />;
}

/**
 * Format file size for display
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Attachment upload and management component
 */
export function AttachmentUpload({
  attachments,
  onUpload,
  onDelete,
  onDownload,
  disabled = false,
  maxFileSize = DEFAULT_MAX_SIZE,
  uploadId,
}: AttachmentUploadProps): JSX.Element {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [descriptionDialog, setDescriptionDialog] = useState<{
    open: boolean;
    file: File | null;
  }>({ open: false, file: null });
  const [description, setDescription] = useState('');

  // Generate a unique ID for the file input to avoid conflicts when multiple
  // AttachmentUpload components are rendered on the same page
  const generatedId = React.useId();
  const inputId = uploadId ? `attachment-upload-${uploadId}` : `attachment-upload-${generatedId}`;

  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      // Validate file type
      if (!ALLOWED_TYPES.includes(file.type)) {
        setError('File type not supported. Please upload PDF, Word, Excel, images, or text files.');
        return;
      }

      // Validate file size
      if (file.size > maxFileSize) {
        setError(`File too large. Maximum size is ${formatFileSize(maxFileSize)}.`);
        return;
      }

      setError(null);
      setDescriptionDialog({ open: true, file });

      // Reset input
      event.target.value = '';
    },
    [maxFileSize]
  );

  const handleUploadConfirm = async (): Promise<void> => {
    if (!descriptionDialog.file) return;

    setUploading(true);
    try {
      await onUpload(descriptionDialog.file, description || undefined);
      setDescriptionDialog({ open: false, file: null });
      setDescription('');
    } catch {
      setError('Failed to upload file. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const file = event.dataTransfer.files[0];
      if (!file) return;

      if (!ALLOWED_TYPES.includes(file.type)) {
        setError('File type not supported.');
        return;
      }

      if (file.size > maxFileSize) {
        setError(`File too large. Maximum size is ${formatFileSize(maxFileSize)}.`);
        return;
      }

      setError(null);
      setDescriptionDialog({ open: true, file });
    },
    [maxFileSize]
  );

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
  };

  return (
    <Box>
      {/* A real subsection heading. The enclosing aspect accordion is an <h3>
          (MuiAccordion-heading), so this is the next level down. */}
      <Typography variant="subtitle2" component="h4" color="text.secondary" gutterBottom>
        Attachments
      </Typography>

      {/* Drop zone */}
      <Paper
        variant="outlined"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        // `group`, not `region`: this component renders once per aspect, so a
        // landmark would appear many times per page with an identical name
        // (axe `landmark-unique`). `group` still carries the accessible name
        // without claiming page-level navigational structure.
        role="group"
        aria-label="File upload area"
        sx={{
          p: 2,
          textAlign: 'center',
          bgcolor: 'grey.50',
          borderStyle: 'dashed',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
          '&:hover': disabled
            ? {}
            : {
                bgcolor: 'grey.100',
                borderColor: 'primary.main',
              },
        }}
      >
        <input
          type="file"
          id={inputId}
          accept={ALLOWED_TYPES.join(',')}
          onChange={handleFileSelect}
          disabled={disabled || uploading}
          style={{ display: 'none' }}
          aria-label="Upload file"
        />
        <label htmlFor={inputId}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
            {uploading ? (
              <CircularProgress size={24} aria-label="Uploading file" />
            ) : (
              <CloudUploadIcon color="action" fontSize="large" aria-hidden="true" />
            )}
            <Typography variant="body2" color="text.secondary">
              {uploading ? 'Uploading...' : 'Drop files here or click to upload'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              PDF, Word, Excel, images, or text (max {formatFileSize(maxFileSize)})
            </Typography>
          </Box>
        </label>
      </Paper>

      {/* Error message */}
      {error && (
        <Typography variant="body2" color="error" sx={{ mt: 1 }}>
          {error}
        </Typography>
      )}

      {/* Attachment list */}
      {attachments.length > 0 && (
        <List dense sx={{ mt: 1 }} aria-label="Uploaded attachments">
          {attachments.map((attachment) => (
            <ListItem
              key={attachment.id}
              sx={{
                bgcolor: 'background.paper',
                borderRadius: 1,
                mb: 0.5,
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }} aria-hidden="true">
                {getFileIcon(attachment.fileType)}
              </ListItemIcon>
              <ListItemText
                primary={attachment.fileName}
                secondary={
                  <>
                    {formatFileSize(attachment.fileSize)}
                    {attachment.description && ` • ${attachment.description}`}
                  </>
                }
                primaryTypographyProps={{ variant: 'body2', noWrap: true }}
                secondaryTypographyProps={{ variant: 'caption' }}
              />
              <ListItemSecondaryAction>
                <Tooltip title="Download">
                  <IconButton
                    edge="end"
                    size="small"
                    onClick={() => onDownload(attachment)}
                    sx={{ mr: 0.5 }}
                    aria-label={`Download ${attachment.fileName}`}
                  >
                    <DownloadIcon fontSize="small" aria-hidden="true" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Delete">
                  <IconButton
                    edge="end"
                    size="small"
                    onClick={() => onDelete(attachment.id)}
                    disabled={disabled}
                    aria-label={`Delete ${attachment.fileName}`}
                  >
                    <DeleteIcon fontSize="small" aria-hidden="true" />
                  </IconButton>
                </Tooltip>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      )}

      {/* Description dialog */}
      <Dialog
        open={descriptionDialog.open}
        onClose={() => setDescriptionDialog({ open: false, file: null })}
        maxWidth="sm"
        fullWidth
        aria-labelledby="attachment-dialog-title"
      >
        <DialogTitle id="attachment-dialog-title">Add Attachment</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            File: {descriptionDialog.file?.name}
          </Typography>
          <TextField
            // eslint-disable-next-line jsx-a11y/no-autofocus -- autoFocus is appropriate in dialogs for UX
            autoFocus
            label="Description (optional)"
            fullWidth
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of this evidence..."
            multiline
            rows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDescriptionDialog({ open: false, file: null })}>Cancel</Button>
          <Button onClick={handleUploadConfirm} variant="contained" disabled={uploading}>
            {uploading ? 'Uploading...' : 'Upload'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
