/**
 * Guide page
 *
 * A welcoming "what is this / how do I use it / how do I help" page aimed at
 * first-time visitors. Structured as a newcomer journey:
 *   1. What this is + core value props
 *   2. Understanding MITA 4.0 and ORBIT (the five dimensions)
 *   3. What the maturity scale means
 *   4. How to use the tool (workflow)
 *   5. Privacy and your data
 *   6. Getting involved / contributing
 */

import { JSX } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  Grid,
  Link,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import CodeIcon from '@mui/icons-material/Code';
import GitHubIcon from '@mui/icons-material/GitHub';
import BugReportOutlinedIcon from '@mui/icons-material/BugReportOutlined';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import TableViewIcon from '@mui/icons-material/TableView';
import {
  GITHUB_REPO_URL,
  WORKBOOK_APPROX_SIZE,
  WORKBOOK_DOWNLOAD_URL,
  WORKBOOK_FILE_TYPE,
  WORKBOOK_FILENAME,
} from '../constants';
import { SCORE_COLORS } from '../utils/colors';

/** Core differentiators shown as a compact strip near the top. */
const VALUE_PROPS = [
  {
    icon: LockOutlinedIcon,
    title: 'Private by design',
    body: 'Everything stays in your browser. No accounts, no servers, no tracking.',
  },
  {
    icon: CloudOffIcon,
    title: 'Works offline',
    body: 'Open it once with a connection, then keep working without one.',
  },
  {
    icon: CodeIcon,
    title: 'Free & open source',
    body: 'Built for State Medicaid Agencies and free for anyone to use or improve.',
  },
];

/**
 * The five ORBIT dimensions. The letters spell the framework's name.
 * `scope` indicates whether the dimension is assessed for each capability area
 * or once for the whole organization.
 */
const ORBIT_DIMENSIONS = [
  {
    letter: 'O',
    name: 'Outcomes',
    description: 'The goals and measurable results your Medicaid enterprise is working toward.',
    scope: 'Organization-wide',
    organizational: true,
  },
  {
    letter: 'R',
    name: 'Roles',
    description: 'The people, responsibilities, and capacity that deliver your capabilities.',
    scope: 'Organization-wide',
    organizational: true,
  },
  {
    letter: 'B',
    name: 'Business Architecture',
    description: 'The business processes that carry out each capability.',
    scope: 'Per capability',
    organizational: false,
  },
  {
    letter: 'I',
    name: 'Information',
    description: 'How data is governed, structured, and kept fit for use.',
    scope: 'Per capability',
    organizational: false,
  },
  {
    letter: 'T',
    name: 'Technology',
    description: 'The systems, infrastructure, and applications that support each capability.',
    scope: 'Per capability',
    organizational: false,
  },
];

/** Maturity scale with plain-language descriptions of each level. */
const MATURITY_LEVELS = [
  {
    level: 1,
    name: 'Initial',
    description: 'Ad hoc and inconsistent; success depends on individual effort.',
    color: SCORE_COLORS.initial,
  },
  {
    level: 2,
    name: 'Developing',
    description: 'Basic processes exist but are not yet standardized.',
    color: SCORE_COLORS.developing,
  },
  {
    level: 3,
    name: 'Defined',
    description: 'Standardized, documented, and applied consistently.',
    color: SCORE_COLORS.good,
  },
  {
    level: 4,
    name: 'Managed',
    description: 'Measured and actively managed using metrics.',
    color: SCORE_COLORS.excellent,
  },
  {
    level: 5,
    name: 'Optimized',
    description: 'Continuously improved, data-driven, and shared with peers.',
    color: SCORE_COLORS.excellent,
  },
];

/** The three-phase assessment workflow. */
const WORKFLOW = [
  {
    number: 1,
    title: 'Choose a capability',
    body: 'Start on the Dashboard and pick any of the 72 capability areas. Add tags, like fiscal year or project, to stay organized.',
  },
  {
    number: 2,
    title: 'Rate and document',
    body: 'Work through each dimension, rating maturity from 1 to 5 (or N/A). Capture notes, barriers, and plans, and attach supporting evidence.',
  },
  {
    number: 3,
    title: 'Finalize and export',
    body: 'Lock in your results, then generate a PDF for stakeholders, a CSV in the CMS Maturity Profile format, or a full ZIP backup.',
  },
];

/**
 * A single "get involved" item. Renders as a link to a GitHub issue template
 * when `href` is provided, otherwise as static text (e.g., in local dev where
 * the repository URL is not configured).
 */
function EngagementItem({
  icon,
  title,
  body,
  href,
}: {
  icon: JSX.Element;
  title: string;
  body: string;
  href: string | null;
}): JSX.Element {
  const content = (
    <Stack direction="row" spacing={1.5} alignItems="flex-start">
      {icon}
      <Box>
        {/* Card title under the "Get involved" <h2>. */}
        <Typography
          variant="subtitle2"
          component="h3"
          sx={{ fontWeight: 700, color: 'text.primary' }}
        >
          {title}
          {href && (
            <ArrowForwardIcon
              aria-hidden="true"
              sx={{ fontSize: 14, ml: 0.5, verticalAlign: 'middle', color: 'primary.main' }}
            />
          )}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {body}
        </Typography>
      </Box>
    </Stack>
  );

  if (!href) {
    return content;
  }

  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      underline="none"
      aria-label={`${title} on GitHub (opens in new window)`}
      sx={{
        display: 'block',
        p: 1.5,
        borderRadius: 1,
        transition: 'background-color 0.15s',
        '&:hover': { backgroundColor: 'grey.100' },
      }}
    >
      {content}
    </Link>
  );
}

export default function About(): JSX.Element {
  const bugReportUrl = GITHUB_REPO_URL
    ? `${GITHUB_REPO_URL}/issues/new?template=bug_report.md`
    : null;
  const featureRequestUrl = GITHUB_REPO_URL
    ? `${GITHUB_REPO_URL}/issues/new?template=feature_request.md`
    : null;

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      {/* --- Intro ------------------------------------------------------- */}
      <Typography variant="h4" component="h1" gutterBottom>
        About this tool
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        The MITA 4.0 State Self-Assessment Tool helps State Medicaid Agencies measure the maturity
        of their Medicaid Enterprise Systems and plan where to improve. You work through a guided
        assessment, score your maturity, and export results to share with stakeholders or submit to
        CMS — all without your data ever leaving your browser.
      </Typography>

      {/* Value props strip */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {VALUE_PROPS.map((prop) => {
          const Icon = prop.icon;
          return (
            <Grid item xs={12} sm={4} key={prop.title}>
              <Stack direction="row" spacing={1.5} alignItems="flex-start">
                <Icon color="primary" aria-hidden="true" sx={{ mt: 0.25 }} />
                <Box>
                  {/* Decorative card titles ("Private by design" etc.), not
                      document structure. Promoting them to <h2> would put three
                      blurbs in the outline ahead of the page's real sections. */}
                  <Typography variant="subtitle2" component="p" sx={{ fontWeight: 700 }}>
                    {prop.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {prop.body}
                  </Typography>
                </Box>
              </Stack>
            </Grid>
          );
        })}
      </Grid>

      {/* --- ORBIT ------------------------------------------------------- */}
      <Paper sx={{ p: { xs: 3, md: 4 }, mb: 3 }} component="section" aria-labelledby="orbit-h">
        <Typography variant="h5" component="h2" id="orbit-h" gutterBottom>
          What is MITA 4.0 and ORBIT?
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          MITA 4.0 (Medicaid Information Technology Architecture) is the framework CMS uses to help
          states assess and modernize their Medicaid systems. <strong>ORBIT</strong> is its maturity
          model — five lenses you look through to evaluate each capability.
        </Typography>

        <Stack spacing={1.5} sx={{ mt: 3 }}>
          {ORBIT_DIMENSIONS.map((dim) => (
            <Stack
              key={dim.letter}
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              alignItems={{ xs: 'flex-start', sm: 'center' }}
              sx={{
                p: 2,
                borderLeft: '4px solid',
                borderColor: dim.organizational ? 'secondary.dark' : 'primary.main',
                bgcolor: 'grey.50',
              }}
            >
              <Avatar
                aria-hidden="true"
                variant="rounded"
                sx={{
                  bgcolor: dim.organizational ? 'secondary.dark' : 'primary.main',
                  color: '#fff',
                  width: 40,
                  height: 40,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {dim.letter}
              </Avatar>
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 600 }}>
                  {dim.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {dim.description}
                </Typography>
              </Box>
              <Chip
                label={dim.scope}
                size="small"
                variant="outlined"
                color={dim.organizational ? 'secondary' : 'primary'}
                sx={{ flexShrink: 0 }}
              />
            </Stack>
          ))}
        </Stack>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 2.5 }}>
          Business Architecture, Information, and Technology are assessed for each of the 72
          capability areas. Outcomes, Roles, and Enterprise Architecture are assessed once for your
          whole organization in the combined Enterprise Governance assessment.
        </Typography>
      </Paper>

      {/* --- Maturity scale ---------------------------------------------- */}
      <Paper sx={{ p: { xs: 3, md: 4 }, mb: 3 }} component="section" aria-labelledby="scale-h">
        <Typography variant="h5" component="h2" id="scale-h" gutterBottom>
          What the maturity scores mean
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Everything you assess is rated on a five-level scale that runs from ad hoc to optimized.
          You can also mark something <strong>N/A</strong> when a criterion does not apply to your
          state.
        </Typography>

        <Grid container spacing={2} sx={{ mt: 1 }}>
          {MATURITY_LEVELS.map((level) => (
            <Grid item xs={12} sm={6} md key={level.level}>
              <Box
                sx={{
                  height: '100%',
                  p: 2,
                  borderTop: '4px solid',
                  borderColor: level.color,
                  bgcolor: 'grey.50',
                }}
              >
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                  <Box
                    aria-hidden="true"
                    sx={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      bgcolor: level.color,
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {level.level}
                  </Box>
                  <Typography variant="subtitle2" component="h3" sx={{ fontWeight: 700 }}>
                    {level.name}
                  </Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  {level.description}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Paper>

      {/* --- Workflow ---------------------------------------------------- */}
      <Paper sx={{ p: { xs: 3, md: 4 }, mb: 3 }} component="section" aria-labelledby="workflow-h">
        <Typography variant="h5" component="h2" id="workflow-h" gutterBottom>
          How to use the tool
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          An assessment moves through three phases. You can stop and resume at any time — your work
          saves automatically.
        </Typography>

        <Grid container spacing={3}>
          {WORKFLOW.map((step) => (
            <Grid item xs={12} md={4} key={step.number}>
              <Stack direction="row" spacing={2} alignItems="flex-start">
                <Avatar
                  aria-hidden="true"
                  sx={{
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    width: 32,
                    height: 32,
                    fontSize: '0.95rem',
                    fontWeight: 700,
                  }}
                >
                  {step.number}
                </Avatar>
                <Box>
                  <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 600, mb: 0.5 }}>
                    {step.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {step.body}
                  </Typography>
                </Box>
              </Stack>
            </Grid>
          ))}
        </Grid>

        {/*
         * Offline behaviour, described where someone would look for it — inside "How to use the
         * tool", after the three workflow steps.
         *
         * `VALUE_PROPS` near the top of this file says "works offline" in six words. This is the
         * version that tells a state what to actually expect, including the update prompt, which is
         * new behaviour a reviewer would otherwise meet with no explanation anywhere.
         */}
        <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Stack direction="row" spacing={1.5} alignItems="flex-start">
            <CloudOffIcon color="primary" aria-hidden="true" sx={{ mt: 0.25 }} />
            <Box>
              <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 600, mb: 0.5 }}>
                Working without a connection
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Once you have opened this tool with a connection, it will load and run without one —
                including the offline Excel workbook. Your assessment is stored in your browser
                either way, so nothing about saving depends on being online. When a new version is
                released you will see a prompt offering to reload; until you accept it, you keep
                using the version you have.
              </Typography>
            </Box>
          </Stack>
        </Box>

        <Box sx={{ mt: 3 }}>
          <Button
            variant="contained"
            component={RouterLink}
            to="/dashboard"
            endIcon={<ArrowForwardIcon />}
          >
            Start assessing
          </Button>
        </Box>
      </Paper>

      {/* --- Privacy ----------------------------------------------------- */}
      <Paper sx={{ p: { xs: 3, md: 4 }, mb: 3 }} component="section" aria-labelledby="privacy-h">
        <Typography variant="h5" component="h2" id="privacy-h" gutterBottom>
          Your data stays with you
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          All assessment data is stored locally in your browser using IndexedDB. Nothing is
          transmitted to a server, and no one else can see your responses.
        </Typography>
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="body2">
            <strong>Back up your work.</strong> Because data lives in your browser, clearing browser
            data or switching devices will erase your assessments. Export a ZIP backup regularly so
            you can restore or move your work.
          </Typography>
        </Alert>
        <Button variant="outlined" component={RouterLink} to="/import-export">
          Open Import / Export
        </Button>
      </Paper>

      {/* --- Offline workbook ------------------------------------------------ */}
      {/*
       * Between "your data stays with you" and "get involved", so the reading order is: how to use
       * the tool, what happens to your data, what to do if you cannot use the tool at all, how to
       * contribute. The **Landing hero** carries the primary link — an earlier revision of this
       * comment said Import/Export did, which stopped being true when the link was repositioned
       * after the 4.1.0 deploy. This one exists because the Guide is where someone goes to find out
       * whether the tool fits their situation at all.
       */}
      <Paper sx={{ p: { xs: 3, md: 4 }, mb: 3 }} component="section" aria-labelledby="workbook-h">
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <TableViewIcon aria-hidden="true" color="primary" />
          <Typography variant="h5" component="h2" id="workbook-h">
            If you cannot use a browser tool
          </Typography>
        </Stack>
        <Typography variant="body1" color="text.secondary" paragraph>
          {/* "cannot describe different assessments" was removed from this sentence deliberately.
              Both artifacts are generated from the same model files, but the workbook's scoring is a
              second implementation in Excel formulas, and no test in this repo can evaluate a
              formula — equivalence is checked by a manual, non-CI step, and has been wrong before.
              So this claims shared rules, which is verifiable, rather than guaranteed agreement. */}
          The same assessment is available as an Excel workbook. It covers every capability domain,
          capability area and maturity aspect, and calculates scores with Excel formulas that mirror
          the rules this tool uses. It needs no add-ins, macros or internet connection, and works in
          Excel 2007 or later.
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          The workbook you download is blank. It is not an export of an assessment you have started
          here, and completing it does not feed anything back into this tool — the two are separate
          routes to the same result.
        </Typography>
        {/* Type and size via aria-describedby, not aria-label — see the note on Import/Export. An
            aria-label here failed WCAG 2.5.3 because it did not contain the visible label. */}
        <Button
          variant="outlined"
          href={WORKBOOK_DOWNLOAD_URL}
          download={WORKBOOK_FILENAME}
          startIcon={<TableViewIcon />}
          aria-describedby="guide-workbook-meta"
        >
          Download the workbook
        </Button>
        <Typography
          id="guide-workbook-meta"
          variant="caption"
          color="text.secondary"
          component="p"
          sx={{ mt: 1 }}
        >
          {WORKBOOK_FILE_TYPE} · {WORKBOOK_APPROX_SIZE}
        </Typography>
      </Paper>

      {/* --- Get involved ------------------------------------------------ */}
      <Paper sx={{ p: { xs: 3, md: 4 } }} component="section" aria-labelledby="involved-h">
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <GitHubIcon aria-hidden="true" />
          <Typography variant="h5" component="h2" id="involved-h">
            Get involved
          </Typography>
        </Stack>
        <Typography variant="body1" color="text.secondary" paragraph>
          This is an open-source project and contributions are welcome — whether you are a Medicaid
          professional, a developer, or just have an idea to share.
        </Typography>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6}>
            <EngagementItem
              icon={<BugReportOutlinedIcon color="primary" aria-hidden="true" sx={{ mt: 0.25 }} />}
              title="Report a bug"
              body="Something not working right? Open an issue so we can fix it."
              href={bugReportUrl}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <EngagementItem
              icon={<LightbulbOutlinedIcon color="primary" aria-hidden="true" sx={{ mt: 0.25 }} />}
              title="Suggest a feature"
              body="Have an idea that would make the tool more useful? We would love to hear it."
              href={featureRequestUrl}
            />
          </Grid>
        </Grid>

        {GITHUB_REPO_URL && (
          <Button
            variant="contained"
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            startIcon={<GitHubIcon />}
            /*
             * Must contain the visible label verbatim (WCAG 2.5.3 Label in Name). This previously
             * read "View the project on GitHub (opens in new window)", which does not contain
             * "View on GitHub" as a substring — the interposed words break it. Fixed here because
             * the workbook links above were about to copy the same pattern.
             */
            aria-label="View on GitHub (opens in new window)"
          >
            View on GitHub
          </Button>
        )}

        <Divider sx={{ my: 3 }} />
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Built with
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Chip label="React" size="small" variant="outlined" />
          <Chip label="TypeScript" size="small" variant="outlined" />
          <Chip label="Material UI" size="small" variant="outlined" />
          <Chip label="IndexedDB" size="small" variant="outlined" />
          <Chip label="Progressive Web App" size="small" variant="outlined" />
        </Stack>
      </Paper>
    </Container>
  );
}
