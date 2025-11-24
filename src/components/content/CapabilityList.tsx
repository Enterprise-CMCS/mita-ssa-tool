'use client';

import { useState } from 'react';

import { useContent } from './ContentProvider';

import type { CapabilityDefinition } from '../../types';

interface CapabilityListProps {
  domainFilter?: string;
  onSelectCapability?: (capability: CapabilityDefinition) => void;
}

/**
 * Component for displaying a list of capabilities with optional filtering
 */
export function CapabilityList({ domainFilter, onSelectCapability }: CapabilityListProps) {
  const { capabilities, isLoading, error } = useContent();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Filter capabilities by domain if a filter is provided
  const filteredCapabilities = domainFilter
    ? capabilities.filter(cap => cap.capabilityDomainName === domainFilter)
    : capabilities;

  // Handle capability selection
  const handleSelect = (capability: CapabilityDefinition) => {
    setSelectedId(capability.id);
    if (onSelectCapability) {
      onSelectCapability(capability);
    }
  };

  if (isLoading) {
    return <div>Loading capabilities...</div>;
  }

  if (error) {
    return <div>Error loading capabilities: {error.message}</div>;
  }

  if (filteredCapabilities.length === 0) {
    return <div>No capabilities found{domainFilter ? ` for domain "${domainFilter}"` : ''}.</div>;
  }

  return (
    <div className="capability-list">
      <h2>Capabilities{domainFilter ? ` for ${domainFilter}` : ''}</h2>
      <ul>
        {filteredCapabilities.map(capability => (
          <li
            key={capability.id}
            className={selectedId === capability.id ? 'selected' : ''}
            onClick={() => handleSelect(capability)}
          >
            <h3>{capability.capabilityAreaName}</h3>
            <div className="capability-meta">
              <span>Domain: {capability.capabilityDomainName}</span>
              <span>Version: {capability.capabilityVersion}</span>
            </div>
            <p>{capability.description.substring(0, 100)}...</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default CapabilityList;
