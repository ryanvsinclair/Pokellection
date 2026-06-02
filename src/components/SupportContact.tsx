import {
  BUSINESS_EMAIL,
  ORDER_SUPPORT_PHONE_DISPLAY,
  ORDER_SUPPORT_SMS_INSTRUCTIONS,
  orderSupportSmsHref,
} from "@/lib/utils";

interface Props {
  /** Prefill SMS body with order number + space (buyer adds their question). */
  orderNumber?: string;
  className?: string;
}

export function SupportContact({ orderNumber, className = "" }: Props) {
  return (
    <div className={`space-y-1 text-sm text-muted ${className}`}>
      <p>
        Questions?{" "}
        <a
          href={`mailto:${BUSINESS_EMAIL}`}
          className="font-medium text-foreground underline-offset-2 hover:underline"
        >
          {BUSINESS_EMAIL}
        </a>
      </p>
      <p>
        Or text{" "}
        <a
          href={orderSupportSmsHref(orderNumber)}
          className="font-medium text-foreground underline-offset-2 hover:underline"
        >
          {ORDER_SUPPORT_PHONE_DISPLAY}
        </a>
        {orderNumber ? (
          <span className="text-muted"> (order number pre-filled)</span>
        ) : null}
      </p>
      <p className="text-xs">{ORDER_SUPPORT_SMS_INSTRUCTIONS}</p>
    </div>
  );
}
