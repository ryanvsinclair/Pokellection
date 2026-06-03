import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ReservePickupForm } from "@/app/reserve/[id]/ReservePickupForm";
import { getUserProfileRole, isBuyer } from "@/lib/auth-roles";
import { buyerSignupPath } from "@/lib/buyer-auth-paths";
import { createClient } from "@/lib/supabase/server";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ReservePage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(buyerSignupPath(`/reserve/${id}`));
  }

  const role = await getUserProfileRole(supabase, user.id);
  if (!isBuyer(role)) {
    redirect("/account");
  }

  const { data: card } = await supabase
    .from("cards")
    .select("id, title, status")
    .eq("id", id)
    .maybeSingle();

  if (!card || card.status !== "available") {
    notFound();
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, phone")
    .eq("id", user.id)
    .single();

  return (
    <div className="mx-auto max-w-md space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Reserve for pickup</h1>
        <p className="mt-1 text-sm text-muted">
          Same-day pickup in Ottawa for <span className="font-medium text-foreground">{card.title}</span>.
          Your card is held until end of day.
        </p>
      </div>

      <ReservePickupForm
        cardId={card.id}
        defaultName={profile?.display_name ?? ""}
        defaultEmail={user.email ?? ""}
        defaultPhone={profile?.phone ?? ""}
      />

      <p className="text-center text-sm text-muted">
        <Link href={`/shop`} className="text-primary hover:underline">
          Back to shop
        </Link>
      </p>
    </div>
  );
}
