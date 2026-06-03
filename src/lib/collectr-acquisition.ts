export const ACQUISITION_TAG_PREFIX = "acquisition:";

export function acquisitionTag(acquisitionId: string): string {
  return `${ACQUISITION_TAG_PREFIX}${acquisitionId}`;
}

export function parseAcquisitionIdFromTags(tags: string[] | null): string | null {
  if (!tags) return null;
  const tagged = tags.find((tag) => tag.startsWith(ACQUISITION_TAG_PREFIX));
  return tagged ? tagged.slice(ACQUISITION_TAG_PREFIX.length) : null;
}
