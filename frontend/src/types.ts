// The shapes of the SiiPet websocket results and the parts of `hass` the card uses.

export type VisitType = "pee" | "poop" | "lingering" | "unknown";

export interface Cat {
  device_id: string;
  name: string;
  avatar: string | null;
}

export interface CatsResult {
  cats: Cat[];
  unknown: { device_id: string; waiting: number };
  today: string;
  available: boolean;
  updated_at: string;
}

export interface VisitCat {
  device_id: string | null;
  name: string;
}

export interface Visit {
  event_id: string;
  start: string;
  duration: number;
  type: VisitType;
  cats: VisitCat[];
  camera: string | null;
  note: string;
  abnormal: boolean;
  abnormal_reasons: string[];
  has_video: boolean;
  has_stool_image: boolean;
  cover: string | null;
  stool: string | null;
}

export interface DaySummary {
  visits: number;
  pee: number;
  poop: number;
  abnormal: number;
}

export interface DayResult {
  summary: DaySummary;
  visits: Visit[];
}

export interface QueueResult {
  visits: Visit[];
}

export interface CalendarDayInfo {
  visits: number;
  abnormal: number;
  marked: boolean;
}

export interface CalendarResult {
  days: Record<string, CalendarDayInfo>;
  first: string;
  last: string;
}

export interface HassEntity {
  entity_id: string;
  state: string;
  last_changed: string;
}

export interface HassEntityRegistryEntry {
  entity_id: string;
  platform: string;
  device_id?: string;
}

export interface HassConnection {
  addEventListener(event: "ready" | "disconnected", listener: () => void): void;
  removeEventListener(event: "ready" | "disconnected", listener: () => void): void;
}

export interface HomeAssistant {
  states: Record<string, HassEntity>;
  entities: Record<string, HassEntityRegistryEntry>;
  user?: { is_admin: boolean };
  connection: HassConnection;
  callWS<T>(message: Record<string, unknown>): Promise<T>;
  callService(
    domain: string,
    service: string,
    data?: Record<string, unknown>,
    target?: Record<string, unknown>,
    notifyOnError?: boolean,
  ): Promise<unknown>;
}

export interface CardConfig {
  type: string;
  cat?: string;
}
