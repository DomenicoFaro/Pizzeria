export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  position: number;
  is_active: boolean;
  counts_for_capacity: boolean;
};

export type Product = {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  allergens: string[];
  tags: string[];
  is_available: boolean;
  is_featured: boolean;
  position: number;
};

export type ModifierGroup = {
  id: string;
  name: string;
  type: "single" | "multiple";
  required: boolean;
  min: number;
  max: number | null;
  position: number;
};

export type Modifier = {
  id: string;
  group_id: string;
  name: string;
  price_delta: number;
  is_default: boolean;
  is_available: boolean;
  position: number;
};

export type ModifierGroupWithOptions = ModifierGroup & { modifiers: Modifier[] };

export type MenuProduct = Product & { modifier_groups: ModifierGroupWithOptions[] };
export type MenuCategory = Category & { products: MenuProduct[] };

export type DeliveryZone = {
  id: string;
  name: string;
  description: string | null;
  radius_km: number | null;
  polygon: [number, number][] | null; // [lng, lat]
  fee: number;
  min_order: number;
  free_over: number | null;
  is_active: boolean;
  position: number;
};

export type OpeningHour = {
  id?: string;
  weekday: number; // 0 = domenica
  open_time: string; // "HH:MM" o "HH:MM:SS"
  close_time: string;
};

export type Closure = {
  id?: string;
  date_from: string; // YYYY-MM-DD
  date_to: string;
  reason: string | null;
};

export type Settings = {
  prep_time_pickup: number;
  prep_time_delivery: number;
  slot_minutes: number;
  slot_capacity: number;
  days_ahead: number;
  orders_paused: boolean;
  pause_message: string | null;
  pay_online: boolean;
  pay_cash: boolean;
  pay_pos: boolean;
  pickup_enabled: boolean;
  delivery_enabled: boolean;
  phone: string | null;
  phone_landline: string | null;
  whatsapp: string | null;
  email: string | null;
  company_name: string | null;
  vat_number: string | null;
  announcement: string | null;
};

export type OrderType = "pickup" | "delivery";

export type OrderStatus =
  | "in_attesa_pagamento"
  | "nuovo"
  | "accettato"
  | "in_preparazione"
  | "pronto"
  | "in_consegna"
  | "completato"
  | "rifiutato"
  | "annullato";

export type PaymentMethod = "cash" | "pos";

export type OrderAddress = {
  street: string;
  number: string;
  city: string;
  cap: string;
  intercom?: string;
  floor?: string;
  notes?: string;
  lat?: number;
  lng?: number;
};

export type OrderItemModifier = { id?: string; group: string; name: string; price_delta: number };

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string | null;
  name: string;
  unit_price: number;
  quantity: number;
  modifiers: OrderItemModifier[];
  notes: string | null;
};

export type Order = {
  id: string;
  number: number;
  customer_id: string | null;
  type: OrderType;
  status: OrderStatus;
  asap: boolean;
  scheduled_for: string;
  estimated_ready_at: string | null;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  address: OrderAddress | null;
  zone_name: string | null;
  pizza_count: number;
  subtotal: number;
  delivery_fee: number;
  discount: number;
  discount_code: string | null;
  total: number;
  payment_method: PaymentMethod;
  payment_status: "pending" | "paid" | "refunded" | "failed" | "unpaid";
  change_for: number | null;
  stripe_payment_id: string | null;
  notes: string | null;
  status_reason: string | null;
  created_at: string;
  updated_at: string;
};

export type OrderWithItems = Order & { order_items: OrderItem[] };

export type OrderTracking = {
  order_id: string;
  number: number;
  type: OrderType;
  status: OrderStatus;
  status_reason: string | null;
  scheduled_for: string | null;
  estimated_ready_at: string | null;
  updated_at: string;
};

export type Reservation = {
  id: string;
  date: string;
  time: string;
  people: number;
  name: string;
  phone: string;
  email: string | null;
  notes: string | null;
  status: "in_attesa" | "confermata" | "rifiutata";
  created_at: string;
};

export type EventRequest = {
  id: string;
  event_type: string;
  date: string | null;
  guests: number | null;
  name: string;
  phone: string;
  email: string | null;
  message: string | null;
  status: "in_attesa" | "confermata" | "rifiutata";
  created_at: string;
};

export type DiscountCode = {
  code: string;
  type: "percent" | "fixed";
  value: number;
  min_order: number;
  expires_at: string | null;
  max_uses: number | null;
  used: number;
  is_active: boolean;
  created_at: string;
};

/** Riga carrello lato client (solo riferimenti: i prezzi vengono ricalcolati dal server) */
export type CartLine = {
  key: string;
  productId: string;
  name: string;
  quantity: number;
  modifierIds: string[];
  removed: string[];
  notes: string;
  /** prezzo unitario mostrato al cliente (indicativo) */
  unitPrice: number;
  modifierLabels: string[];
};
