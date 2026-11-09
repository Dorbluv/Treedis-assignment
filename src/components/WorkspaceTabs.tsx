import { useRef, type KeyboardEvent } from 'react';
import type { WorkspaceTab } from '../domain/workspace';
import { NoEntryMark } from './Icons';

export interface TabDefinition {
  key: WorkspaceTab;
  label: string;
  enabled: boolean;
  blocked?: boolean;
}

export const tabId = (key: WorkspaceTab) => `tab-${key}`;
export const tabPanelId = (key: WorkspaceTab) => `tabpanel-${key}`;

export function WorkspaceTabs({
  tabs,
  current,
  onSelect,
}: {
  tabs: TabDefinition[];
  current: WorkspaceTab;
  onSelect: (key: WorkspaceTab) => void;
}) {
  const refs = useRef<Partial<Record<WorkspaceTab, HTMLButtonElement | null>>>({});
  const enabled = tabs.filter((tab) => tab.enabled);

  function move(event: KeyboardEvent, key: WorkspaceTab) {
    const index = enabled.findIndex((tab) => tab.key === key);
    let next = -1;
    if (event.key === 'ArrowRight') next = (index + 1) % enabled.length;
    else if (event.key === 'ArrowLeft') next = (index - 1 + enabled.length) % enabled.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = enabled.length - 1;
    if (next < 0) return;
    event.preventDefault();
    const target = enabled[next].key;
    onSelect(target);
    refs.current[target]?.focus();
  }

  return (
    <div className="tabs" role="tablist" aria-label="Work on this alert">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          ref={(element) => {
            refs.current[tab.key] = element;
          }}
          type="button"
          role="tab"
          id={tabId(tab.key)}
          className={`tab${tab.blocked ? ' is-blocked' : ''}`}
          aria-selected={current === tab.key}
          aria-controls={current === tab.key ? tabPanelId(tab.key) : undefined}
          aria-disabled={!tab.enabled || undefined}
          tabIndex={current === tab.key ? 0 : -1}
          onClick={tab.enabled ? () => onSelect(tab.key) : undefined}
          onKeyDown={(event) => move(event, tab.key)}
        >
          {tab.blocked && <NoEntryMark />}
          {tab.label}
        </button>
      ))}
    </div>
  );
}
