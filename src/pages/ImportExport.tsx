/**
 * Import/Export page - Manage assessment data import, export, and backup
 */

import { JSX, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  Alert,
  Card,
  CardContent,
  CardActions,
  Chip,
  Link,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  LinearProgress,
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DownloadIcon from '@mui/icons-material/Download';
import FolderZipIcon from '@mui/icons-material/FolderZip';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import TableChartIcon from '@mui/icons-material/TableChart';
import TableViewIcon from '@mui/icons-material/TableView';
import DataObjectIcon from '@mui/icons-material/DataObject';
import RestoreIcon from '@mui/icons-material/Restore';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DescriptionIcon from '@mui/icons-material/Description';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import HistoryIcon from '@mui/icons-material/History';
import { ImportDialog, StateNameDialog } from '../components/export';
import { DashboardStats } from '../components/dashboard';
import { useScores } from '../hooks';
import { getAllDomains } from '../services/capabilities';
import {
  exportAsJson,
  exportAsZip,
  exportAsPdf,
  exportDomainCsv,
  exportAllDomainsCsv,
  downloadBlob,
  downloadText,
  generateFilename,
} from '../services/export';

import {
  OFFLINE_WORKBOOK_SECTION_ID,
  WORKBOOK_APPROX_SIZE,
  WORKBOOK_DOWNLOAD_URL,
  WORKBOOK_FILE_TYPE,
  WORKBOOK_FILENAME,
} from '../constants';

type PendingExport =
  | { type: 'zip' }
  | { type: 'pdf' }
  | { type: 'csv-all' }
  | { type: 'csv'; domainId: string; domainName: string };

export default function ImportExport(): JSX.Element {
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  const [stateNameDialogOpen, setStateNameDialogOpen] = useState(false);
  const [pendingExport, setPendingExport] = useState<PendingExport | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);
  const [exportProgress, setExportProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  /*
   * Make `…/import-export#offline-workbook-section` work as a URL, not just as a click.
   *
   * The browser resolves a fragment before React has rendered anything, so on a fresh load or a
   * reload the target does not exist yet and the jump is lost. `ScrollToTop` then sets `<main>`
   * back to 0 on mount. Result without this: the hash is in the address bar, the page is at the
   * top, and the section is ~1,350px below the viewport — so the link a user copies and sends to
   * a colleague silently does nothing.
   *
   * This covers the load-time case. A same-page anchor click does not need it — the browser scrolls
   * natively, and because the target carries `tabIndex={-1}` it focuses it too, which is where the
   * keyboard behaviour comes from on that path. Verified separately: plain click, Cmd+click into a
   * background tab, and a cold load of the hash URL all end with the section scrolled to and focused.
   *
   * `requestAnimationFrame` because `ScrollToTop` is a sibling of this page inside `Layout` and
   * also scrolls on mount. Sibling effect order happens to favour this one today; deferring a
   * frame means not depending on that.
   */
  const { hash } = useLocation();
  useEffect(() => {
    if (hash !== `#${OFFLINE_WORKBOOK_SECTION_ID}`) return undefined;
    const frame = requestAnimationFrame(() => {
      const section = document.getElementById(OFFLINE_WORKBOOK_SECTION_ID);
      if (!section) return;
      section.scrollIntoView({ block: 'start' });
      // Focus as well as scroll, or a keyboard user resumes tabbing from the top of the document
      // and walks the whole export list to reach what the URL pointed them at.
      section.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [hash]);

  const { getStatusCounts, getDomainScore, getOverallScore } = useScores();
  const statusCounts = getStatusCounts();
  const overallScore = getOverallScore();
  const domains = getAllDomains();

  // Get domains with finalized assessments
  const domainsWithAssessments = domains.filter((d) => getDomainScore(d.id) !== null);
  const hasData = statusCounts.finalized > 0 || statusCounts.inProgress > 0;

  const handleImportComplete = (): void => {
    setImportSuccess(true);
    setTimeout(() => setImportSuccess(false), 5000);
  };

  // Exports that need state name prompt
  const startExportWithStateName = (exportType: PendingExport): void => {
    setPendingExport(exportType);
    setStateNameDialogOpen(true);
  };

  const handleStateNameConfirm = async (stateName: string): Promise<void> => {
    setStateNameDialogOpen(false);
    if (!pendingExport) return;

    const exportType = pendingExport;
    setPendingExport(null);

    switch (exportType.type) {
      case 'zip':
        await handleExportZip(stateName);
        break;
      case 'pdf':
        await handleExportPdf(stateName);
        break;
      case 'csv-all':
        await handleExportAllCsv(stateName);
        break;
      case 'csv':
        await handleExportDomainCsv(exportType.domainId, exportType.domainName, stateName);
        break;
    }
  };

  const handleExportZip = async (stateName: string): Promise<void> => {
    setExporting('zip');
    setError(null);
    try {
      const blob = await exportAsZip({ scope: 'full', format: 'zip', stateName }, (p) =>
        setExportProgress(p)
      );
      downloadBlob(blob, generateFilename('backup', 'zip'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(null);
      setExportProgress(0);
    }
  };

  const handleExportJson = async (): Promise<void> => {
    setExporting('json');
    setError(null);
    try {
      const json = await exportAsJson({ scope: 'full', format: 'json' });
      downloadText(json, generateFilename('data', 'json'), 'application/json');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(null);
    }
  };

  const handleExportPdf = async (stateName: string): Promise<void> => {
    setExporting('pdf');
    setError(null);
    try {
      const blob = await exportAsPdf({ scope: 'full', format: 'pdf', stateName }, (p) =>
        setExportProgress(p)
      );
      downloadBlob(blob, generateFilename('report', 'pdf'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(null);
      setExportProgress(0);
    }
  };

  const handleExportDomainCsv = async (
    domainId: string,
    domainName: string,
    stateName: string
  ): Promise<void> => {
    setExporting(`csv-${domainId}`);
    setError(null);
    try {
      const csv = await exportDomainCsv(domainId, stateName);
      if (csv) {
        const filename = `${domainName.toLowerCase().replace(/\s+/g, '-')}-maturity-profile.csv`;
        downloadText(csv, filename, 'text/csv');
      } else {
        throw new Error('No finalized assessments for this domain');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(null);
    }
  };

  const handleExportAllCsv = async (stateName: string): Promise<void> => {
    setExporting('csv-all');
    setError(null);
    try {
      const csv = await exportAllDomainsCsv(stateName);
      if (csv) {
        downloadText(csv, generateFilename('all-domains-maturity-profile', 'csv'), 'text/csv');
      } else {
        throw new Error('No finalized assessments to export');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(null);
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Import & Export
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Export your assessment data for CMS submission, stakeholder review, or backup. Import
        previous assessments to restore or merge data.{' '}
        {/*
         * Pointer to the workbook section at the foot of this page.
         *
         * The section itself stays where it is — it should not displace the actual exports, which
         * are what most people come here for — but measured on the deployed site it sat at 92% of
         * the page, below both columns, which made "primary placement" a claim the layout did not
         * support. An in-flow anchor costs nothing and makes it findable without scrolling.
         *
         * A plain fragment anchor, with no `onClick` and no `preventDefault`. An earlier revision
         * intercepted the click to avoid minting a URL that did not work on reload — see the effect
         * near the top of this component, which fixes that properly instead. Intercepting was worse
         * than the problem it solved: `preventDefault` fires on Cmd/Ctrl+click too, so asking for a
         * background tab yanked the current page down 1,071px instead, and middle-click bypassed the
         * handler entirely and opened the un-handled URL anyway. So the interception could not
         * actually prevent the bad URL, it could only break the good interactions.
         */}
        <Link href={`#${OFFLINE_WORKBOOK_SECTION_ID}`}>
          Looking for the offline Excel workbook? It is at the bottom of this page.
        </Link>
      </Typography>

      {/* Stats Summary - same as Dashboard */}
      <DashboardStats
        total={statusCounts.total}
        finalized={statusCounts.finalized}
        inProgress={statusCounts.inProgress}
        notStarted={statusCounts.notStarted}
        overallScore={overallScore}
      />

      {importSuccess && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Import completed successfully! Your assessments have been updated.
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Grid container spacing={4}>
        {/* Export Section */}
        <Grid size={{ xs: 12, lg: 7 }}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <DownloadIcon
                aria-hidden="true"
                sx={{ mr: 1, color: 'primary.main', fontSize: 28 }}
              />
              <Typography variant="h5" component="h2">
                Export
              </Typography>
            </Box>

            {/* Primary Export: Complete Backup */}
            <Card sx={{ mb: 3, border: '2px solid', borderColor: 'primary.main' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <FolderZipIcon color="primary" aria-hidden="true" />
                  <Typography variant="h6" component="h3">
                    Complete Backup (ZIP)
                  </Typography>
                  <Chip label="Recommended" size="small" color="primary" />
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  The most comprehensive export option. Creates a single ZIP file containing
                  everything you need to fully restore your assessments.
                </Typography>
                <List dense disablePadding>
                  <ListItem disableGutters>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <CheckCircleIcon fontSize="small" color="success" aria-hidden="true" />
                    </ListItemIcon>
                    <ListItemText
                      primary="JSON data file"
                      secondary="All assessments, ratings, history, and tags"
                    />
                  </ListItem>
                  <ListItem disableGutters>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <CheckCircleIcon fontSize="small" color="success" aria-hidden="true" />
                    </ListItemIcon>
                    <ListItemText
                      primary="CSV maturity profiles"
                      secondary="CMS-format profiles for each assessed domain"
                    />
                  </ListItem>
                  <ListItem disableGutters>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <CheckCircleIcon fontSize="small" color="success" aria-hidden="true" />
                    </ListItemIcon>
                    <ListItemText
                      primary="File attachments"
                      secondary="All uploaded evidence documents"
                    />
                  </ListItem>
                </List>
                {exporting === 'zip' && (
                  <LinearProgress
                    variant="determinate"
                    value={exportProgress}
                    aria-label={`Export progress: ${exportProgress}% complete`}
                    sx={{ mt: 2 }}
                  />
                )}
              </CardContent>
              <CardActions>
                <Button
                  variant="contained"
                  startIcon={<FolderZipIcon />}
                  onClick={() => startExportWithStateName({ type: 'zip' })}
                  disabled={!hasData || exporting !== null}
                  size="large"
                >
                  {exporting === 'zip' ? 'Exporting...' : 'Download ZIP Backup'}
                </Button>
              </CardActions>
            </Card>

            {/* Secondary Exports */}
            <Typography variant="subtitle1" component="h3" sx={{ mb: 2, fontWeight: 500 }}>
              Other Export Formats
            </Typography>

            {/* CSV Maturity Profiles */}
            <Card variant="outlined" sx={{ mb: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <TableChartIcon color="success" aria-hidden="true" />
                  <Typography variant="h6" component="h3">
                    CSV Maturity Profiles
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Export maturity profiles in the CMS-standard CSV format for upload to MES Hub
                  (MESH). Export all domains in a single file or individual domain profiles.
                </Typography>

                {domainsWithAssessments.length > 0 ? (
                  <>
                    {/* Export All - Primary Action */}
                    <Box sx={{ mb: 2 }}>
                      <Button
                        variant="contained"
                        color="success"
                        startIcon={<TableChartIcon />}
                        onClick={() => startExportWithStateName({ type: 'csv-all' })}
                        disabled={exporting !== null}
                      >
                        {exporting === 'csv-all'
                          ? 'Exporting...'
                          : `Export All Profiles (${domainsWithAssessments.length} domains)`}
                      </Button>
                    </Box>

                    {/* Individual Domain Exports */}
                    <Accordion elevation={0} sx={{ bgcolor: 'grey.50' }}>
                      <AccordionSummary
                        expandIcon={<ExpandMoreIcon aria-hidden="true" />}
                        aria-controls="individual-domain-exports-content"
                        id="individual-domain-exports-header"
                      >
                        <Typography variant="body2" color="text.secondary">
                          Export individual domain profiles
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails id="individual-domain-exports-content">
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                          {domainsWithAssessments.map((domain) => (
                            <Button
                              key={domain.id}
                              size="small"
                              variant="outlined"
                              onClick={() =>
                                startExportWithStateName({
                                  type: 'csv',
                                  domainId: domain.id,
                                  domainName: domain.name,
                                })
                              }
                              disabled={exporting !== null}
                            >
                              {exporting === `csv-${domain.id}` ? 'Exporting...' : domain.name}
                            </Button>
                          ))}
                        </Box>
                      </AccordionDetails>
                    </Accordion>
                  </>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                    No finalized assessments yet. Complete and finalize assessments to export
                    maturity profiles.
                  </Typography>
                )}
              </CardContent>
            </Card>

            <Grid container spacing={2}>
              {/* PDF Report */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <PictureAsPdfIcon color="error" aria-hidden="true" />
                      <Typography variant="subtitle1" component="h3">
                        PDF Report
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      Professional report for stakeholder review and CMS submission. Includes
                      summary statistics, domain scores, and assessment details.
                    </Typography>
                    {exporting === 'pdf' && (
                      <LinearProgress
                        variant="determinate"
                        value={exportProgress}
                        aria-label={`PDF export progress: ${exportProgress}% complete`}
                        sx={{ mt: 2 }}
                      />
                    )}
                  </CardContent>
                  <CardActions>
                    <Button
                      startIcon={<PictureAsPdfIcon />}
                      onClick={() => startExportWithStateName({ type: 'pdf' })}
                      disabled={statusCounts.finalized === 0 || exporting !== null}
                    >
                      {exporting === 'pdf' ? 'Generating...' : 'Export PDF'}
                    </Button>
                  </CardActions>
                </Card>
              </Grid>

              {/* JSON Data */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <DataObjectIcon color="info" aria-hidden="true" />
                      <Typography variant="subtitle1" component="h3">
                        JSON Data
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      Raw assessment data without attachments. Smaller file size, suitable for data
                      backup or transfer between browsers.
                    </Typography>
                  </CardContent>
                  <CardActions>
                    <Button
                      startIcon={<DataObjectIcon />}
                      onClick={handleExportJson}
                      disabled={!hasData || exporting !== null}
                    >
                      {exporting === 'json' ? 'Exporting...' : 'Export JSON'}
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Import Section */}
        <Grid size={{ xs: 12, lg: 5 }}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <UploadFileIcon
                aria-hidden="true"
                sx={{ mr: 1, color: 'primary.main', fontSize: 28 }}
              />
              <Typography variant="h5" component="h2">
                Import
              </Typography>
            </Box>

            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <RestoreIcon color="primary" aria-hidden="true" />
                  <Typography variant="h6" component="h3">
                    Restore from Backup
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Import assessment data from a previous backup. Supports both ZIP (complete backup)
                  and JSON (data only) files.
                </Typography>

                <Typography variant="subtitle2" component="h4" sx={{ mt: 2, mb: 1 }}>
                  Supported Formats
                </Typography>
                <List dense disablePadding>
                  <ListItem disableGutters>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <FolderZipIcon fontSize="small" aria-hidden="true" />
                    </ListItemIcon>
                    <ListItemText primary=".zip" secondary="Complete backup with attachments" />
                  </ListItem>
                  <ListItem disableGutters>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <DataObjectIcon fontSize="small" aria-hidden="true" />
                    </ListItemIcon>
                    <ListItemText primary=".json" secondary="Data-only backup" />
                  </ListItem>
                </List>
              </CardContent>
              <CardActions>
                <Button
                  variant="contained"
                  startIcon={<RestoreIcon />}
                  onClick={() => setImportDialogOpen(true)}
                  size="large"
                >
                  Import Backup
                </Button>
              </CardActions>
            </Card>

            {/* How Import Works */}
            <Box
              sx={{
                p: 2,
                bgcolor: 'grey.50',
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'grey.200',
              }}
            >
              {/* A peer info box under the "Import" <h2>, not a child of the
                  "Restore from Backup" card, so h3 rather than h4. */}
              <Typography variant="subtitle2" component="h3" sx={{ mb: 1 }}>
                How Import Works
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Import uses a "merge with history" strategy — no data is ever lost:
              </Typography>
              <List dense disablePadding>
                <ListItem disableGutters>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <DescriptionIcon fontSize="small" color="action" aria-hidden="true" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Newer imported data"
                    secondary="Becomes current; existing moves to history"
                    slotProps={{
                      primary: { variant: 'body2', fontWeight: 500 },
                      secondary: { variant: 'caption' },
                    }}
                  />
                </ListItem>
                <ListItem disableGutters>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <HistoryIcon fontSize="small" color="action" aria-hidden="true" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Older imported data"
                    secondary="Added to history; current stays unchanged"
                    slotProps={{
                      primary: { variant: 'body2', fontWeight: 500 },
                      secondary: { variant: 'caption' },
                    }}
                  />
                </ListItem>
                <ListItem disableGutters>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <AttachFileIcon fontSize="small" color="action" aria-hidden="true" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Attachments"
                    secondary="Restored from ZIP backups automatically"
                    slotProps={{
                      primary: { variant: 'body2', fontWeight: 500 },
                      secondary: { variant: 'caption' },
                    }}
                  />
                </ListItem>
              </List>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/*
       * Offline workbook — the section the intro links down to (plan Section 5.5). This was
       * originally designated the *primary* download placement; the Landing hero holds that now,
       * for the reasons in the intro comment above.
       *
       * Its own full-width section rather than a third card in "Other Export Formats", because it
       * is not an export. Every card up there serialises the state's own data and is gated on
       * `hasData`; this is a blank template, identical for everyone and always available. Filing it
       * among the exports would imply it contained their assessment.
       */}
      {/*
       * `tabIndex={-1}` makes the region focusable without putting it in the tab order, and it is
       * doing real work on both arrival paths: the browser focuses a fragment target only if it is
       * focusable, so this is what makes a plain anchor click move focus here and not just the
       * viewport. Without it a keyboard user would resume tabbing from the link near the top of the
       * page and walk the whole export list to reach what they asked for.
       *
       * The ring is kept, not suppressed. A first pass set `outline: 'none'` on `:focus`, reasoning
       * that a scroll destination is not an interactive control — but measurement showed the section
       * matches `:focus-visible` when it is reached from the keyboard, so that rule removed the only
       * signal a keyboard user gets that focus jumped 1,000px down the page. Scoped to
       * `:focus-visible` so a mouse arrival stays quiet, and styled to match the theme's convention
       * for focus rings rather than inventing one.
       */}
      <Paper
        sx={{
          p: 3,
          mt: 4,
          '&:focus': { outline: 'none' },
          '&:focus-visible': {
            outline: '2px solid',
            outlineColor: 'primary.main',
            outlineOffset: 2,
          },
        }}
        component="section"
        id={OFFLINE_WORKBOOK_SECTION_ID}
        tabIndex={-1}
        aria-labelledby="offline-workbook-h"
      >
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <TableViewIcon aria-hidden="true" sx={{ mr: 1, color: 'primary.main', fontSize: 28 }} />
          <Typography variant="h5" component="h2" id="offline-workbook-h">
            Offline Excel workbook
          </Typography>
        </Box>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
          A blank Excel version of this entire assessment, for anyone who cannot use a browser-based
          tool. It covers all 14 capability domains, 72 capability areas and 41 maturity aspects,
          and calculates dimension, capability area, domain and enterprise-wide scores using the
          same rules as this tool. Built for Section 508 conformance, and it needs no add-ins,
          macros or internet connection — Excel 2007 or later.
        </Typography>
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            This is a <strong>blank</strong> workbook, not an export of your assessment. Nothing you
            have entered here is included, and filling it in does not update this tool.
          </Typography>
        </Alert>
        {/*
         * Type and size reach assistive technology through `aria-describedby` on the caption below,
         * NOT through `aria-label`.
         *
         * An earlier version put them in an `aria-label`, which broke **WCAG 2.5.3 Label in Name**:
         * the accessible name has to *contain* the visible label, and interleaving extra words
         * ("blank offline") into the middle of it meant the visible text was no longer a substring.
         * Measured, not reasoned about — and no automated check in this repo catches it. A full
         * axe run over all tags reports zero violations here, because `label-content-name-mismatch`
         * never evaluated these anchors at all.
         *
         * `aria-describedby` also removes a duplication: the caption is already visible, so an
         * `aria-label` repeating it announced the size twice.
         */}
        <Button
          variant="contained"
          href={WORKBOOK_DOWNLOAD_URL}
          download={WORKBOOK_FILENAME}
          startIcon={<TableViewIcon />}
          aria-describedby="offline-workbook-meta"
        >
          Download the blank workbook
        </Button>
        <Typography
          id="offline-workbook-meta"
          variant="caption"
          color="text.secondary"
          component="p"
          sx={{ mt: 1 }}
        >
          {WORKBOOK_FILE_TYPE} · {WORKBOOK_APPROX_SIZE}
        </Typography>
      </Paper>

      {/* State Name Dialog */}
      <StateNameDialog
        open={stateNameDialogOpen}
        onClose={() => {
          setStateNameDialogOpen(false);
          setPendingExport(null);
        }}
        onConfirm={handleStateNameConfirm}
        exportType={
          pendingExport?.type === 'pdf'
            ? 'PDF report'
            : pendingExport?.type === 'csv'
              ? 'CSV maturity profile'
              : 'export'
        }
      />

      {/* Import Dialog */}
      <ImportDialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        onImportComplete={handleImportComplete}
      />
    </Container>
  );
}
