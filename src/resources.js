import { supabase } from './supabase.js'

const cleanText = (value) => String(value ?? '').trim()
const cleanKey = (value) => cleanText(value).toLowerCase()

const masonryGrid = document.querySelector('.resource-grid')
let masonryFrame = null
let signedInUser = null

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

function getAudienceTags(gradeLevel) {
  const numbers = cleanText(gradeLevel).match(/\d+/g)?.map(Number) || []
  const tags = []

  if (numbers.some((grade) => grade <= 4)) {
    tags.push('primary')
  }

  if (numbers.some((grade) => grade >= 5)) {
    tags.push('lower-secondary')
  }

  return tags.join(' ')
}

function createLink(label, url, secondary = false) {
  const link = document.createElement('a')

  link.href = url
  link.textContent = label
  link.className = secondary
    ? 'resource-button resource-button-secondary'
    : 'resource-button'
  link.target = '_blank'
  link.rel = 'noopener noreferrer'

  return link
}


function isPresentationMedia(media) {
  const fileName = cleanText(media?.file_name).toLowerCase()
  const mediaType = cleanText(media?.media_type).toLowerCase()

  return (
    mediaType === 'presentation' ||
    /\.(ppt|pptx|pps|ppsx|odp|key)$/.test(fileName)
  )
}

function getOfficeViewerUrl(fileUrl) {
  return `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(fileUrl)}`
}

function getMediaRole(media, resource) {
  const savedRole = cleanKey(media?.media_role)

  if (savedRole === 'main' || savedRole === 'additional') {
    return savedRole
  }

  return cleanText(resource?.resource_url) ? 'additional' : 'main'
}

function getMediaExtension(media) {
  const fileName = cleanText(media?.file_name).toLowerCase()
  const parts = fileName.split('.')
  return parts.length > 1 ? parts.pop() : ''
}

function getMainMediaLabel(media) {
  const mediaType = cleanKey(media?.media_type)
  const extension = getMediaExtension(media)

  if (
    mediaType === 'audio' ||
    ['mp3', 'wav', 'm4a', 'aac', 'ogg', 'flac', 'opus'].includes(extension)
  ) {
    return 'Play Audio'
  }

  if (
    mediaType === 'video' ||
    ['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(extension)
  ) {
    return 'Watch Video'
  }

  if (
    mediaType === 'image' ||
    ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension)
  ) {
    return 'Open Image'
  }

  if (mediaType === 'document') {
    return 'Open Document'
  }

  return 'Open Main Resource'
}

function createResourceCard(resource) {
  const card = document.createElement('article')
  const platform = cleanText(resource.platform) || 'Resource'
  const platformKey = cleanKey(platform)

  card.className = 'resource-card resource-card-horizontal'
  card.dataset.platform = platformKey
  card.dataset.category = cleanKey(resource.category)
  card.dataset.audience = getAudienceTags(resource.grade_level)

  const imageUrl = cleanText(resource.image_url)

  if (imageUrl) {
    const imageWrapper = document.createElement('div')
    imageWrapper.className = 'resource-card-image-wrap'

    const image = document.createElement('img')
    image.src = imageUrl
    image.alt = cleanText(resource.title) || 'Learning resource'
    image.className = 'resource-image'
    image.loading = 'lazy'

    imageWrapper.appendChild(image)
    card.appendChild(imageWrapper)
  }

  const content = document.createElement('div')
  content.className = 'resource-card-content'

  const platformLabel = document.createElement('span')
  platformLabel.className = 'resource-platform'
  platformLabel.textContent = platform

  const title = document.createElement('h3')
  title.textContent = cleanText(resource.title) || 'Untitled Resource'

  content.append(platformLabel, title)

  const metaParts = [
    cleanText(resource.grade_level),
    cleanText(resource.category),
  ].filter(Boolean)

  if (metaParts.length > 0) {
    const meta = document.createElement('p')
    meta.className = 'resource-meta'
    meta.textContent = metaParts.join(' · ')
    content.appendChild(meta)
  }

  const descriptionText = cleanText(resource.description)

  if (descriptionText) {
    const description = document.createElement('p')
    description.textContent = descriptionText
    content.appendChild(description)
  }

  const actions = document.createElement('div')
  actions.className = 'resource-actions'

  const detailsPage =
    cleanText(resource.details_page) ||
    `/resource-details.html?id=${encodeURIComponent(resource.id)}`

  const detailsLink = document.createElement('a')
  detailsLink.href = detailsPage
  detailsLink.textContent = 'View Details'
  detailsLink.className = 'resource-button'
  actions.appendChild(detailsLink)

  const resourceUrl = cleanText(resource.resource_url)

  if (resourceUrl) {
    let buttonText = 'Open Resource'

    if (platformKey.includes('kahoot')) {
      buttonText = 'Play on Kahoot'
    } else if (platformKey.includes('wordwall')) {
      buttonText = 'Play on Wordwall'
    }

    actions.appendChild(createLink(buttonText, resourceUrl))
  }

  const mediaItems = Array.isArray(resource.resource_media)
    ? resource.resource_media
    : resource.resource_media
      ? [resource.resource_media]
      : []

  mediaItems.forEach((media, index) => {
  if (mediaItems.length > 1) {
    if (index === 0) {
   const collectionLink = document.createElement('a')
collectionLink.href = detailsPage
collectionLink.textContent = 'Open Audio Collection'
collectionLink.className = 'resource-button'
actions.appendChild(collectionLink)   
    }
    return
  }
    const mediaUrl = getMediaUrl(media)

    if (!mediaUrl) return

    const mediaRole = getMediaRole(media, resource)

    if (isPresentationMedia(media)) {
      actions.appendChild(
        createLink(
          mediaRole === 'main'
            ? 'View Main Presentation'
            : 'View Additional Presentation',
          getOfficeViewerUrl(mediaUrl)
        )
      )

      if (signedInUser) {
        const downloadLink = createLink('Download PPTX', mediaUrl, true)
        downloadLink.setAttribute('download', '')
        actions.appendChild(downloadLink)
      }

      return
    }

    if (mediaRole === 'main') {
      actions.appendChild(
        createLink(getMainMediaLabel(media), mediaUrl)
      )
      return
    }

    actions.appendChild(
      createLink('Open Additional Material', mediaUrl, true)
    )
  })

  if (actions.children.length > 0) {
    content.appendChild(actions)
  }

  card.appendChild(content)

  return card
}

function resizeMasonryCards() {
  if (!masonryGrid) return

  const gridStyles = window.getComputedStyle(masonryGrid)
  const rowHeight = Number.parseFloat(
    gridStyles.getPropertyValue('grid-auto-rows')
  )
  const rowGap = Number.parseFloat(gridStyles.getPropertyValue('row-gap'))

  if (!Number.isFinite(rowHeight) || !Number.isFinite(rowGap)) return

  masonryGrid.querySelectorAll('.resource-card').forEach((card) => {
    if (card.style.display === 'none') {
      card.style.gridRowEnd = ''
      return
    }

    card.style.gridRowEnd = 'auto'

    const cardHeight = card.getBoundingClientRect().height
    const rowSpan = Math.max(
      1,
      Math.ceil((cardHeight + rowGap) / (rowHeight + rowGap))
    )

    card.style.gridRowEnd = `span ${rowSpan}`
  })
}

function scheduleMasonryResize() {
  if (masonryFrame !== null) {
    window.cancelAnimationFrame(masonryFrame)
  }

  masonryFrame = window.requestAnimationFrame(() => {
    masonryFrame = window.requestAnimationFrame(() => {
      resizeMasonryCards()
      masonryFrame = null
    })
  })
}

function activateDynamicFilters() {
  const filterButtons = document.querySelectorAll('.filter-button')

  filterButtons.forEach((button) => {
    if (button.dataset.dynamicFilterReady === 'true') return

    button.dataset.dynamicFilterReady = 'true'

    button.addEventListener('click', () => {
      const selectedFilter = cleanKey(button.dataset.filter)

      filterButtons.forEach((item) => item.classList.remove('active'))
      button.classList.add('active')

      document.querySelectorAll('.resource-card').forEach((card) => {
        const searchableValues = [
          card.dataset.platform,
          card.dataset.category,
          card.dataset.audience,
        ]
          .join(' ')
          .toLowerCase()

        const shouldShow =
          selectedFilter === 'all' ||
          searchableValues.includes(selectedFilter)

        card.style.display = shouldShow ? '' : 'none'
      })

      window.setTimeout(scheduleMasonryResize, 50)
    })
  })
}

async function loadPublicResources() {
  if (!masonryGrid) {
    console.error('Resource grid was not found.')
    return
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  signedInUser = user

  const { data: resources, error } = await supabase
    .from('resources')
    .select('*, resource_media(*)')
    .order('id', { ascending: false })

  if (error) {
    console.error('Could not load resources:', error)
    return
  }

  const existingTitles = new Set(
    [...masonryGrid.querySelectorAll('.resource-card h3')].map((heading) =>
      cleanKey(heading.textContent)
    )
  )

  resources.forEach((resource) => {
    const titleKey = cleanKey(resource.title)

    // Avoid duplicating a resource that is still written statically in HTML.
    if (existingTitles.has(titleKey)) return

    masonryGrid.appendChild(createResourceCard(resource))
    existingTitles.add(titleKey)
  })

  activateDynamicFilters()
  scheduleMasonryResize()
}

function observeMasonryChanges() {
  if (!masonryGrid) return

  masonryGrid.addEventListener(
    'load',
    (event) => {
      if (event.target instanceof HTMLImageElement) {
        scheduleMasonryResize()
      }
    },
    true
  )

  const mutationObserver = new MutationObserver(scheduleMasonryResize)

  mutationObserver.observe(masonryGrid, {
    childList: true,
    subtree: true,
  })

  if ('ResizeObserver' in window) {
    const resizeObserver = new ResizeObserver(scheduleMasonryResize)
    resizeObserver.observe(masonryGrid)

    masonryGrid.querySelectorAll('.resource-card').forEach((card) => {
      resizeObserver.observe(card)
    })

    const cardObserver = new MutationObserver(() => {
      masonryGrid.querySelectorAll('.resource-card').forEach((card) => {
        resizeObserver.observe(card)
      })
    })

    cardObserver.observe(masonryGrid, {
      childList: true,
    })
  }
}

window.addEventListener('load', scheduleMasonryResize)
window.addEventListener('resize', scheduleMasonryResize)

observeMasonryChanges()
activateDynamicFilters()
loadPublicResources()
scheduleMasonryResize()
