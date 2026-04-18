import type {
  Broadcast,
  BroadcastType,
  TargetAudience,
} from "@prisma/client";

export type BroadcastBehavior =
  | "FEED"
  | "HIGHLIGHTED_FEED"
  | "BANNER"
  | "WARNING_BANNER"
  | "POPUP";

export type BroadcastUiMeta = {
  icon: string;
  color: string;
  priority: number;
  behavior: BroadcastBehavior;
};

export type CreateBroadcastInput = {
  title: string;
  message: string;
  type: BroadcastType;
  targetAudience: TargetAudience;
  publishAt?: string | Date;
  expiresAt?: string | Date | null;
  isActive?: boolean;
  imageUrl?: string | null;
  ctaLabel?: string | null;
  ctaLink?: string | null;
};

export type UpdateBroadcastInput = Partial<CreateBroadcastInput>;

export type BroadcastListFilters = {
  type?: BroadcastType;
  targetAudience?: TargetAudience;
  isActive?: boolean;
};

export type BroadcastActor = {
  userId: string;
  companyId?: string;
  role?: string;
  actorType?: "USER" | "COMPANY";
};

export type BroadcastResponse = Broadcast & {
  ui: BroadcastUiMeta;
};

export type BroadcastRecipient = {
  id: string;
  name: string;
  email: string;
  audience: Exclude<TargetAudience, "ALL">;
};
