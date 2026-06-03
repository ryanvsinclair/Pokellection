import type { Enums, Tables } from "@/types/supabase";

export type { Database } from "@/types/supabase";

export type UserRole = Enums<"user_role">;
export type CardCondition = Enums<"card_condition">;
export type CardStatus = Enums<"card_status">;
export type CollectionStatus = Enums<"collection_status">;
export type ReservationStatus = Enums<"reservation_status">;
export type FulfillmentType = Enums<"fulfillment_type">;
export type ShippingMethod = Enums<"shipping_method">;

/** Stored on orders.fulfillment_option (see src/lib/checkout-options.ts). */
export type FulfillmentOption =
  | "canada_ship"
  | "next_day_pickup"
  | "same_day_pickup"
  | "next_day_delivery";
export type PaymentMethod = Enums<"payment_method">;
export type PaymentStatus = Enums<"payment_status">;
export type FulfillmentStatus = Enums<"fulfillment_status">;

export type Profile = Tables<"profiles">;
export type Card = Tables<"cards">;
export type Collection = Tables<"collections">;
export type CollectionCard = Tables<"collection_cards">;
export type SiteSettings = Tables<"site_settings">;
export type Reservation = Tables<"reservations">;
export type CartItem = Tables<"cart_items">;
export type Order = Tables<"orders">;
export type OrderItem = Tables<"order_items">;
export type PrivateSale = Tables<"private_sales">;
export type InventoryAcquisition = Tables<"inventory_acquisitions">;
export type AcquisitionCard = Tables<"acquisition_cards">;
