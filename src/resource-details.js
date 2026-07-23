import { supabase } from './supabase.js'

const detailsContainer = document.querySelector('#resource-details')

const cleanText = (value) => String(value ?? '').trim()
const cleanKey = (value) => cleanText(value).toLowerCase()

function getMediaUrl(media) {
  return cleanText(
    media?.media_url ||
      media?.external_url ||
      media?.source_url ||
      media?.file_url ||
      media?.public_url ||
      media?.url
  )
}

function getMediaRole(media, resource) {
  const savedRole = cleanKey(media?.media_role)

  if (savedRole === 'main' || savedRole === 'additional') {
    return savedRole
  }

  return cleanText(resource?.resource_url) ? 'additional' : 'main'
}

function getFileName(media) {
  const fullName = cleanText(media?.file_name)

  if (!fullName) {
    return 'Audio file'
  }

  const parts = fullName.split(/[\\/]/)
  return parts[parts.length - 1]
}

function getDisplayName(media) {
  return getFileName(media)
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .trim()
}

function isAudioMedia(media) {
  const mediaType = cleanKey(media?.media_type)
  const fileName = getFileName(media).toLowerCase()

  return (
    mediaType === 'audio' ||
    /\.(mp3|wav|m4a|aac|ogg|flac|opus)$/.test(fileName)
  )
}

function createButton(text, url, secondary = false) {
  const link = document.createElement('a')

  link.href = url
  link.textContent = text
  link.className = secondary
    ? 'resource-button resource-button-secondary'
    : 'resource-button'

  link.target = '_blank'
  link.rel = 'noopener noreferrer'

  return link
}

function createDownloadButton(text, url) {
  const isPdf = /\.pdf(?:$|[?#])/i.test(url)

  if (!isPdf) {
    const link = createButton(text, url, true)
    link.setAttribute('download', '')
    link.title = 'Download this file'
    return link
  }

  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'resource-button resource-button-secondary'
  button.textContent = text

  button.addEventListener('click', async () => {
    const originalText = button.textContent
    button.disabled = true
    button.textContent = 'Downloading...'

    try {
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`)
      }

      const blob = await response.blob()
      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      const rawName =
        decodeURIComponent(url.split('/').pop().split('?')[0]) || 'document.pdf'
      const fileName = rawName.toLowerCase().endsWith('.pdf')
        ? rawName
        : 'document.pdf'

      link.href = objectUrl
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(objectUrl)
    } catch (error) {
      console.error('PDF download failed:', error)
      window.open(url, '_blank', 'noopener,noreferrer')
    } finally {
      button.disabled = false
      button.textContent = originalText
    }
  })

  return button
}

function showMessage(message) {
  detailsContainer.replaceChildren()

  const paragraph = document.createElement('p')
  paragraph.textContent = message

  detailsContainer.appendChild(paragraph)
}

async function createFavoriteButton(resourceId) {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'resource-button resource-button-secondary'

  const { data: existingFavorite } = await supabase
    .from('favorites')
    .select('id')
    .eq('user_id', user.id)
    .eq('resource_id', resourceId)
    .maybeSingle()

  let favoriteId = existingFavorite?.id || null

  const updateLabel = () => {
    button.textContent = favoriteId ? 'Remove from Favorites' : 'Add to Favorites'
  }

  updateLabel()

  button.addEventListener('click', async () => {
    button.disabled = true

    if (favoriteId) {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('id', favoriteId)
        .eq('user_id', user.id)

      if (!error) favoriteId = null
    } else {
      const { data, error } = await supabase
        .from('favorites')
        .insert({ user_id: user.id, resource_id: resourceId })
        .select('id')
        .single()

      if (!error) {
        favoriteId = data.id
        window.location.href = '/favourites.html'
        return
      }
    }

    updateLabel()
    button.disabled = false
  })

  return button
}

async function renderResource(resource) {
  const {
    data: { user: signedInUser },
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

  const metaParts = [
    cleanText(resource.grade_level),
    cleanText(resource.category),
  ].filter(Boolean)

  if (metaParts.length > 0) {
    const meta = document.createElement('p')
    meta.className = 'resource-meta'
    meta.textContent = metaParts.join(' В· ')

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

  const resourceUrl = cleanText(resource.resource_url)
  const platformName = cleanKey(resource.platform)

  if (resourceUrl) {
    let buttonText = 'Open Main Resource'

    if (platformName.includes('wordwall')) {
      buttonText = 'Play on Wordwall'
    }

    if (platformName.includes('kahoot')) {
      buttonText = 'Play on Kahoot'
    }

    actions.appendChild(createButton(buttonText, resourceUrl))
  }

  const mediaItems = Array.isArray(resource.resource_media)
    ? resource.resource_media
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

      const songName = getDisplayName(media)

      actions.appendChild(
        createButton(`Play: ${songName}`, mediaUrl)
      )
    })
  } else {
    mediaItems.forEach((media) => {
      const mediaUrl = getMediaUrl(media)

      if (!mediaUrl) return

      const mediaRole = getMediaRole(media, resource)

      if (isAudioMedia(media)) {
        actions.appendChild(
          createButton(
            mediaRole === 'main'
              ? 'Play Audio'
              : 'Play Additional Audio',
            mediaUrl,
            mediaRole === 'additional'
          )
        )

        return
      }

      actions.appendChild(
        createButton(
          mediaRole === 'main'
            ? 'Open Main File'
            : 'Open Additional Material',
          mediaUrl,
          mediaRole === 'additional'
        )
      )

      if (signedInUser) {
        actions.appendChild(
          createDownloadButton('Download File', mediaUrl)
        )
      }
    })
  }

  if (actions.children.length > 0) {
    article.appendChild(actions)
  }

  const favoriteButton = await createFavoriteButton(resource.id)

  if (favoriteButton) {
    const favoriteActions = document.createElement('div')
    favoriteActions.className = 'resource-actions'
    favoriteActions.appendChild(favoriteButton)
    article.appendChild(favoriteActions)
  }

  const navigationActions = document.createElement('div')
  navigationActions.className = 'resource-actions'

  if (favoriteButton) {
    const favoritesLink = document.createElement('a')
    favoritesLink.href = '/favourites.html'
    favoritesLink.textContent = 'Back to My Favourites'
    favoritesLink.className = 'resource-button resource-button-secondary'
    navigationActions.appendChild(favoritesLink)
  }

  const backLink = document.createElement('a')
  backLink.href = '/resources.html'
  backLink.textContent = 'Back to Resources'
  backLink.className = 'resource-button resource-button-secondary'
  navigationActions.appendChild(backLink)

  article.appendChild(navigationActions)
  detailsContainer.appendChild(article)
}

async function loadResourceDetails() {
  const parameters = new URLSearchParams(window.location.search)
  const resourceId = parameters.get('id')

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

  document.title =
    `${cleanText(resource.title)} | Kami's Gamified English Resources`

  await renderResource(resource)
}

loadResourceDetails()
 
   
  
  

