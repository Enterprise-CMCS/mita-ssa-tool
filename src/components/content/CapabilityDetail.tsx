'use client';

import { useContent } from './ContentProvider';

interface CapabilityDetailProps {
  capabilityId: string;
}

/**
 * Component for displaying detailed information about a capability
 */
export function CapabilityDetail({ capabilityId }: CapabilityDetailProps) {
  const { getCapability, isLoading, error } = useContent();

  if (isLoading) {
    return <div>Loading capability details...</div>;
  }

  if (error) {
    return <div>Error loading capability: {error.message}</div>;
  }

  const capability = getCapability(capabilityId);

  if (!capability) {
    return <div>Capability not found: {capabilityId}</div>;
  }

  return (
    <div className="capability-detail">
      <h2>{capability.capabilityAreaName}</h2>
      <div className="capability-meta">
        <span>Domain: {capability.capabilityDomainName}</span>
        <span>Version: {capability.capabilityVersion}</span>
        <span>Last Updated: {capability.capabilityAreaLastUpdated}</span>
      </div>

      <div className="capability-description">
        <h3>Description</h3>
        <p>{capability.description}</p>
      </div>

      <div className="capability-dimensions">
        <h3>Dimensions</h3>

        <div className="dimension">
          <h4>Outcome</h4>
          <p>{capability.dimensions.outcome.description}</p>
          <h5>Maturity Assessment</h5>
          <ul>
            {capability.dimensions.outcome.maturityAssessment.map((assessment, index) => (
              <li key={index}>{assessment}</li>
            ))}
          </ul>
        </div>

        <div className="dimension">
          <h4>Role</h4>
          <p>{capability.dimensions.role.description}</p>
          <h5>Maturity Assessment</h5>
          <ul>
            {capability.dimensions.role.maturityAssessment.map((assessment, index) => (
              <li key={index}>{assessment}</li>
            ))}
          </ul>
        </div>

        <div className="dimension">
          <h4>Business Process</h4>
          <p>{capability.dimensions.businessProcess.description}</p>
          <h5>Maturity Assessment</h5>
          <ul>
            {capability.dimensions.businessProcess.maturityAssessment.map((assessment, index) => (
              <li key={index}>{assessment}</li>
            ))}
          </ul>
        </div>

        <div className="dimension">
          <h4>Information</h4>
          <p>{capability.dimensions.information.description}</p>
          <h5>Maturity Assessment</h5>
          <ul>
            {capability.dimensions.information.maturityAssessment.map((assessment, index) => (
              <li key={index}>{assessment}</li>
            ))}
          </ul>
        </div>

        <div className="dimension">
          <h4>Technology</h4>
          <p>{capability.dimensions.technology.description}</p>
          <h5>Maturity Assessment</h5>
          <ul>
            {capability.dimensions.technology.maturityAssessment.map((assessment, index) => (
              <li key={index}>{assessment}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default CapabilityDetail;
