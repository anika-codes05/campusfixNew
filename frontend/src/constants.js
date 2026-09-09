export const CATEGORIES = [
  { value: 'electrical', label: 'Electrical', emoji: '⚡' },
  { value: 'plumbing', label: 'Plumbing', emoji: '🚰' },
  { value: 'mess', label: 'Mess / Food', emoji: '🍽️' },
  { value: 'infrastructure', label: 'Infrastructure', emoji: '🏗️' },
  { value: 'other', label: 'Other', emoji: '📌' },
];

export const STATUSES = [
  { value: 'reported', label: 'Reported' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
];

export const PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

export const TEAMS = [
  { value: 'general', label: 'General' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'mess', label: 'Mess' },
  { value: 'infrastructure', label: 'Infrastructure' },
  { value: 'other', label: 'Other' },
];

export const AFFECTED_PRESETS = [
  { value: 1, label: 'Just me' },
  { value: 3, label: 'A few (2-5)' },
  { value: 12, label: 'Many (6-20)' },
  { value: 25, label: 'Whole block/floor (20+)' },
];

export function affectedLabel(n) {
  if (Number(n) <= 1) return 'Just me';
  return `~${n} affected`;
}

// KIET Group of Institutions, Ghaziabad campus center
export const DEFAULT_CENTER = [28.7528, 77.499];

export const KIET_BLOCKS = [
  { name: 'Main Building', lat: 28.7523, lng: 77.4991 },
  { name: 'Block A', lat: 28.7531, lng: 77.4984 },
  { name: 'Library (KRC)', lat: 28.7528, lng: 77.4996 },
  { name: 'Auditorium', lat: 28.7533, lng: 77.4993 },
];

export const STATUS_COLORS = {
  reported: { fg: '#E8734A', bg: '#FDEDE4' },
  in_progress: { fg: '#E8AC3C', bg: '#FCF2DA' },
  resolved: { fg: '#02C39A', bg: '#E1F7EF' },
};

export const PRIORITY_COLORS = {
  low: { fg: '#5C6B6E', bg: '#EFF3F2' },
  medium: { fg: '#028090', bg: '#E4F2F2' },
  high: { fg: '#E8AC3C', bg: '#FCF2DA' },
  urgent: { fg: '#E8734A', bg: '#FDEDE4' },
};

export function timeAgo(dateStr) {
  const ts = dateStr ? new Date(dateStr).getTime() : NaN;
  if (!Number.isFinite(ts)) return '—';
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export function categoryLabel(value) {
  return CATEGORIES.find((c) => c.value === value)?.label || value;
}

export function categoryEmoji(value) {
  return CATEGORIES.find((c) => c.value === value)?.emoji || '📌';
}

export function statusLabel(value) {
  return STATUSES.find((s) => s.value === value)?.label || value;
}

export function priorityLabel(value) {
  return PRIORITIES.find((p) => p.value === value)?.label || value;
}
