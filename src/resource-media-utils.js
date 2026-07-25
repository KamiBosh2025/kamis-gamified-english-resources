export const cleanText = (value) => String(value ?? '').trim()
export const cleanKey = (value) => cleanText(value).toLowerCase()

const AUDIO_EXTENSIONS = new Set(['mp3', 'wav', 'm4a', 'aac', 'ogg', 'flac', 'opus'])
const VIDEO_EXTENSIONS = new Set(['mp4', 'webm', 'mov', 'avi', 'mkv'])
const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'])
const PRESENTATION_EXTENSIONS = new Set(['ppt', 'pptx', 'pps', 'ppsx', 'odp', 'key'])
const DOCUMENT_EXTENSIONS = new Set(['pdf', 'doc', 'docx', 'odt', 'rtf', 'txt'])
const DIRECT_FILE_EXTENSIONS = new Set([
  ...AUDIO_EXTENSIONS,
  ...VIDEO_EXTENSIONS,
  ...IMAGE_EXTENSIONS,
  ...PRESENTATION_EXTENSIONS,
  ...DOCUMENT_EXTENSIONS,
  'zip',
])

export function getMediaUrl(media) {
  return cleanText(
    media?.media_url ||
      media?.external_url ||
      media?.source_url ||
      media?.file_url ||
      media?.public_url ||
      media?.url
  )
}

export function getFileName(media, url = getMediaUrl(media)) {
  const savedName = cleanText(media?.file_name)
  if (savedName) {
    const parts = savedName.split(/[\\/]/).filter(Boolean)
    return parts.at(-1) || 'file'
  }

  try {
    const parsedUrl = new URL(url, window.location.origin)
    const name = decodeURIComponent(parsedUrl.pathname.split('/').filter(Boolean).at(-1) || '')
    return name || 'file'
  } catch {
    return 'file'
  }
}

export function getExtensionFromName(fileName) {
  const match = cleanText(fileName).toLowerCase().match(/\.([a-z0-9]+)$/)
  return match?.[1] || ''
}

export function getUrlExtension(url) {
  try {
    const parsedUrl = new URL(url, window.location.origin)
    return getExtensionFromName(decodeURIComponent(parsedUrl.pathname))
  } catch {
    return ''
  }
}

export function getMediaExtension(media) {
  return getExtensionFromName(getFileName(media)) || getUrlExtension(getMediaUrl(media))
}

export function getDisplayName(media) {
  return getFileName(media)
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .trim() || 'Audio file'
}

export function isAudioMedia(media) {
  return cleanKey(media?.media_type) === 'audio' || AUDIO_EXTENSIONS.has(getMediaExtension(media))
}

export function isVideoMedia(media) {
  return cleanKey(media?.media_type) === 'video' || VIDEO_EXTENSIONS.has(getMediaExtension(media))
}

export function isImageMedia(media) {
  return cleanKey(media?.media_type) === 'image' || IMAGE_EXTENSIONS.has(getMediaExtension(media))
}

export function isPresentationMedia(media) {
  return cleanKey(media?.media_type) === 'presentation' || PRESENTATION_EXTENSIONS.has(getMediaExtension(media))
}

export function isPdfMedia(media) {
  return getMediaExtension(media) === 'pdf'
}

export function isExternalAppUrl(url) {
  try {
    const host = new URL(url, window.location.origin).hostname.toLowerCase()
    return [
      'gamma.app',
      'youtube.com',
      'youtu.be',
      'kahoot.it',
      'create.kahoot.it',
      'wordwall.net',
      'docs.google.com',
      'drive.google.com',
      'view.officeapps.live.com',
      'office.com',
      'onedrive.live.com',
    ].some((domain) => host === domain || host.endsWith(`.${domain}`))
  } catch {
    return false
  }
}

export function isDirectFileMedia(media) {
  const url = getMediaUrl(media)
  if (!url || isExternalAppUrl(url)) return false

  const urlExtension = getUrlExtension(url)
  if (DIRECT_FILE_EXTENSIONS.has(urlExtension)) return true

  try {
    const parsedUrl = new URL(url, window.location.origin)
    const isSupabaseStorage = parsedUrl.pathname.includes('/storage/v1/object/')
    return isSupabaseStorage && DIRECT_FILE_EXTENSIONS.has(getMediaExtension(media))
  } catch {
    return false
  }
}

export function getOfficeViewerUrl(fileUrl) {
  return `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(fileUrl)}`
}

export function getOpenUrl(media) {
  const mediaUrl = getMediaUrl(media)
  if (!mediaUrl) return ''

  if (isPresentationMedia(media) && isDirectFileMedia(media)) {
    return getOfficeViewerUrl(mediaUrl)
  }

  return mediaUrl
}

export function getOpenLabel(media, role = 'main') {
  const prefix = role === 'additional' ? 'Additional ' : ''

  if (isAudioMedia(media)) return role === 'additional' ? 'Play Additional Audio' : 'Play Audio'
  if (isVideoMedia(media)) return role === 'additional' ? 'Watch Additional Video' : 'Watch Video'
  if (isImageMedia(media)) return role === 'additional' ? 'Open Additional Image' : 'Open Image'
  if (isPresentationMedia(media)) {
    return role === 'additional' ? 'View Additional Presentation' : 'View Main Presentation'
  }
  if (isPdfMedia(media) || cleanKey(media?.media_type) === 'document') {
    return role === 'additional' ? 'Open Additional Material' : 'Open Main File'
  }

  return role === 'additional' ? `Open ${prefix}Material` : 'Open Main File'
}

export function getMediaRole(media, resource) {
  const savedRole = cleanKey(media?.media_role)
  if (savedRole === 'main' || savedRole === 'additional') return savedRole
  return cleanText(resource?.resource_url) ? 'additional' : 'main'
}

function tidyGradeAndLevel(text) {
  let value = cleanText(text)
    .replace(/\s+[ВB](?=\s*(?:·|$))/g, '')
    .replace(/\s*[-–]\s*/g, '–')
    .replace(/\s+/g, ' ')

  const match = value.match(/^(Grades?\s+\d+(?:–\d+)?)(?:\s+([A-C][12](?:–[A-C][12])?))$/i)
  if (match) value = `${match[1]} (${match[2]})`

  return value
}

export function formatResourceMeta(resource) {
  const savedMeta = cleanText(resource?.meta_text)
  if (savedMeta) {
    return savedMeta
      .split('·')
      .map((part) => tidyGradeAndLevel(part))
      .filter(Boolean)
      .join(' · ')
  }

  return [resource?.grade_level, resource?.category]
    .map((part) => tidyGradeAndLevel(part))
    .filter(Boolean)
    .join(' · ')
}

export function safeAnchor(value) {
  return cleanKey(value)
    .normalize('NFKD')
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
