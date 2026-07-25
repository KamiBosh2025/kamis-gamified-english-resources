import { supabase } from './supabase.js'
import {
  cleanText,
  cleanKey,
  formatResourceMeta,
  getDisplayName,
  getFileName,
  getMediaRole,
  getMediaUrl,
  getOpenLabel,
  getOpenUrl,
  isAudioMedia,
  isDirectFileMedia,
  isPresentationMedia,
} from './resource-media-utils.js'

const detailsContainer = document.querySelector('#resource-details')

function createLink(text, url, { secondary = false, external = true } = {}) {
  const link = document.createElement('a')
  link.href = url
  link.textContent = text
  link.className = secondary
    ? 'resource-button resource-button-secondary'
    : 'resource-button'

  if (external) {
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
  }

  return link
}

function showMessage(message) {
  detailsContainer.replaceChildren()
  const paragraph = document.createElement('p')
  paragraph.textContent = message
  detailsContainer.appendChild(paragraph)
}

async function fetchFile(url) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Download failed: ${response.status}`)
  return response.blob()
}

function triggerBlobDownload(blob, fileName) {
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
}

function createDownloadButton(text, media) {
  const url = getMediaUrl(media)
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'resource-button resource-button-secondary'
  button.textContent = text

  button.addEventListener('click', async () => {
    const originalText = button.textContent
    button.disabled = true
    button.textContent = 'Downloading...'

    try {
      const blob = await fetchFile(url)
      triggerBlobDownload(blob, getFileName(media, url))
    } catch (error) {
      console.error('File download failed:', error)
      window.open(url, '_blank', 'noopener,noreferrer')
    } finally {
      button.disabled = false
      button.textContent = originalText
    }
  })

  return button
}

const crcTable = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) {
      c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[n] = c >>> 0
  }
  return table
})()

function crc32(bytes) {
  let crc = 0xffffffff
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function writeUint16(view, offset, value) {
  view.setUint16(offset, value, true)
}

function writeUint32(view, offset, value) {
  view.setUint32(offset, value >>> 0, true)
}

async function createStoredZip(files) {
  const encoder = new TextEncoder()
  const localParts = []
  const centralParts = []
  let offset = 0

  for (const file of files) {
    const nameBytes = encoder.encode(file.name)
    const dataBytes = new Uint8Array(await file.blob.arrayBuffer())
    const checksum = crc32(dataBytes)

    const local = new Uint8Array(30 + nameBytes.length + dataBytes.length)
    const localView = new DataView(local.buffer)
    writeUint32(localView, 0, 0x04034b50)
    writeUint16(localView, 4, 20)
    writeUint16(localView, 6, 0x0800)
    writeUint16(localView, 8, 0)
    writeUint16(localView, 10, 0)
    writeUint16(localView, 12, 0)
    writeUint32(localView, 14, checksum)
    writeUint32(localView, 18, dataBytes.length)
    writeUint32(localView, 22, dataBytes.length)
    writeUint16(localView, 26, nameBytes.length)
    writeUint16(localView, 28, 0)
    local.set(nameBytes, 30)
    local.set(dataBytes, 30 + nameBytes.length)
    localParts.push(local)

    const central = new Uint8Array(46 + nameBytes.length)
    const centralView = new DataView(central.buffer)
    writeUint32(centralView, 0, 0x02014b50)
    writeUint16(centralView, 4, 20)
    writeUint16(centralView, 6, 20)
    writeUint16(centralView, 8, 0x0800)
    writeUint16(centralView, 10, 0)
    writeUint16(centralView, 12, 0)
    writeUint16(centralView, 14, 0)
    writeUint32(centralView, 16, checksum)
    writeUint32(centralView, 20, dataBytes.length)
    writeUint32(centralView, 24, dataBytes.length)
    writeUint16(centralView, 28, nameBytes.length)
    writeUint16(centralView, 30, 0)
    writeUint16(centralView, 32, 0)
    writeUint16(centralView, 34, 0)
    writeUint16(centralView, 36, 0)
    writeUint32(centralView, 38, 0)
    writeUint32(centralView, 42, offset)
    central.set(nameBytes, 46)
    centralParts.push(central)

    offset += local.length
  }

  const centralOffset = offset
  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0)
  const end = new Uint8Array(22)
  const endView = new DataView(end.buffer)
  writeUint32(endView, 0, 0x06054b50)
  writeUint16(endView, 4, 0)
  writeUint16(endView, 6, 0)
  writeUint16(endView, 8, files.length)
  writeUint16(endView, 10, files.length)
  writeUint32(endView, 12, centralSize)
  writeUint32(endView, 16, centralOffset)
  writeUint16(endView, 20, 0)

  return new Blob([...localParts, ...centralParts, end], { type: 'application/zip' })
}

function createDownloadAllAudioButton(audioItems, title) {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'resource-button resource-button-secondary'
  button.textContent = 'Download All Songs'

  button.addEventListener('click', async () => {
    const originalText = button.textContent
    button.disabled = true
    button.textContent = 'Preparing ZIP...'

    try {
      const files = []
      for (let index = 0; index < audioItems.length; index += 1) {
        const media = audioItems[index]
        const blob = await fetchFile(getMediaUrl(media))
        files.push({
          name: getFileName(media) || `song-${index + 1}.mp3`,
          blob,
        })
      }

      const zipBlob = await createStoredZip(files)
      const safeTitle = cleanText(title).replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '')
      triggerBlobDownload(zipBlob, `${safeTitle || 'audio-collection'}.zip`)
    } catch (error) {
      console.error('Audio collection download failed:', error)
      window.alert('The audio collection could not be prepared. Please download the songs individually.')
    } finally {
      button.disabled = false
      button.textContent = originalText
    }
  })

  return button
}

async function createFavouriteButton(resourceId, userId) {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'resource-button'

  const { data: existing } = await supabase
    .from('favorites')
    .select('id')
    .eq('user_id', userId)
    .eq('resource_id', resourceId)
    .maybeSingle()

  let favouriteId = existing?.id || null

  const updateLabel = () => {
    button.textContent = favouriteId
      ? 'Remove from My Favourites'
      : 'Add to My Favourites'
  }

  updateLabel()

  button.addEventListener('click', async () => {
    button.disabled = true

    if (favouriteId) {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('id', favouriteId)
        .eq('user_id', userId)
      if (!error) favouriteId = null
    } else {
      const { data, error } = await supabase
        .from('favorites')
        .insert({ user_id: userId, resource_id: resourceId })
        .select('id')
        .single()
      if (!error) favouriteId = data?.id || null
    }

    updateLabel()
    button.disabled = false
  })

  return button
}

async function renderResource(resource) {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  detailsContainer.replaceChildren()

  const article = document.createElement('article')
  article.className = 'resource-details-card'

  const imageUrl = cleanText(resource.image_url)
  if (imageUrl) {
    const image = document.createElement('img')
    image.src = imageUrl
    image.alt = cleanText(resource.title) || 'Learning resource'
    image.className = 'resource-details-image'
    article.appendChild(image)
  }

  const platform = document.createElement('p')
  platform.className = 'resource-platform'
  platform.textContent = cleanText(resource.platform) || 'Resource'

  const title = document.createElement('h2')
  title.textContent = cleanText(resource.title) || 'Untitled Resource'
  article.append(platform, title)

  const metaText = formatResourceMeta(resource)
  if (metaText) {
    const meta = document.createElement('p')
    meta.className = 'resource-meta'
    meta.textContent = metaText
    article.appendChild(meta)
  }

  const descriptionText = cleanText(resource.description)
  if (descriptionText) {
    const description = document.createElement('p')
    description.className = 'resource-details-description'
    description.textContent = descriptionText
    article.appendChild(description)
  }

  const actions = document.createElement('div')
  actions.className = 'resource-actions'
  const usedUrls = new Set()

  const resourceUrl = cleanText(resource.resource_url)
  const platformName = cleanKey(resource.platform)
  if (resourceUrl) {
    let buttonText = 'Open Main Resource'
    if (platformName.includes('wordwall')) buttonText = 'Play on Wordwall'
    if (platformName.includes('kahoot')) buttonText = 'Play on Kahoot'

    actions.appendChild(createLink(buttonText, resourceUrl))
    usedUrls.add(resourceUrl)
  }

  const mediaItems = Array.isArray(resource.resource_media)
    ? resource.resource_media
    : resource.resource_media
      ? [resource.resource_media]
      : []

  const audioItems = mediaItems.filter(isAudioMedia)
  const isAudioCollection = audioItems.length > 1

  if (isAudioCollection) {
    const collectionTitle = document.createElement('h3')
    collectionTitle.textContent = 'Audio Collection'
    article.appendChild(collectionTitle)

    audioItems.forEach((media) => {
      const mediaUrl = getMediaUrl(media)
      if (!mediaUrl) return

      actions.appendChild(createLink(`Play: ${getDisplayName(media)}`, mediaUrl))

      if (user && isDirectFileMedia(media)) {
        actions.appendChild(createDownloadButton(`Download: ${getDisplayName(media)}`, media))
      }
    })

    if (user && audioItems.every(isDirectFileMedia)) {
      actions.appendChild(createDownloadAllAudioButton(audioItems, resource.title))
    }
  } else {
    mediaItems.forEach((media) => {
      const mediaUrl = getMediaUrl(media)
      if (!mediaUrl || usedUrls.has(mediaUrl)) return

      const role = getMediaRole(media, resource)
      actions.appendChild(
        createLink(getOpenLabel(media, role), getOpenUrl(media), {
          secondary: role === 'additional',
        })
      )

      if (user && isDirectFileMedia(media)) {
        const label = isPresentationMedia(media) ? 'Download File' : 'Download File'
        actions.appendChild(createDownloadButton(label, media))
      }

      usedUrls.add(mediaUrl)
    })
  }

  if (actions.children.length > 0) article.appendChild(actions)

  if (user) {
    const favouriteActions = document.createElement('div')
    favouriteActions.className = 'resource-actions'
    favouriteActions.appendChild(await createFavouriteButton(resource.id, user.id))
    article.appendChild(favouriteActions)
  }

  const navigationActions = document.createElement('div')
  navigationActions.className = 'resource-actions detail-navigation-actions'

  const parameters = new URLSearchParams(window.location.search)
  if (parameters.get('from') === 'favourites') {
    const favouriteId = parameters.get('favourite') || resource.id
    navigationActions.appendChild(
      createLink('Back to My Favourites', `/favourites.html#favourite-${favouriteId}`, {
        secondary: true,
        external: false,
      })
    )
  }

  navigationActions.appendChild(
    createLink('Back to Resources', `/resources.html#resource-${resource.id}`, {
      secondary: true,
      external: false,
    })
  )

  article.appendChild(navigationActions)
  detailsContainer.appendChild(article)
}

async function loadResourceDetails() {
  const resourceId = new URLSearchParams(window.location.search).get('id')
  if (!resourceId) {
    showMessage('Resource ID is missing.')
    return
  }

  const { data: resource, error } = await supabase
    .from('resources')
    .select('*, resource_media(*)')
    .eq('id', resourceId)
    .single()

  if (error || !resource) {
    console.error('Could not load resource:', error)
    showMessage('The requested resource could not be found.')
    return
  }

  document.title = `${cleanText(resource.title)} | Kami's Gamified English Resources`
  await renderResource(resource)
}

loadResourceDetails()
