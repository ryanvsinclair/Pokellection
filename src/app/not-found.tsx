import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Not Found",
};

export default function NotFound() {
  return (
    <div className="py-16 text-center">
      <h1 className="text-2xl font-bold">Page not found</h1>
      <p className="mt-2 text-sm text-muted">That card or page doesn&apos;t exist.</p>
    </div>
  );
}
