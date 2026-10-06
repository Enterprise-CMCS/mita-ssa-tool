/**
 * Question and Evidence Checklist Component
 *
 * Displays questions and evidence items for a maturity level as checkboxes.
 * Tracks which items have been reviewed/confirmed.
 */

import { JSX, useId } from 'react';
import {
  Box,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import type { QuestionResponse, EvidenceResponse } from '../../types';

interface QuestionChecklistProps {
  questions: string[];
  evidence: string[];
  questionResponses: QuestionResponse[];
  evidenceResponses: EvidenceResponse[];
  onQuestionChange: (index: number, checked: boolean) => void;
  onEvidenceChange: (index: number, checked: boolean) => void;
  levelName: string;
  disabled?: boolean;
}

/**
 * Checklist for questions and evidence items
 */
export function QuestionChecklist({
  questions,
  evidence,
  questionResponses,
  evidenceResponses,
  onQuestionChange,
  onEvidenceChange,
  levelName,
  disabled = false,
}: QuestionChecklistProps): JSX.Element {
  /**
   * One of these renders per aspect, so the accordion ids must be per-instance.
   * They were hardcoded (`evidence-header` / `evidence-content`), which produced
   * five duplicate DOM ids on a five-aspect dimension and five MUI accordion
   * regions whose `aria-labelledby` all resolved to the first header — reported
   * by axe as `landmark-unique`, and only visible once panels are expanded.
   *
   * Declared before the early return below: hooks must run in the same order on
   * every render.
   */
  const instanceId = useId().replace(/:/g, '');

  const hasQuestions = questions.length > 0;
  const hasEvidence = evidence.length > 0;

  if (!hasQuestions && !hasEvidence) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
        No assessment questions or evidence items defined for this level.
      </Typography>
    );
  }

  const getQuestionChecked = (index: number): boolean => {
    const response = questionResponses.find((r) => r.questionIndex === index);
    return response?.answer ?? false;
  };

  const getEvidenceChecked = (index: number): boolean => {
    const response = evidenceResponses.find((r) => r.evidenceIndex === index);
    return response?.provided ?? false;
  };

  const questionsAnswered = questionResponses.filter((r) => r.answer).length;
  const evidenceProvided = evidenceResponses.filter((r) => r.provided).length;

  return (
    <Box sx={{ mt: 2 }}>
      {hasQuestions && (
        <Accordion defaultExpanded={questions.length <= 4} disableGutters elevation={0}>
          <AccordionSummary
            expandIcon={<ExpandMoreIcon aria-hidden="true" />}
            aria-controls={`questions-content-${instanceId}`}
            id={`questions-header-${instanceId}`}
            sx={{
              bgcolor: 'grey.50',
              borderRadius: 1,
              '&.Mui-expanded': { minHeight: 48 },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <HelpOutlineIcon fontSize="small" color="primary" aria-hidden="true" />
              {/* Inside MUI's <h3 class="MuiAccordion-heading">, so not a heading itself. */}
              <Typography variant="subtitle2" component="span">
                Assessment Questions for {levelName}
              </Typography>
              <Chip
                label={`${questionsAnswered}/${questions.length}`}
                size="small"
                color={questionsAnswered === questions.length ? 'success' : 'default'}
                variant="outlined"
              />
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <FormGroup>
              {questions.map((question, index) => (
                <FormControlLabel
                  key={index}
                  control={
                    <Checkbox
                      checked={getQuestionChecked(index)}
                      onChange={(e) => onQuestionChange(index, e.target.checked)}
                      disabled={disabled}
                      size="small"
                    />
                  }
                  label={
                    <Typography variant="body2" sx={{ lineHeight: 1.4 }}>
                      {question}
                    </Typography>
                  }
                  sx={{
                    alignItems: 'flex-start',
                    mb: 1,
                    '& .MuiCheckbox-root': { pt: 0 },
                  }}
                />
              ))}
            </FormGroup>
          </AccordionDetails>
        </Accordion>
      )}

      {hasEvidence && (
        <Accordion
          defaultExpanded={evidence.length <= 3}
          disableGutters
          elevation={0}
          sx={{ mt: hasQuestions ? 1 : 0 }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon aria-hidden="true" />}
            aria-controls={`evidence-content-${instanceId}`}
            id={`evidence-header-${instanceId}`}
            sx={{
              bgcolor: 'grey.50',
              borderRadius: 1,
              '&.Mui-expanded': { minHeight: 48 },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <DescriptionOutlinedIcon fontSize="small" color="secondary" aria-hidden="true" />
              {/* Inside MUI's <h3 class="MuiAccordion-heading">, so not a heading itself. */}
              <Typography variant="subtitle2" component="span">
                Evidence Items for {levelName}
              </Typography>
              <Chip
                label={`${evidenceProvided}/${evidence.length}`}
                size="small"
                color={evidenceProvided === evidence.length ? 'success' : 'default'}
                variant="outlined"
              />
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <FormGroup>
              {evidence.map((item, index) => (
                <FormControlLabel
                  key={index}
                  control={
                    <Checkbox
                      checked={getEvidenceChecked(index)}
                      onChange={(e) => onEvidenceChange(index, e.target.checked)}
                      disabled={disabled}
                      size="small"
                    />
                  }
                  label={
                    <Typography variant="body2" sx={{ lineHeight: 1.4 }}>
                      {item}
                    </Typography>
                  }
                  sx={{
                    alignItems: 'flex-start',
                    mb: 1,
                    '& .MuiCheckbox-root': { pt: 0 },
                  }}
                />
              ))}
            </FormGroup>
          </AccordionDetails>
        </Accordion>
      )}
    </Box>
  );
}
