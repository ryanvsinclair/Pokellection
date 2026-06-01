import type { Enums, Tables } from "@/types/supabase";

export type { Database } from "@/types/supabase";

export type UserRole = Enums<"user_role">;
export type CardCondition = Enums<"card_condition">;
export type CardStatus = Enums<"card_status">;
export type ReservationStatus = Enums<"reservation_status">;
export type FulfillmentType = Enums<"fulfillment_type">;
export type ShippingMethod = Enums<"shipping_method">;
export type PaymentMethod = Enums<"payment_method">;
export type PaymentStatus = Enums<"payment_status">;
export type FulfillmentStatus = Enums<"fulfillment_status">;

export type Profile = Tables<"profiles">;
export type Card = Tables<"cards">;
export type SiteSettings = Tables<"site_settings">;
export type Reservation = Tables<"reservations">;
export type CartItem = Tables<"cart_items">;
export type Order = Tables<"orders">;
export type OrderItem = Tables<"order_items">;
