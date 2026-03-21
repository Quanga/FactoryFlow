/**
 * SA BCEA (Basic Conditions of Employment Act) leave entitlement calculations.
 * Exported as a shared module used by routes and startup recalculation.
 */

export interface BceaEntitlements {
  annualLeave: number;
  sickLeave: number;
  familyResponsibility: number;
  monthsWorked: number;
  notes: {
    annualLeave: string;
    sickLeave: string;
    familyResponsibility: string;
  };
}

/**
 * Calculate SA BCEA leave entitlements for an employee based on their start date.
 *
 * Annual Leave (s20):  21 days per 12-month leave cycle, pro-rated to the
 *                      number of completed months in the current cycle.
 * Sick Leave (s22):    1 day per 26 working days for the first 6 months of
 *                      each 3-year cycle; 30 days thereafter.
 * Family Responsibility (s27): 3 days per cycle, available from month 4.
 */
export function calculateBceaEntitlements(startDate: string): BceaEntitlements {
  const start = new Date(startDate + 'T00:00:00');
  const today = new Date();

  const totalMonths =
    (today.getFullYear() - start.getFullYear()) * 12 +
    (today.getMonth() - start.getMonth()) +
    (today.getDate() >= start.getDate() ? 0 : -1);

  // ANNUAL LEAVE — BCEA Section 20
  const currentCycleMonths = totalMonths % 12;
  const monthsForAnnual = totalMonths > 0 && currentCycleMonths === 0 ? 12 : currentCycleMonths;
  const annualLeave = Math.round((monthsForAnnual / 12) * 21 * 10) / 10;
  const annualNote = `${monthsForAnnual} of 12 months completed in current cycle × 21 days = ${annualLeave} days`;

  // SICK LEAVE — BCEA Section 22
  const monthsInCurrentSickCycle = totalMonths % 36;
  let sickLeave: number;
  let sickNote: string;
  if (monthsInCurrentSickCycle < 6) {
    const workingDaysInSickCycle = Math.floor((monthsInCurrentSickCycle / 12) * 260);
    sickLeave = Math.min(Math.floor(workingDaysInSickCycle / 26), 5);
    sickNote = `First 6 months of sick leave cycle: ${sickLeave} days (1 day per 26 days worked)`;
  } else {
    sickLeave = 30;
    sickNote = `30 days — full allocation for current 3-year sick leave cycle`;
  }

  // FAMILY RESPONSIBILITY — BCEA Section 27
  const familyResponsibility = totalMonths >= 4 ? 3 : 0;
  const familyNote =
    totalMonths >= 4
      ? `3 days per leave cycle (available from month 4)`
      : `Not yet available — requires 4+ months employment (${totalMonths} months so far)`;

  return {
    annualLeave,
    sickLeave,
    familyResponsibility,
    monthsWorked: totalMonths,
    notes: { annualLeave: annualNote, sickLeave: sickNote, familyResponsibility: familyNote },
  };
}
