export function matchJobStatus(jobStatus: string | undefined | null, targetStatus: string): boolean {
  if (!jobStatus || !targetStatus) return false;
  const normJob = jobStatus.toLowerCase().replace(/[\s_-]+/g, '');
  const normTarget = targetStatus.toLowerCase().replace(/[\s_-]+/g, '');

  if (
    (normJob.includes('route') || normJob.includes('transit')) &&
    (normTarget.includes('route') || normTarget.includes('transit'))
  ) {
    return true;
  }

  if (normJob.includes('prog') && normTarget.includes('prog')) {
    return true;
  }

  if (normJob.includes('sched') && normTarget.includes('sched')) {
    return true;
  }

  if (normJob.includes('site') && normTarget.includes('site')) {
    return true;
  }

  if (normJob.includes('comp') && normTarget.includes('comp')) {
    return true;
  }

  if (normJob.includes('canc') && normTarget.includes('canc')) {
    return true;
  }

  return normJob === normTarget;
}

export function getDisplayJobStatus(
  jobStatus: string | undefined | null,
  availableStatuses?: string[] | null
): string {
  if (!jobStatus) return 'Scheduled';
  const list = Array.isArray(availableStatuses) && availableStatuses.length > 0
    ? availableStatuses
    : ['Scheduled', 'In Transit', 'On Site', 'In Progress', 'Completed', 'Cancelled'];
  const matched = list.find((st) => typeof st === 'string' && matchJobStatus(jobStatus, st));
  if (matched) return matched;
  return jobStatus.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function findRoleLabel(
  roleKey: 'electrical' | 'control' | 'welder' | 'plumber' | 'driver',
  roles: string[]
): string {
  if (!Array.isArray(roles) || roles.length === 0) {
    if (roleKey === 'electrical') return 'Lead Electrical Specialist';
    if (roleKey === 'control') return 'Control Systems Engineer';
    if (roleKey === 'welder') return 'Certified Pipe Welder';
    if (roleKey === 'plumber') return 'Commercial Plumber';
    if (roleKey === 'driver') return 'Logistics Driver';
    return roleKey;
  }

  if (roleKey === 'electrical') {
    return roles.find((r) => typeof r === 'string' && /electr/i.test(r)) || 'Lead Electrical Specialist';
  }
  if (roleKey === 'control') {
    return roles.find((r) => typeof r === 'string' && /control/i.test(r)) || 'Control Systems Engineer';
  }
  if (roleKey === 'welder') {
    return roles.find((r) => typeof r === 'string' && /weld/i.test(r)) || 'Certified Pipe Welder';
  }
  if (roleKey === 'plumber') {
    return roles.find((r) => typeof r === 'string' && /plumb/i.test(r)) || 'Commercial Plumber';
  }
  if (roleKey === 'driver') {
    return roles.find((r) => typeof r === 'string' && /driver|logistics/i.test(r)) || 'Logistics Driver';
  }
  return roleKey;
}

export function getRoleLabelFromSettings(
  roleKey: 'electrical' | 'control' | 'welder' | 'plumber' | 'driver',
  source?: any
): string {
  if (source && typeof source === 'object' && !Array.isArray(source)) {
    const categoryLabels = source.dropdownCategoryLabels;
    if (categoryLabels) {
      if (roleKey === 'electrical') {
        if (categoryLabels.card_title_electrical) return categoryLabels.card_title_electrical;
        if (categoryLabels.electricalEngineers) return categoryLabels.electricalEngineers;
        if (categoryLabels.electrical) return categoryLabels.electrical;
      }
      if (roleKey === 'control') {
        if (categoryLabels.card_title_control) return categoryLabels.card_title_control;
        if (categoryLabels.controlEngineers) return categoryLabels.controlEngineers;
        if (categoryLabels.control) return categoryLabels.control;
      }
      if (roleKey === 'welder') {
        if (categoryLabels.card_title_welder) return categoryLabels.card_title_welder;
        if (categoryLabels.welders) return categoryLabels.welders;
        if (categoryLabels.welder) return categoryLabels.welder;
      }
      if (roleKey === 'plumber') {
        if (categoryLabels.card_title_plumber) return categoryLabels.card_title_plumber;
        if (categoryLabels.plumbers) return categoryLabels.plumbers;
        if (categoryLabels.plumber) return categoryLabels.plumber;
      }
      if (roleKey === 'driver') {
        if (categoryLabels.card_title_driver) return categoryLabels.card_title_driver;
        if (categoryLabels.drivers) return categoryLabels.drivers;
        if (categoryLabels.driver) return categoryLabels.driver;
      }
    }
    const rolesList = Array.isArray(source.dropdownConfig?.roles) ? source.dropdownConfig.roles : [];
    return findRoleLabel(roleKey, rolesList);
  }

  const rolesList = Array.isArray(source) ? source : [];
  return findRoleLabel(roleKey, rolesList);
}
