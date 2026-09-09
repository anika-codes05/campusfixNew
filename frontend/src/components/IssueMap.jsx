import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import {
  DEFAULT_CENTER,
  KIET_BLOCKS,
  categoryEmoji,
  categoryLabel,
  statusLabel,
} from '../constants';

const statusIconColor = {
  reported: '#E8734A',
  in_progress: '#E8AC3C',
  resolved: '#02C39A',
};

function makeIcon(color) {
  const svg = `<svg width="34" height="44" viewBox="0 0 34 44" xmlns="http://www.w3.org/2000/svg">
    <path d="M17 0C7.6 0 0 7.6 0 17c0 12.75 17 27 17 27s17-14.25 17-27C34 7.6 26.4 0 17 0z" fill="${color}"/>
    <circle cx="17" cy="17" r="7" fill="white"/>
  </svg>`;
  return L.divIcon({
    className: '',
    html: svg,
    iconSize: [34, 44],
    iconAnchor: [17, 42],
    popupAnchor: [0, -40],
  });
}

function makeBlockIcon() {
  const svg = `<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <rect x="1" y="1" width="22" height="22" rx="4" fill="#028090"/>
    <path d="M7 10V18M10 7V18M13 12V18M16 9V18" stroke="#F4FAF9" stroke-width="1.6" stroke-linecap="round"/>
    <rect x="5" y="18.5" width="14" height="2" rx="0.6" fill="#F4FAF9"/>
    <rect x="5" y="3.5" width="14" height="1.6" rx="0.5" fill="#F4FAF9" opacity="0.75"/>
  </svg>`;
  return L.divIcon({
    className: '',
    html: svg,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    tooltipAnchor: [0, -14],
  });
}

const KIET_BOUNDS = L.latLngBounds(KIET_BLOCKS.map((b) => [b.lat, b.lng]));

function PickHandler({ onPick }) {
  useMapEvents({
    click(e) {
      onPick([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}

function StatusPicker({ issue, onChange }) {
  return (
    <div className="mt-2 flex items-center gap-1">
      <span className="text-[11px] text-[#5C6B6E]">Status:</span>
      <select
        value={issue.status}
        onChange={(e) => onChange(issue._id, e.target.value)}
        className="rounded-lg border border-[#E4EEEC] px-1.5 py-0.5 text-xs text-[#1B2A2E]"
      >
        {Object.keys(statusIconColor).map((s) => (
          <option key={s} value={s}>
            {statusLabel(s)}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function IssueMap({ issues, onStatusChange, onPick, height = '100%' }) {
  const markers = Array.isArray(issues) ? issues : [];

  return (
    <MapContainer
      center={DEFAULT_CENTER}
      zoom={17}
      bounds={KIET_BOUNDS}
      boundsOptions={{ padding: [40, 40] }}
      scrollWheelZoom={false}
      style={{ height, width: '100%', minHeight: 320 }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        subdomains={['a', 'b', 'c']}
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {KIET_BLOCKS.map((block) => (
        <Marker key={block.name} position={[block.lat, block.lng]} icon={makeBlockIcon()}>
          <Tooltip direction="top" offset={[0, -10]} opacity={1}>
            {block.name}
          </Tooltip>
        </Marker>
      ))}
      {markers.map((issue) => {
        if (!issue.location) return null;
        const color = statusIconColor[issue.status] || '#028090';
        return (
          <Marker
            key={issue._id}
            position={[issue.location.lat, issue.location.lng]}
            icon={makeIcon(color)}
          >
            <Popup>
              <div className="min-w-44 text-[#1B2A2E]">
                <div className="text-sm font-semibold">{issue.title}</div>
                <div className="mt-0.5 text-xs text-[#5C6B6E]">
                  {categoryEmoji(issue.category)} {categoryLabel(issue.category)} ·{' '}
                  {statusLabel(issue.status)}
                </div>
                <div className="text-xs text-[#5C6B6E]">
                  {issue.location.blockName}
                  {issue.location.floorRoom ? ` · ${issue.location.floorRoom}` : ''}
                </div>
                <div className="mt-0.5 text-xs font-semibold text-[#028090]">
                  ▲ {issue.upvoteCount} upvotes
                </div>
                {onStatusChange && <StatusPicker issue={issue} onChange={onStatusChange} />}
              </div>
            </Popup>
          </Marker>
        );
      })}
      {onPick && <PickHandler onPick={onPick} />}
    </MapContainer>
  );
}