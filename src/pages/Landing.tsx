/**
 * Landing page - Introduction and overview for first-time visitors
 */

import { JSX } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { Box, Button, Container, Paper, Typography, Grid, Link, Alert, Stack } from '@mui/material';
import SecurityIcon from '@mui/icons-material/Security';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import AssessmentIcon from '@mui/icons-material/Assessment';
import DownloadIcon from '@mui/icons-material/Download';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import TableViewIcon from '@mui/icons-material/TableView';

import {
  WORKBOOK_APPROX_SIZE,
  WORKBOOK_DOWNLOAD_URL,
  WORKBOOK_FILE_TYPE,
  WORKBOOK_FILENAME,
} from '../constants';

export default function Landing(): JSX.Element {
  const navigate = useNavigate();

  const features = [
    {
      icon: <SecurityIcon sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: 'Privacy First',
      description:
        'All data stays in your browser. No accounts required, no servers, no data collection.',
    },
    {
      icon: <CloudOffIcon sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: 'Works Offline',
      /*
       * Precise rather than sweeping, on purpose. The app is genuinely usable with no network —
       * a service worker caches it on the first visit — but "works offline" on its own invites
       * the reading that it works before you have ever opened it, which is not possible for
       * anything served over the web. Naming the first visit is the honest version.
       */
      description: 'Open it once with a connection, then keep working without one.',
    },
    {
      icon: <AssessmentIcon sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: 'Guided Assessment',
      description:
        'Step-by-step workflow with guiding questions to help determine your maturity levels.',
    },
    {
      icon: <DownloadIcon sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: 'Export & Backup',
      description: 'Generate PDF reports, CSV exports for CMS, and ZIP backups of all your data.',
    },
  ];

  return (
    <Box>
      {/* Hero Section */}
      {/*
       * The hero steps down on small screens. A flat 60px `h2` wrapped this title onto four lines
       * on a phone, which pushed the choice out of reach and looked wrong besides.
       *
       * Be precise about what this buys, because the honest answer is "less than hoped". Measured
       * against the real scroller on the built site:
       *
       *   1280x720   link fully visible, 128px of slack, 26% down the page
       *   375x667    still 170px below the fold, but 16% down the page rather than 80%
       *
       * On phones "above the fold" is not achievable from this component. At 375x667 the `AppBar`,
       * the two CMS notice bands and the footer take 380px of 667, leaving `<main>` 287px — and the
       * `AppBar` alone is 128px of it. No hero that still carries a title, a tagline and a sentence
       * of explanation fits a second button into that, so fixing it means fixing the chrome, which
       * is a separate piece of work (OBS-46). The claim this change can actually make is "above the
       * fold on desktop and tablet, and one short scroll instead of four on a phone" — which is
       * still the difference between finding this and not.
       *
       * Sizes are set here rather than in the theme because `h2` is used elsewhere at widths where
       * the flat size is right, and this hero is the only place the fold is a requirement.
       */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #0071bc 0%, #004c8c 100%)',
          color: 'white',
          py: { xs: 4, sm: 6, md: 8 },
        }}
      >
        <Container maxWidth="md">
          <Typography
            variant="h2"
            component="h1"
            gutterBottom
            fontWeight={700}
            sx={{ fontSize: { xs: '2rem', sm: '3rem', md: '3.75rem' } }}
          >
            MITA 4.0 State Self-Assessment Tool
          </Typography>
          {/*
           * The `xs` step-down crosses a WCAG threshold, which is worth stating because nothing in
           * the code hints at it. At 18px/600 this is no longer "large text" (that needs 24px, or
           * 18.66px at weight 700), so its contrast requirement moves from 3:1 to **4.5:1**.
           * Measured over the gradient at the lightest point under it: 4.83:1 at 375px and 4.70:1 at
           * 599px, the worst point in the range. It passes by about 0.2, so the `opacity: 0.9` and
           * this font size are both load-bearing — do not lighten either without re-measuring.
           */}
          <Typography
            variant="h5"
            component="p"
            sx={{ mb: 2, opacity: 0.9, fontSize: { xs: '1.125rem', sm: '1.5rem' } }}
          >
            Assess your Medicaid Enterprise maturity using the ORBIT framework
          </Typography>
          <Typography variant="body1" sx={{ mb: 4, opacity: 0.85, maxWidth: 600 }}>
            A free, open-source tool for State Medicaid Agencies to evaluate capabilities across the
            MITA maturity dimensions. Your data stays private—stored only in your browser.
          </Typography>
          {/*
           * Two routes, offered together, because this is the moment the choice is actually made.
           *
           * The workbook link is in the hero rather than only further down the page because of who
           * needs it: someone who **cannot use a browser-based tool at all**. Measured on the
           * deployed site, the three original placements sat 80-92% of the way down their pages, and
           * nothing above the fold mentioned Excel — so the one person the workbook exists for would
           * conclude the tool did not suit them and leave before finding it. It is now 26% down the
           * page on a desktop and 16% on a phone; see the note on the hero's responsive sizes for
           * where that does and does not clear the fold.
           *
           * It is deliberately the *secondary* affordance: outlined against the filled primary, and
           * second in the tab order. Most states can use the browser tool, and this should not read
           * as an equal recommendation.
           */}
          {/*
           * No `alignItems` on purpose — flex stretches by default and `Stack` sets nothing, so the
           * row equalises the two buttons itself.
           *
           * Worth a comment because the obvious thing to reach for here is `center`, and it is
           * wrong. These two buttons have different intrinsic heights: `variant="outlined"` carries
           * a 1px border top and bottom that `"contained"` does not, and MUI's padding only
           * compensates for that when you have not overridden `py` — which both of these do.
           * Centring them left the outlined one 2px taller, overhanging the row on both edges. The
           * other repair, shaving 1px off this button's `py` by hand, couples the two values with
           * nothing to keep them in step and no test able to see the drift, since jsdom has no
           * layout.
           */}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Button
              variant="contained"
              size="large"
              onClick={() => navigate('/dashboard')}
              sx={{
                backgroundColor: 'white',
                color: 'primary.main',
                '&:hover': {
                  backgroundColor: 'grey.100',
                },
                px: 4,
                py: 1.5,
              }}
              endIcon={<ArrowForwardIcon />}
            >
              Get Started
            </Button>
            <Button
              variant="outlined"
              size="large"
              href={WORKBOOK_DOWNLOAD_URL}
              download={WORKBOOK_FILENAME}
              startIcon={<TableViewIcon />}
              aria-describedby="hero-workbook-meta"
              sx={{
                /*
                 * Contrast here was measured, not estimated, because axe cannot check it: it reports
                 * `color-contrast` as *incomplete* over a gradient, and this whole hero sits on one.
                 * Sampled from a render of the built page with all hero glyphs made transparent, so
                 * the samples are the real gradient rather than antialiased text — an earlier
                 * estimate read 4.18:1 precisely because it caught a glyph edge.
                 *
                 * Figures are each element's own worst point — its lightest corner — and the
                 * viewport is part of the claim, because a wider hero is shorter and so the gradient
                 * under a given row is lighter:
                 *
                 *   1280px   label 6.4:1, border 4.0:1   (worst background #0061a7)
                 *    599px   label 6.1:1, border 3.8:1   (the narrow end, and the worse one)
                 *
                 * Against 4.5:1 for the label as normal-size text and 3:1 for the border as a
                 * component boundary. Quote one sample point per element and name the width: a first
                 * pass reported the border as 4.17:1, which is its value at the button's midpoint,
                 * paired with a background read at its edge — and stated it as if it were absolute.
                 */
                color: 'white',
                borderColor: 'rgba(255,255,255,0.7)',
                '&:hover': {
                  borderColor: 'white',
                  backgroundColor: 'rgba(255,255,255,0.08)',
                },
                px: 3,
                py: 1.5,
              }}
            >
              Prefer Excel? Download the workbook
            </Button>
          </Stack>
          {/*
           * Visible caption, referenced by the button's `aria-describedby` rather than duplicated
           * into an `aria-label` — same reasoning as the other two workbook links, and the same
           * WCAG 2.5.3 trap they fell into (OBS-41).
           *
           * 12px at 85% opacity is the thinnest text on this gradient, so it was measured the same
           * way as the button: 4.9:1 composited at the lightest point under it, against 4.5:1.
           *
           * One thing this trade costs, which no accessible-name check can see: the link it
           * describes previously carried the type and size in its *visible* text, so they appeared
           * in a screen reader's links-list dialog, which reads names and ignores descriptions. They
           * now reach that user only when they arrive at the link itself. Accepted, because the
           * visible-text version is what broke WCAG 2.5.3 and hid the size from sighted users.
           */}
          <Typography
            id="hero-workbook-meta"
            variant="caption"
            component="p"
            // Same measure as the body paragraph above, so the smallest type on the page does not
            // run the full container width.
            sx={{ mt: 1.5, opacity: 0.85, maxWidth: 600 }}
          >
            A blank {WORKBOOK_FILE_TYPE} covering the whole assessment, {WORKBOOK_APPROX_SIZE}. No
            account or internet connection needed to fill it in.
          </Typography>
        </Container>
      </Box>

      {/* Features Section */}
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Grid container spacing={4}>
          {features.map((feature, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  height: '100%',
                  textAlign: 'center',
                  border: '1px solid',
                  borderColor: 'grey.200',
                }}
              >
                <Box sx={{ mb: 2 }} aria-hidden="true">
                  {feature.icon}
                </Box>
                <Typography variant="h6" component="h2" gutterBottom>
                  {feature.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {feature.description}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* How It Works Section */}
      <Box sx={{ backgroundColor: 'grey.50', py: 6 }}>
        <Container maxWidth="md">
          <Typography variant="h4" component="h2" gutterBottom>
            How It Works
          </Typography>

          <Grid container spacing={4} sx={{ mt: 1 }}>
            <Grid item xs={12} md={4}>
              <Typography variant="h6" component="h3" color="primary" gutterBottom>
                1. Select a Capability
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Browse the Dashboard to see all 72 capability areas organized by domain. Click any
                area to start its assessment.
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="h6" component="h3" color="primary" gutterBottom>
                2. Rate Each Dimension
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Evaluate your maturity across the ORBIT dimensions using the guided questions. Add
                notes and attach evidence as you go.
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="h6" component="h3" color="primary" gutterBottom>
                3. Export Your Results
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Finalize assessments and export reports. Use tags to organize your work and create
                backups to protect your data.
              </Typography>
            </Grid>
          </Grid>

          {/*
           * The workbook link that used to sit here has moved to the hero (Decision 10 is satisfied
           * either way — it asked for a landing-page link, not a specific position).
           *
           * Not kept in both places: with the hero carrying it, a second link here repeated the same
           * visible text for the same audience two screens apart. The hero is strictly better placed
           * — measured, this spot was 80% of the way down the page, and someone who cannot use the
           * browser tool has no reason to scroll that far before giving up on it.
           */}
          <Box sx={{ mt: 4, textAlign: 'center' }}>
            <Link component={RouterLink} to="/guide">
              Learn more about using this tool
            </Link>
          </Box>
        </Container>
      </Box>

      {/* Data Privacy Notice */}
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            <strong>Your data is private.</strong> All assessment data is stored locally in your
            browser. Nothing is sent to external servers. Remember to export your data regularly as
            a backup—clearing your browser data will remove your assessments.
          </Typography>
        </Alert>

        <Box sx={{ textAlign: 'center' }}>
          <Button
            variant="contained"
            size="large"
            onClick={() => navigate('/dashboard')}
            endIcon={<ArrowForwardIcon />}
          >
            Go to Dashboard
          </Button>
        </Box>
      </Container>
    </Box>
  );
}
