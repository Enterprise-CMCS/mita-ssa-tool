#!/usr/bin/env python3
"""
Generate capabilities.json v4 from the v3 file, per
docs/decisions/CAPABILITY_MODEL_UPDATE_PLAN.md Section 4.

Transformation summary (authoritative source: slides 4-6 of the July 2026
BA working group deck plus Chris's follow-up answers):
  - 16 domains / 66 areas  ->  14 domains / 72 areas
  - Remove Business Relationship Management and Enterprise Governance domains
  - Enterprise Architecture domain: Support -> Strategic, single combined
    "Enterprise Governance" organizational area
  - Enterprise Data Management -> Data Management (flattened, -BI&DS, renames)
  - Enterprise Technology -> Technology Management (flattened, names unchanged)
  - Waiver Management moves Care and Service Coordination -> Plan and Policy
  - 9 new "<X> Information Management" areas + 2 existing = 11 flagged with
    informationManagement: true
  - Renames per the plan's naming rule (ids follow names)
  - New areas get "[Placeholder ...]" descriptions and empty topics

Usage: python3 scripts/generate-capabilities-v4.py
Writes src/data/capabilities.json in place and prints a verification summary.
"""

import json
from collections import OrderedDict

SRC = 'src/data/capabilities.json'

PLACEHOLDER = '[Placeholder — pending updated Capability Reference Model] '


def info_mgmt_desc(domain_phrase):
    """Standard provisional description for Information Management areas."""
    return (
        PLACEHOLDER
        + f'Manage the information that supports {domain_phrase} capabilities, '
        'including its capture, maintenance, quality, and use.'
    )


def new_area(area_id, name, description, info_mgmt=False):
    """Build a new area entry with placeholder description and empty topics."""
    area = OrderedDict(
        [('id', area_id), ('name', name), ('description', description), ('topics', [])]
    )
    if info_mgmt:
        area['informationManagement'] = True
    return area


def main():
    with open(SRC) as f:
        model = json.load(f, object_pairs_hook=OrderedDict)

    # Index existing areas by id (flattening categorized domains)
    existing = {}
    for domain in model['domains']:
        areas = domain.get('areas') or [
            a for c in domain.get('categories', []) for a in c['areas']
        ]
        for area in areas:
            existing[area['id']] = area
        # keep the domain objects addressable too
    domains_by_id = {d['id']: d for d in model['domains']}

    def keep(area_id, info_mgmt=False):
        """Carry an existing area forward unchanged (optionally flagging it)."""
        area = OrderedDict(existing[area_id])
        if info_mgmt:
            area['informationManagement'] = True
        return area

    def rename(old_id, new_id, new_name):
        """Carry an existing area forward under a new id/name (desc preserved)."""
        area = OrderedDict(existing[old_id])
        area['id'] = new_id
        area['name'] = new_name
        return area

    # ------------------------------------------------------------------
    # Strategic layer
    # ------------------------------------------------------------------
    plan_policy = OrderedDict(domains_by_id['plan-policy-management'])
    plan_policy['areas'] = [
        keep('health-plan-administration'),
        keep('health-benefits-administration'),
        new_area(
            'program-administration',
            'Program Administration',
            PLACEHOLDER
            + "Administer the Medicaid program's operations, including program design, "
            'implementation, and operational oversight.',
        ),
        keep('waiver-management'),  # moved from care-service-coordination
        new_area(
            'plan-information-management',
            'Plan Information Management',
            info_mgmt_desc('plan and policy management'),
            info_mgmt=True,
        ),
    ]

    strategy = OrderedDict(domains_by_id['strategy-planning-management'])
    strategy['areas'] = [
        rename('maintain-strategic-plan', 'strategic-plan-maintenance', 'Strategic Plan Maintenance'),
        rename('develop-agency-roadmap', 'strategic-roadmap-management', 'Strategic Roadmap Management'),
        new_area(
            'strategy-oversight-and-accountability',
            'Strategy Oversight and Accountability',
            PLACEHOLDER
            + 'Provide oversight and accountability for strategy execution, tracking '
            'progress against enterprise goals and priorities.',
        ),
        new_area(
            'strategy-information-management',
            'Strategy Information Management',
            info_mgmt_desc('strategy and planning management'),
            info_mgmt=True,
        ),
    ]
    # dropped: state-plan-administration

    ea_domain = OrderedDict(domains_by_id['enterprise-architecture-domain'])
    ea_domain['layer'] = 'strategic'
    ea_domain['areas'] = [
        new_area(
            'enterprise-governance',
            'Enterprise Governance',
            PLACEHOLDER
            + 'Assess organizational maturity across Outcomes, Roles, and Enterprise '
            'Architecture. These aspects are assessed once for the whole organization '
            'rather than per capability area.',
        ),
    ]

    # ------------------------------------------------------------------
    # Core layer
    # ------------------------------------------------------------------
    care = OrderedDict(domains_by_id['care-service-coordination'])
    care['areas'] = [
        keep('long-term-care-support'),
        keep('visit-verification'),
        keep('case-management'),
        keep('prior-authorization'),
        new_area(
            'care-information-management',
            'Care Information Management',
            info_mgmt_desc('care and service coordination'),
            info_mgmt=True,
        ),
    ]
    # waiver-management moved out

    claims = OrderedDict(domains_by_id['claims-encounter-management'])
    claims['areas'] = [
        keep('claims-encounter-submission'),
        keep('claims-adjudication'),
        keep('encounter-processing'),
        keep('claims-encounters-adjustments'),
        keep('claims-encounters-lifecycle'),
        new_area(
            'claim-and-encounter-information-management',
            'Claim and Encounter Information Management',
            info_mgmt_desc('claims and encounter management'),
            info_mgmt=True,
        ),
    ]

    contract = OrderedDict(domains_by_id['contract-management'])
    contract['areas'] = [
        keep('contract-lifecycle-management'),
        keep('contractor-management'),
        new_area(
            'contractor-support-management',
            'Contractor Support Management',
            PLACEHOLDER
            + 'Support contractors through inquiries, grievances, appeals, and related '
            'assistance.',
        ),
        keep('contract-information-management', info_mgmt=True),
    ]

    financial = OrderedDict(domains_by_id['financial-management'])
    financial['areas'] = [
        rename('accounts-receivable', 'accounts-receivable-management', 'Accounts Receivable Management'),
        rename('accounts-payable', 'accounts-payable-management', 'Accounts Payable Management'),
        keep('fiscal-budget-management'),
        keep('fund-management'),
        keep('third-party-liability'),
        keep('financial-information-management', info_mgmt=True),
    ]

    member = OrderedDict(domains_by_id['member-management'])
    member['areas'] = [
        rename('member-eligibility-management', 'member-eligibility', 'Member Eligibility'),
        rename('member-enrollment-management', 'member-enrollment', 'Member Enrollment'),
        keep('member-support-management'),
        new_area(
            'member-information-management',
            'Member Information Management',
            info_mgmt_desc('member management'),
            info_mgmt=True,
        ),
    ]

    pharmacy = OrderedDict(domains_by_id['pharmacy-management'])
    pharmacy['areas'] = [
        keep('pharmacy-benefit-administration'),
        keep('drug-monitoring-oversight'),
        new_area(
            'pharmacy-information-management',
            'Pharmacy Information Management',
            info_mgmt_desc('pharmacy management'),
            info_mgmt=True,
        ),
    ]

    provider = OrderedDict(domains_by_id['provider-management'])
    provider['areas'] = [
        keep('provider-enrollment'),
        # Renamed from provider-screening; the old description describes
        # screening, not eligibility, so this gets a placeholder (plan 4.5).
        new_area(
            'provider-eligibility',
            'Provider Eligibility',
            PLACEHOLDER
            + 'Determine and maintain provider eligibility to participate in the '
            'Medicaid program.',
        ),
        keep('provider-monitoring'),
        keep('provider-support-management'),
        new_area(
            'provider-information-management',
            'Provider Information Management',
            info_mgmt_desc('provider management'),
            info_mgmt=True,
        ),
    ]

    # ------------------------------------------------------------------
    # Support layer
    # ------------------------------------------------------------------
    compliance = OrderedDict(domains_by_id['compliance-management'])
    compliance['areas'] = [
        keep('program-monitoring-management'),
        keep('program-performance-evaluation'),
        new_area(
            'compliance-information-management',
            'Compliance Information Management',
            info_mgmt_desc('compliance management'),
            info_mgmt=True,
        ),
    ]

    communication = OrderedDict(domains_by_id['communication-management'])
    communication['areas'] = [
        keep('communication-development'),
        keep('communication-intake'),
        keep('communication-dissemination'),
        keep('public-affairs'),
        new_area(
            'communication-information-management',
            'Communication Information Management',
            info_mgmt_desc('communication management'),
            info_mgmt=True,
        ),
    ]

    data_mgmt = OrderedDict(domains_by_id['data-management'])
    data_mgmt['name'] = 'Data Management'
    data_mgmt['description'] = (
        "The Data Management Capability Domain represents the SMA's ability to manage "
        'its data through planning, design, use, enhancement, enablement, and '
        'maintenance.'
    )
    data_mgmt.pop('categories', None)
    data_mgmt['areas'] = [
        keep('data-governance'),
        rename(
            'data-storage-warehousing',
            'data-storage-operations-warehousing',
            'Data Storage, Operations, and Warehousing',
        ),
        keep('data-architecture-modeling-design'),
        keep('master-data-management'),
        keep('reference-data-management'),
        keep('document-content-management'),
        keep('data-integration-interoperability'),
        rename('data-quality', 'data-quality-management', 'Data Quality Management'),
        keep('data-security-privacy'),
        keep('metadata-management'),
    ]
    # dropped: business-intelligence-data-science

    technology = OrderedDict(domains_by_id['technical'])
    technology['name'] = 'Technology Management'
    technology['description'] = (
        "The Technology Management Capability Domain represents the SMA's technology "
        'capabilities that enable and support core, strategic, and support '
        'capabilities. These areas align one-to-one with the Technology dimension of '
        'the ORBIT maturity model.'
    )
    technology.pop('categories', None)
    technology['areas'] = [
        keep('compute-and-storage'),
        keep('networking-and-technical-recovery'),
        keep('identity-access-and-consent'),
        keep('security-protection-and-monitoring'),
        keep('system-operations-and-monitoring'),
        keep('development-testing-release-and-security-compliance'),
        keep('api-messaging-and-integration'),
        keep('application-hosting-and-platform-services'),
        keep('business-rules-and-workflows'),
        keep('modular-architecture'),
        keep('user-interfaces-and-session-management'),
    ]

    # ------------------------------------------------------------------
    # Assemble (order: strategic, core, support; alphabetical-ish per layer,
    # matching the existing file's convention)
    # ------------------------------------------------------------------
    model['version'] = '4.0'
    model['lastUpdated'] = '2026-07-30'
    model['description'] = (
        'MITA 4.0 Capability Reference Model: 14 capability domains and 72 capability '
        'areas across Strategic, Core, and Support layers. Source: BA working group '
        'capability model (July 2026), slides 4-6.'
    )
    model['domains'] = [
        # strategic
        ea_domain,
        plan_policy,
        strategy,
        # core
        care,
        claims,
        contract,
        financial,
        member,
        pharmacy,
        provider,
        # support
        compliance,
        communication,
        data_mgmt,
        technology,
    ]

    # ------------------------------------------------------------------
    # Verify integrity before writing
    # ------------------------------------------------------------------
    layers = {'strategic': [], 'core': [], 'support': []}
    all_ids = []
    info_flags = []
    for d in model['domains']:
        assert 'categories' not in d, f'domain {d["id"]} still has categories'
        layers[d['layer']].append(d['id'])
        for a in d['areas']:
            all_ids.append(a['id'])
            if a.get('informationManagement'):
                info_flags.append(a['id'])
            assert a['description'], f'area {a["id"]} missing description'
            assert isinstance(a['topics'], list)

    assert len(model['domains']) == 14, f'expected 14 domains, got {len(model["domains"])}'
    assert len(all_ids) == 72, f'expected 72 areas, got {len(all_ids)}'
    assert len(set(all_ids)) == 72, 'duplicate area ids'
    assert (len(layers['strategic']), len(layers['core']), len(layers['support'])) == (3, 7, 4)
    assert len(info_flags) == 11, f'expected 11 informationManagement flags, got {len(info_flags)}'

    area_counts = {d['id']: len(d['areas']) for d in model['domains']}
    expected_counts = {
        'enterprise-architecture-domain': 1,
        'plan-policy-management': 5,
        'strategy-planning-management': 4,
        'care-service-coordination': 5,
        'claims-encounter-management': 6,
        'contract-management': 4,
        'financial-management': 6,
        'member-management': 4,
        'pharmacy-management': 3,
        'provider-management': 5,
        'compliance-management': 3,
        'communication-management': 5,
        'data-management': 10,
        'technical': 11,
    }
    assert area_counts == expected_counts, f'area counts mismatch: {area_counts}'

    with open(SRC, 'w') as f:
        json.dump(model, f, indent=2, ensure_ascii=False)
        f.write('\n')

    strat = sum(len(d['areas']) for d in model['domains'] if d['layer'] == 'strategic')
    core = sum(len(d['areas']) for d in model['domains'] if d['layer'] == 'core')
    supp = sum(len(d['areas']) for d in model['domains'] if d['layer'] == 'support')
    print(f'OK: 14 domains / 72 areas (strategic {strat}, core {core}, support {supp})')
    print(f'informationManagement flags: {len(info_flags)}: {sorted(info_flags)}')


if __name__ == '__main__':
    main()
