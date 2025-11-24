import { useState } from 'react';

import { ContentProvider, CapabilityList } from '../components/content';
import { CapabilityDetail } from '../components/content/CapabilityDetail';

import type { CapabilityDefinition } from '../types';

/**
 * Example page demonstrating the Content Loading Component
 */
export default function ExamplePage() {
  const [selectedCapability, setSelectedCapability] = useState<CapabilityDefinition | null>(null);
  const contentDirectory = '/content';

  const handleCapabilitySelect = (capability: CapabilityDefinition) => {
    setSelectedCapability(capability);
  };

  const handleContentLoaded = (capabilities: CapabilityDefinition[]) => {
    // Log the number of loaded capabilities
    console.error(`Loaded ${capabilities.length} capabilities`);
  };

  return (
    <div className="container">
      <h1>MITA Capability Browser</h1>

      <ContentProvider contentDirectory={contentDirectory} onLoaded={handleContentLoaded}>
        <div className="content-layout">
          <div className="sidebar">
            <CapabilityList onSelectCapability={handleCapabilitySelect} />
          </div>

          <div className="main-content">
            {selectedCapability ? (
              <CapabilityDetail capabilityId={selectedCapability.id} />
            ) : (
              <div className="placeholder">
                <p>Select a capability from the list to view details</p>
              </div>
            )}
          </div>
        </div>
      </ContentProvider>
    </div>
  );
}
