import { inspectionStatus } from './status';
import type { Alert, Dataset, Escalation, MaintenanceRecord, SavedPlan, SopRecord } from './types';

/** Rules for the alert workspace. Display only: none of this touches retrieval. */

export type WorkspaceTab = 'investigate' | 'plan' | 'finding';
export type PillState = 'done' | 'current' | 'future';

export interface Pill {
  label: string;
  state: PillState;
}

export function statusPills(hasSop: boolean, findingSaved: boolean, escalated: boolean): Pill[] {
  const moved = hasSop ? findingSaved : escalated;
  const stages = hasSop
    ? ['Alert raised', 'Investigating', 'Inspected', 'Repair', 'Closed']
    : ['Alert raised', 'Investigating', 'Escalated', 'Site review', 'Closed'];
  const current = moved ? 2 : 1;
  return stages.map((label, index) => ({
    label,
    state: index < current ? 'done' : index === current ? 'current' : 'future',
  }));
}

export interface TabAvailability {
  investigate: boolean;
  plan: boolean;
  finding: boolean;
}

export function tabAvailability(hasSop: boolean, planSaved: boolean): TabAvailability {
  return { investigate: true, plan: hasSop, finding: hasSop && planSaved };
}

/** A blocked tab can never be reached, even from a direct link. */
export function resolveTab(requested: WorkspaceTab, available: TabAvailability): WorkspaceTab {
  if (available[requested]) return requested;
  if (requested === 'finding' && available.plan) return 'plan';
  return 'investigate';
}

export type PrimaryKind = 'start-plan' | 'save-plan' | 'save-finding' | 'escalate' | 'back';

export function primaryActionKind(state: {
  hasAlert: boolean;
  hasSop: boolean;
  planSaved: boolean;
  findingSaved: boolean;
  escalated: boolean;
  tab: WorkspaceTab;
}): PrimaryKind {
  if (!state.hasAlert) return 'back';
  if (!state.hasSop) return state.escalated ? 'back' : 'escalate';
  if (state.findingSaved) return 'back';
  if (state.planSaved) return 'save-finding';
  return state.tab === 'plan' ? 'save-plan' : 'start-plan';
}

/** Every record retrieval looked at for this machine. */
export function recordsChecked(data: Dataset): number {
  return data.records.length;
}

const NUMBER_WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];

export function causeHeading(count: number): string {
  return `${NUMBER_WORDS[count] ?? count} possible cause${count === 1 ? '' : 's'}`;
}

/** Shown only when the procedure's own first step is lockout. */
export function safetyMessage(sop: SopRecord | null, language: 'en' | 'de' = 'en'): string | null {
  const first = sop?.steps[0];
  if (!first?.title || !/^lock out/i.test(first.title)) return null;
  if (language === 'de' && first.titleGerman) return `${first.titleGerman}, bevor Sie ihn prüfen.`;
  return `${first.title} before you inspect it.`;
}

export interface ActivityEvent {
  at: string;
  text: string;
}

/** Only real events: synthetic alert times, and saved timestamps for everything else. */
export function activityEvents(
  alerts: Alert[],
  plans: Record<string, SavedPlan>,
  escalations: Record<string, Escalation>,
  records: MaintenanceRecord[],
): ActivityEvent[] {
  const events: ActivityEvent[] = alerts.map((alert) => ({
    at: alert.raisedAt,
    text: `${alert.assetId} ${alert.title.toLowerCase()}`,
  }));
  for (const plan of Object.values(plans)) {
    events.push({ at: plan.savedAt, text: `${plan.assetId} plan saved` });
    if (plan.finding) {
      events.push({
        at: plan.finding.savedAt,
        text: `${plan.assetId} inspected: ${inspectionStatus(plan.finding.outcome, records).short}`,
      });
    }
  }
  for (const escalation of Object.values(escalations)) {
    events.push({ at: escalation.escalatedAt, text: `${escalation.assetId} escalated` });
  }
  return events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}
