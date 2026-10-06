/**
 * Aspect Card Component
 *
 * Collapsible card for assessing a single ORBIT aspect.
 * Shows maturity level selector, questions, evidence, notes, and attachments.
 */

import { JSX, useCallback, useMemo } from 'react';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Box,
  Typography,
  Chip,
  TextField,
  Divider,
  alpha,
  useTheme,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import { MaturityLevelSelector } from './MaturityLevelSelector';
import { QuestionChecklist } from './QuestionChecklist';
import { AttachmentUpload } from './AttachmentUpload';
import { useDebouncedSave } from '../../hooks';
import type { OrbitAspect, OrbitRating, Attachment, MaturityLevelWithNA } from '../../types';
import { maturityLevelToKey, MATURITY_LEVEL_NAMES } from '../../types';

interface AspectCardProps {
  aspect: OrbitAspect;
  rating: OrbitRating | undefined;
  attachments: Attachment[];
  expanded: boolean;
  onExpandChange: (expanded: boolean) => void;
  onLevelChange: (level: MaturityLevelWithNA) => void;
  onTargetLevelChange: (level: MaturityLevelWithNA | undefined) => void;
  onQuestionChange: (index: number, checked: boolean) => void;
  onEvidenceChange: (index: number, checked: boolean) => void;
  onNotesChange: (notes: string) => void;
  onBarriersChange: (barriers: string) => void;
  onPlansChange: (plans: string) => void;
  onAttachmentUpload: (file: File, description?: string) => Promise<void>;
  onAttachmentDelete: (attachmentId: string) => Promise<void>;
  onAttachmentDownload: (attachment: Attachment) => void;
  disabled?: boolean;
}

/**
 * Collapsible card for a single aspect assessment
 */
export function AspectCard({
  aspect,
  rating,
  attachments,
  expanded,
  onExpandChange,
  onLevelChange,
  onTargetLevelChange,
  onQuestionChange,
  onEvidenceChange,
  onNotesChange,
  onBarriersChange,
  onPlansChange,
  onAttachmentUpload,
  onAttachmentDelete,
  onAttachmentDownload,
  disabled = false,
}: AspectCardProps): JSX.Element {
  const theme = useTheme();
  const currentLevel = rating?.currentLevel ?? 0;
  const targetLevel = rating?.targetLevel;
  const previousLevel = rating?.previousLevel;
  const isAssessed = currentLevel !== 0;

  // Debounced text fields - auto-save after 500ms of inactivity
  const [localNotes, setLocalNotes] = useDebouncedSave(rating?.notes ?? '', onNotesChange, 500);
  const [localBarriers, setLocalBarriers] = useDebouncedSave(
    rating?.barriers ?? '',
    onBarriersChange,
    500
  );
  const [localPlans, setLocalPlans] = useDebouncedSave(rating?.plans ?? '', onPlansChange, 500);

  // Build level descriptions for the selector
  const levelDescriptions = useMemo(() => {
    return ([1, 2, 3, 4, 5] as const).map((level) => {
      const levelKey = maturityLevelToKey(level);
      const levelData = aspect.levels[levelKey];
      return {
        level: level as MaturityLevelWithNA,
        name: MATURITY_LEVEL_NAMES[level],
        description: levelData.description,
      };
    });
  }, [aspect.levels]);

  // Get questions and evidence for the selected level
  const selectedLevelData = useMemo(() => {
    if (currentLevel <= 0 || currentLevel > 5) return null;
    const levelKey = maturityLevelToKey(currentLevel as 1 | 2 | 3 | 4 | 5);
    return aspect.levels[levelKey];
  }, [aspect.levels, currentLevel]);

  const handleQuestionChange = useCallback(
    (index: number, checked: boolean) => {
      onQuestionChange(index, checked);
    },
    [onQuestionChange]
  );

  const handleEvidenceChange = useCallback(
    (index: number, checked: boolean) => {
      onEvidenceChange(index, checked);
    },
    [onEvidenceChange]
  );

  return (
    <Accordion
      expanded={expanded}
      onChange={(_, isExpanded) => onExpandChange(isExpanded)}
      disableGutters
      sx={{
        border: '1px solid',
        borderColor: isAssessed ? 'primary.main' : 'divider',
        borderRadius: '8px !important',
        mb: 1.5,
        '&:before': { display: 'none' },
        '&.Mui-expanded': {
          margin: 0,
          mb: 1.5,
        },
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon aria-hidden="true" />}
        aria-expanded={expanded}
        aria-controls={`aspect-${aspect.id}-content`}
        id={`aspect-${aspect.id}-header`}
        sx={{
          bgcolor: isAssessed ? alpha(theme.palette.primary.main, 0.04) : 'background.paper',
          borderRadius: expanded ? '8px 8px 0 0' : '8px',
          '&:hover': {
            bgcolor: isAssessed ? alpha(theme.palette.primary.main, 0.08) : 'grey.50',
          },
          '& .MuiAccordionSummary-content': {
            overflow: 'hidden',
            minWidth: 0,
          },
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 1.5,
            width: '100%',
            pr: 2,
            flexWrap: 'wrap',
          }}
        >
          <Box sx={{ flexShrink: 0, pt: 0.25 }}>
            {isAssessed ? (
              <CheckCircleIcon sx={{ color: 'primary.main', fontSize: 20 }} aria-hidden="true" />
            ) : (
              <RadioButtonUncheckedIcon
                sx={{ color: 'grey.400', fontSize: 20 }}
                aria-hidden="true"
              />
            )}
          </Box>
          <Box sx={{ flex: 1, minWidth: 150 }}>
            {/* MUI wraps AccordionSummary in <h3 class="MuiAccordion-heading">,
                so this must not itself be a heading - subtitle1 would render a
                nested <h6> inside that <h3>. `span` rather than `p` because <h3>
                takes phrasing content only; `display: block` keeps the layout. */}
            <Typography
              variant="subtitle1"
              component="span"
              sx={{ display: 'block', fontWeight: 500, wordBreak: 'break-word' }}
            >
              {aspect.name}
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                wordBreak: 'break-word',
              }}
            >
              {aspect.description}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, flexShrink: 0, flexWrap: 'wrap' }}>
            {currentLevel > 0 && (
              <Chip
                label={`As-Is: ${currentLevel}`}
                size="small"
                sx={{
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  color: 'primary.dark',
                  fontWeight: 600,
                }}
              />
            )}
            {currentLevel === -1 && <Chip label="N/A" size="small" variant="outlined" />}
            {targetLevel && targetLevel > 0 && (
              <Chip
                label={`To-Be: ${targetLevel}`}
                size="small"
                variant="outlined"
                sx={{
                  borderColor: 'secondary.main',
                  color: 'secondary.dark',
                }}
              />
            )}
          </Box>
        </Box>
      </AccordionSummary>

      {/* No `role="region"` or `id` here. MUI's Accordion already renders a
          `div.MuiAccordion-region` wrapper carrying `role="region"`,
          `id={aria-controls}` and `aria-labelledby={summary id}`. Setting them
          again on AccordionDetails produced a second identically-named landmark
          AND a duplicate DOM id (`aspect-<id>-content` appeared twice), which
          only shows up once a panel is expanded. */}
      <AccordionDetails sx={{ p: 3 }}>
        {/* Maturity Level Selector - Dual As-Is / To-Be */}
        <Box sx={{ mb: 3 }}>
          <MaturityLevelSelector
            asIsValue={currentLevel}
            toBeValue={targetLevel}
            onAsIsChange={onLevelChange}
            onToBeChange={onTargetLevelChange}
            levelDescriptions={levelDescriptions}
            previousAsIsValue={previousLevel}
            disabled={disabled}
          />
        </Box>

        {/* Questions and Evidence */}
        {selectedLevelData && (
          <QuestionChecklist
            questions={selectedLevelData.questions}
            evidence={selectedLevelData.evidence}
            questionResponses={rating?.questionResponses ?? []}
            evidenceResponses={rating?.evidenceResponses ?? []}
            onQuestionChange={handleQuestionChange}
            onEvidenceChange={handleEvidenceChange}
            levelName={MATURITY_LEVEL_NAMES[currentLevel as 1 | 2 | 3 | 4 | 5]}
            disabled={disabled}
          />
        )}

        <Divider sx={{ my: 3 }} />

        {/* Notes, Barriers, Plans */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            id={`aspect-${aspect.id}-notes`}
            label="Notes"
            multiline
            rows={2}
            value={localNotes}
            onChange={(e) => setLocalNotes(e.target.value)}
            placeholder="Additional notes about this assessment..."
            disabled={disabled}
            fullWidth
            size="small"
            inputProps={{
              'aria-describedby': `aspect-${aspect.id}-notes-help`,
            }}
          />
          <TextField
            id={`aspect-${aspect.id}-barriers`}
            label="Barriers & Challenges"
            multiline
            rows={2}
            value={localBarriers}
            onChange={(e) => setLocalBarriers(e.target.value)}
            placeholder="What barriers or challenges exist for improving this aspect?"
            disabled={disabled}
            fullWidth
            size="small"
          />
          <TextField
            id={`aspect-${aspect.id}-plans`}
            label="Advancement Plans"
            multiline
            rows={2}
            value={localPlans}
            onChange={(e) => setLocalPlans(e.target.value)}
            placeholder="What plans exist to advance maturity in this aspect?"
            disabled={disabled}
            fullWidth
            size="small"
          />
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Attachments */}
        <AttachmentUpload
          attachments={attachments}
          onUpload={onAttachmentUpload}
          onDelete={onAttachmentDelete}
          onDownload={onAttachmentDownload}
          disabled={disabled}
        />
      </AccordionDetails>
    </Accordion>
  );
}
