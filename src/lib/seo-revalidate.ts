import { revalidatePath, revalidateTag } from "next/cache";
import { SEO_CARDS_TAG, SEO_COLLECTIONS_TAG } from "@/lib/queries/seo";

/** Invalidate public catalog SEO (sitemap, Merchant feed, cached slugs). */
export function revalidatePublicCatalogSeo() {
  revalidateTag(SEO_CARDS_TAG);
  revalidateTag(SEO_COLLECTIONS_TAG);
  revalidatePath("/sitemap.xml");
  revalidatePath("/product-feed.xml");
}
