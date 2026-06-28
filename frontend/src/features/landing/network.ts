// ──────────────────────────────────────────────────────────────────────────
// Mock network data for the hero globe.
// Edit freely: add people, move pins (lat/lng), or wire up new connections.
// ──────────────────────────────────────────────────────────────────────────

export type Person = {
  id: string;
  name: string;
  role?: string;
  /** avatar image url — optional; falls back to initials */
  avatar?: string;
  lat: number;
  lng: number;
};

/** A connection is just a pair of person ids. Direction doesn't matter. */
export type Connection = { from: string; to: string };

export const people: Person[] = [
  { id: "maya", name: "Maya Okonkwo", role: "Founder", lat: 37.77, lng: -122.42 },
  { id: "theo", name: "Theo Lindqvist", role: "Photographer", lat: 40.71, lng: -74.01 },
  { id: "noor", name: "Noor Haddad", role: "Writer", lat: 51.51, lng: -0.13 },
  { id: "aiko", name: "Aiko Tanaka", role: "Designer", lat: 35.68, lng: 139.69 },
  { id: "diego", name: "Diego Salvati", role: "Musician", lat: -23.55, lng: -46.63 },
  { id: "amara", name: "Amara Wanjiru", role: "Teacher", lat: -1.29, lng: 36.82 },
  { id: "lukas", name: "Lukas Brandt", role: "Engineer", lat: 52.52, lng: 13.4 },
  { id: "priya", name: "Priya Nair", role: "Filmmaker", lat: 19.08, lng: 72.88 },
  { id: "sofia", name: "Sofia Marchetti", role: "Chef", lat: 43.65, lng: -79.38 },
  { id: "jin", name: "Jin Park", role: "Researcher", lat: 37.57, lng: 126.98 },
  { id: "mia", name: "Mia Calder", role: "Architect", lat: -33.87, lng: 151.21 },
  { id: "thandi", name: "Thandi Mokoena", role: "Botanist", lat: -33.92, lng: 18.42 },
];

export const connections: Connection[] = [
  { from: "maya", to: "theo" },
  { from: "maya", to: "aiko" },
  { from: "maya", to: "jin" },
  { from: "theo", to: "noor" },
  { from: "theo", to: "sofia" },
  { from: "noor", to: "lukas" },
  { from: "noor", to: "amara" },
  { from: "aiko", to: "jin" },
  { from: "aiko", to: "mia" },
  { from: "diego", to: "amara" },
  { from: "diego", to: "priya" },
  { from: "lukas", to: "priya" },
  { from: "priya", to: "mia" },
  { from: "sofia", to: "jin" },
  { from: "thandi", to: "amara" },
  { from: "thandi", to: "diego" },
  { from: "mia", to: "thandi" },
  { from: "lukas", to: "jin" },
];

// ── Derived helpers ────────────────────────────────────────────────────────

const byId = (id: string): Person => {
  const p = people.find((person) => person.id === id);
  if (!p) throw new Error(`Unknown person id: ${id}`);
  return p;
};

export type Arc = {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  from: string;
  to: string;
};

/** Build flight-tracker style arcs from the connection pairs. */
export function arcsFromConnections(): Arc[] {
  return connections.map(({ from, to }) => {
    const a = byId(from);
    const b = byId(to);
    return {
      startLat: a.lat,
      startLng: a.lng,
      endLat: b.lat,
      endLng: b.lng,
      from: a.name,
      to: b.name,
    };
  });
}

/** Names of everyone a given person is connected to (both directions). */
export function connectionNames(id: string): string[] {
  const ids = new Set<string>();
  for (const c of connections) {
    if (c.from === id) ids.add(c.to);
    if (c.to === id) ids.add(c.from);
  }
  return [...ids].map((pid) => byId(pid).name);
}
