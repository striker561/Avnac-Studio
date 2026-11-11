import { Photos, Search, Download } from '../../wailsjs/go/avnacserver/UnsplashService'
import {
  normalizeImageCredit,
  unsplashReferralLink,
  type SaraswatiImageCredit,
} from './saraswati'

export { unsplashReferralLink }

/** Max width or height when placing a photo on the canvas (keeps inserts view-sized). */
export const UNSPLASH_PLACE_MAX_EDGE_PX = 800

export function scaleUnsplashToPlaceBox(
  width: number,
  height: number,
  maxEdge = UNSPLASH_PLACE_MAX_EDGE_PX,
) {
  const s = Math.min(1, maxEdge / Math.max(width, height))
  return {
    width: Math.round(width * s),
    height: Math.round(height * s),
  }
}

export type UnsplashPhoto = {
  id: string
  width: number
  height: number
  description: string | null
  alt_description: string | null
  urls: {
    small: string
    regular: string
    full: string
  }
  links: {
    download_location: string
    html: string
  }
  user: {
    name: string
    links: { html: string }
  }
}

export async function fetchUnsplashPopular(
  page: number,
  perPage = 20,
): Promise<{ photos: UnsplashPhoto[]; hasMore: boolean; error?: string }> {
  try {
    const result = await Photos(page, perPage)
    return { photos: result.photos as UnsplashPhoto[], hasMore: result.hasMore }
  } catch (err) {
    return { photos: [], hasMore: false, error: String(err) }
  }
}

export async function fetchUnsplashSearch(
  query: string,
  page: number,
  perPage = 20,
): Promise<{ photos: UnsplashPhoto[]; hasMore: boolean; error?: string }> {
  const q = query.trim()
  if (!q) return { photos: [], hasMore: false }
  try {
    const result = await Search(q, page, perPage)
    return { photos: result.photos as UnsplashPhoto[], hasMore: result.hasMore }
  } catch (err) {
    return { photos: [], hasMore: false, error: String(err) }
  }
}

export async function trackUnsplashDownload(downloadLocation: string): Promise<void> {
  await Download(downloadLocation)
}

/**
 * Builds the attribution record for a photo the user is about to place.
 *
 * Unsplash requires the photographer and Unsplash to be credited wherever a
 * photo is used, so the credit is stored on the image node (and shown in the
 * editor) instead of vanishing with the search results. Both links carry the
 * utm parameters their guidelines require.
 */
export function unsplashCreditForPhoto(photo: UnsplashPhoto): SaraswatiImageCredit | null {
  const photographer = photo.user?.name?.trim() ?? ''
  if (!photographer) return null
  return normalizeImageCredit({
    source: 'unsplash',
    photoId: photo.id,
    photographer,
    photographerUrl: unsplashReferralLink(photo.user.links.html),
    photoUrl: unsplashReferralLink(photo.links.html),
    text: `Photo by ${photographer} on Unsplash`,
  })
}
