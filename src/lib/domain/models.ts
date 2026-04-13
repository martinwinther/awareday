import { Timestamp } from "firebase/firestore";

export type ActivityAction = "start" | "end";

export type ActivityLabelDocument = {
  userId: string;
  name: string;
  normalizedName: string;
  pinned?: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type ActivityLabel = ActivityLabelDocument & {
  id: string;
};

export type EventLabelDocument = {
  userId: string;
  name: string;
  normalizedName: string;
  pinned?: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type EventLabel = EventLabelDocument & {
  id: string;
};

export type ActivityEntryDocument = {
  userId: string;
  label: string;
  normalizedLabel: string;
  action: ActivityAction;
  timestamp: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type ActivityEntry = ActivityEntryDocument & {
  id: string;
};

export type EventEntryDocument = {
  userId: string;
  label: string;
  normalizedLabel: string;
  timestamp: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type EventEntry = EventEntryDocument & {
  id: string;
};
