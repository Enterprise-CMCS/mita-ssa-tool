import fs from 'fs';
import path from 'path';

import { loadCapabilityDefinitions, parseCapabilityMarkdown } from '../utils/capabilityParser';

/**
 * Example demonstrating how to use the markdown parser
 */
async function runParserExample() {
  // Example 1: Parse a single markdown file
  const contentDir = path.join(process.cwd(), 'public', 'content');
  const sampleFilePath = path.join(contentDir, 'sample-provider-enrollment.md');

  try {
    console.log('Example 1: Parsing a single markdown file');
    const fileContent = fs.readFileSync(sampleFilePath, 'utf8');
    const capability = parseCapabilityMarkdown(fileContent);

    console.log('Parsed capability:');
    console.log(`- ID: ${capability.id}`);
    console.log(`- Name: ${capability.capabilityAreaName}`);
    console.log(`- Domain: ${capability.capabilityDomainName}`);
    console.log(`- Version: ${capability.capabilityVersion}`);
    console.log(`- Last Updated: ${capability.capabilityAreaLastUpdated}`);
    console.log(`- Description: ${capability.description.substring(0, 100)}...`);

    // Display outcome dimension details
    console.log('\nOutcome Dimension:');
    console.log(`- Description: ${capability.dimensions.outcome.description}`);
    console.log('- Assessment Questions:');
    capability.dimensions.outcome.maturityAssessment.forEach((q, i) => {
      console.log(`  ${i + 1}. ${q}`);
    });

    console.log('- Maturity Levels:');
    console.log(
      `  Level 1: ${capability.dimensions.outcome.maturityLevels.level1.substring(0, 50)}...`
    );
    console.log(
      `  Level 5: ${capability.dimensions.outcome.maturityLevels.level5.substring(0, 50)}...`
    );

    // Example 2: Load all capability definitions from a directory
    console.log('\nExample 2: Loading all capability definitions from directory');
    // Read all markdown files from the directory
    const files = fs.readdirSync(contentDir).filter(file => file.endsWith('.md'));
    const capabilityData = files.map(file => fs.readFileSync(path.join(contentDir, file), 'utf8'));
    const capabilities = loadCapabilityDefinitions(capabilityData);
    console.log(`Loaded ${capabilities.length} capability definitions`);

    // Display summary of all loaded capabilities
    capabilities.forEach((cap, i) => {
      console.log(`\nCapability ${i + 1}: ${cap.capabilityAreaName} (${cap.capabilityDomainName})`);
    });
  } catch (error) {
    console.error('Error in parser example:', error);
  }
}

// Run the example
runParserExample().catch(console.error);

export default runParserExample;
