import { supabase } from './supabase.js'
import {
  cleanText,
  cleanKey,
  formatResourceMeta,
  getFileName,
  getMediaUrl,
  getMediaRole,
  getOpenUrl,
  isAudioMedia,
  isDirectFileMedia,
  isImageMedia,
  isPdfMedia,
  isPresentationMedia,
  isVideoMedia,
  safeAnchor,
} from './resource-media-utils.js'

const masonryGrid = document.querySelector('.resource-grid')
const ITEMS_PER_PAGE = 6
let masonryFrame = null
let signedInUser = null
let currentPage = 1
let selectedFilter = 'all'
let paginationContainer = null

function getAudienceTags(gradeLevel) {
  const numbers = cleanText(gradeLevel).match(/\d+/g)?.map(Number) || []
  const tags = []

  if (numbers.some((grade) => grade <= 4)) tags.push('primary')
  if (numbers.some((grade) => grade >= 5)) tags.push('lower-secondary')

  return tags.join(' ')
}

function createLink(label, url, { secondary = false, external = true, download = false } = {}) {
  const link = document.createElement('a')
  link.href = url
  link.textContent = label
  link.className = secondary
    ? 'resource-button resource-button-secondary'
    : 'resource-button'

  if (external) {
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
  }

  if (download) link.setAttribute('download', '')
  return link
}

function createDownloadButton(label, media) {
  const url = getMediaUrl(media)
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'resource-button resource-button-secondary'
  button.textContent = label

  button.addEventListener('click', async () => {
    const originalText = button.textContent
    button.disabled = true
    button.textContent = 'Downloading...'

    try {
      const response = await fetch(url)
      if (!response.ok) throw new Error(`Download failed: ${response.status}`)
      const blob = await response.blob()
      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = getFileName(media, url)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
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

function getCardOpenLabel(media, role) {
  if (role === 'additional') return 'Open Additional Material'
  if (isAudioMedia(media)) return 'Play Audio'
  if (isVideoMedia(media)) return 'Watch Video'
  if (isImageMedia(media)) return 'Open Image'
  if (isPresentationMedia(media)) return 'View Main Presentation'
  if (isPdfMedia(media) || cleanKey(media?.media_type) === 'document') return 'Open Document'
  return 'Open Main Resource'
}

function getStaticCardAnchor(card) {
  const detailsLink = [...card.querySelectorAll('a')].find((link) =>
    /\.html(?:[?#]|$)/i.test(link.getAttribute('href') || '') &&
    /View Details/i.test(link.textContent || '')
  )

  if (!detailsLink) return ''

  const fileName = new URL(detailsLink.href, window.location.origin)
    .pathname.split('/').filter(Boolean).at(-1) || ''

  return `resource-${safeAnchor(fileName.replace(/\.html$/i, ''))}`
}

function prepareStaticCards(resources) {
  const byTitle = new Map(
    resources.map((resource) => [cleanKey(resource.title), resource])
  )

  masonryGrid.querySelectorAll('.resource-card').forEach((card) => {
    const titleText = cleanText(card.querySelector('h3')?.textContent)
    const resource = byTitle.get(cleanKey(titleText))
    const anchor = getStaticCardAnchor(card) || `resource-${safeAnchor(titleText)}`

    card.id = anchor
    card.dataset.resourceAnchor = anchor

    if (resource?.id) card.dataset.resourceId = String(resource.id)

    const detailsLink = [...card.querySelectorAll('a')].find((link) =>
      /View Details/i.test(link.textContent || '')
    )

    if (detailsLink) detailsLink.dataset.returnAnchor = anchor
  })
}

function createResourceCard(resource) {
  const card = document.createElement('article')
  const platform = cleanText(resource.platform) || 'Resource'
  const platformKey = cleanKey(platform)
  const anchor = `resource-${resource.id}`

  card.className = 'resource-card resource-card-horizontal'
  card.id = anchor
  card.dataset.resourceId = String(resource.id)
  card.dataset.resourceAnchor = anchor
  card.dataset.platform = platformKey
  card.dataset.category = cleanKey(resource.category)
  card.dataset.audience = getAudienceTags(resource.grade_level)
  card.dataset.filterGroup = cleanKey(resource.filter_group)

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

  const metaText = formatResourceMeta(resource)
  if (metaText) {
    const meta = document.createElement('p')
    meta.className = 'resource-meta'
    meta.textContent = metaText
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

  actions.appendChild(
    createLink('View Details', detailsPage, { external: false })
  )

  const resourceUrl = cleanText(resource.resource_url)
  if (resourceUrl) {
    let buttonText = 'Open Resource'
    if (platformKey.includes('kahoot')) buttonText = 'Play on Kahoot'
    else if (platformKey.includes('wordwall')) buttonText = 'Play on Wordwall'

    actions.appendChild(createLink(buttonText, resourceUrl))
  }

  const mediaItems = Array.isArray(resource.resource_media)
    ? resource.resource_media
    : resource.resource_media
      ? [resource.resource_media]
      : []

  const audioItems = mediaItems.filter(isAudioMedia)

  if (audioItems.length > 1) {
    actions.appendChild(
      createLink('Open Audio Collection', detailsPage, { external: false })
    )
  } else {
    mediaItems.forEach((media) => {
      const mediaUrl = getMediaUrl(media)
      if (!mediaUrl) return

      const role = getMediaRole(media, resource)
      const label = getCardOpenLabel(media, role)
      const openUrl = getOpenUrl(media)

      actions.appendChild(
        createLink(label, openUrl, { secondary: role === 'additional' })
      )

      if (signedInUser && isDirectFileMedia(media)) {
        const downloadLabel = isPresentationMedia(media)
          ? 'Download PPTX'
          : 'Download File'

        actions.appendChild(
          createDownloadButton(downloadLabel, media)
        )
      }
    })
  }

  content.appendChild(actions)
  card.appendChild(content)
  return card
}

function resizeMasonryCards() {
  if (!masonryGrid) return

  const gridStyles = window.getComputedStyle(masonryGrid)
  const rowHeight = Number.parseFloat(gridStyles.getPropertyValue('grid-auto-rows'))
  const rowGap = Number.parseFloat(gridStyles.getPropertyValue('row-gap'))

  if (!Number.isFinite(rowHeight) || !Number.isFinite(rowGap)) return

  masonryGrid.querySelectorAll('.resource-card').forEach((card) => {
    if (card.hidden || card.style.display === 'none') {
      card.style.gridRowEnd = ''
      return
    }

    card.style.gridRowEnd = 'auto'
    const cardHeight = card.getBoundingClientRect().height
    const rowSpan = Math.max(1, Math.ceil((cardHeight + rowGap) / (rowHeight + rowGap)))
    card.style.gridRowEnd = `span ${rowSpan}`
  })
}

function scheduleMasonryResize() {
  if (masonryFrame !== null) window.cancelAnimationFrame(masonryFrame)

  masonryFrame = window.requestAnimationFrame(() => {
    masonryFrame = window.requestAnimationFrame(() => {
      resizeMasonryCards()
      masonryFrame = null
    })
  })
}

function cardMatchesFilter(card) {
  const values = [
    card.dataset.platform,
    card.dataset.category,
    card.dataset.audience,
    card.dataset.filterGroup,
  ].join(' ').toLowerCase()

  return selectedFilter === 'all' || values.includes(selectedFilter)
}

function getFilteredCards() {
  return [...masonryGrid.querySelectorAll('.resource-card')].filter(cardMatchesFilter)
}

function ensurePagination() {
  if (paginationContainer) return paginationContainer

  paginationContainer = document.createElement('nav')
  paginationContainer.className = 'pagination-controls'
  paginationContainer.setAttribute('aria-label', 'Resources pages')
  masonryGrid.insertAdjacentElement('afterend', paginationContainer)
  return paginationContainer
}

function renderPagination(totalPages) {
  const container = ensurePagination()
  container.replaceChildren()

  if (totalPages <= 1) {
    container.hidden = true
    return
  }

  container.hidden = false

  const previous = document.createElement('button')
  previous.type = 'button'
  previous.className = 'pagination-button'
  previous.textContent = 'Previous'
  previous.disabled = currentPage <= 1
  previous.addEventListener('click', () => {
    currentPage -= 1
    updateVisibleCards({ scrollToGrid: true })
  })

  const status = document.createElement('span')
  status.className = 'pagination-status'
  status.textContent = `Page ${currentPage} of ${totalPages}`

  const next = document.createElement('button')
  next.type = 'button'
  next.className = 'pagination-button'
  next.textContent = 'Next'
  next.disabled = currentPage >= totalPages
  next.addEventListener('click', () => {
    currentPage += 1
    updateVisibleCards({ scrollToGrid: true })
  })

  container.append(previous, status, next)
}

function updateVisibleCards({ scrollToGrid = false } = {}) {
  const allCards = [...masonryGrid.querySelectorAll('.resource-card')]
  const filteredCards = getFilteredCards()
  const totalPages = Math.max(1, Math.ceil(filteredCards.length / ITEMS_PER_PAGE))
  currentPage = Math.min(Math.max(currentPage, 1), totalPages)

  allCards.forEach((card) => {
    card.hidden = true
    card.style.display = 'none'
  })

  const start = (currentPage - 1) * ITEMS_PER_PAGE
  filteredCards.slice(start, start + ITEMS_PER_PAGE).forEach((card) => {
    card.hidden = false
    card.style.display = ''
  })

  renderPagination(totalPages)
  scheduleMasonryResize()

  if (scrollToGrid) {
    masonryGrid.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

function activateDynamicFilters() {
  const filterButtons = document.querySelectorAll('.filter-button')

  filterButtons.forEach((button) => {
    if (button.dataset.dynamicFilterReady === 'true') return
    button.dataset.dynamicFilterReady = 'true'

    button.addEventListener('click', () => {
      selectedFilter = cleanKey(button.dataset.filter) || 'all'
      currentPage = 1
      filterButtons.forEach((item) => item.classList.remove('active'))
      button.classList.add('active')
      updateVisibleCards({ scrollToGrid: true })
    })
  })
}

function revealHashTarget() {
  const anchor = window.location.hash.replace(/^#/, '')
  if (!anchor) return

  const target = document.getElementById(anchor)
  if (!target) return

  selectedFilter = 'all'
  document.querySelectorAll('.filter-button').forEach((button) => {
    button.classList.toggle('active', button.dataset.filter === 'all')
  })

  const cards = getFilteredCards()
  const index = cards.indexOf(target)
  if (index >= 0) currentPage = Math.floor(index / ITEMS_PER_PAGE) + 1

  updateVisibleCards()
  window.setTimeout(() => {
    target.scrollIntoView({ behavior: 'smooth', block: 'center' })
    target.classList.add('resource-card-highlight')
    window.setTimeout(() => target.classList.remove('resource-card-highlight'), 1800)
  }, 100)
}

async function loadPublicResources() {
  if (!masonryGrid) return

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
    prepareStaticCards([])
    activateDynamicFilters()
    updateVisibleCards()
    revealHashTarget()
    return
  }

  prepareStaticCards(resources || [])

  const existingTitles = new Set(
    [...masonryGrid.querySelectorAll('.resource-card h3')].map((heading) =>
      cleanKey(heading.textContent)
    )
  )

  ;(resources || []).forEach((resource) => {
    const titleKey = cleanKey(resource.title)
    if (existingTitles.has(titleKey)) return

    masonryGrid.appendChild(createResourceCard(resource))
    existingTitles.add(titleKey)
  })

  activateDynamicFilters()
  updateVisibleCards()
  revealHashTarget()
  window.dispatchEvent(new CustomEvent('resources:ready'))
}

function observeMasonryChanges() {
  if (!masonryGrid) return

  masonryGrid.addEventListener('load', (event) => {
    if (event.target instanceof HTMLImageElement) scheduleMasonryResize()
  }, true)

  if ('ResizeObserver' in window) {
    const resizeObserver = new ResizeObserver(scheduleMasonryResize)
    resizeObserver.observe(masonryGrid)
  }
}

window.addEventListener('load', scheduleMasonryResize)
window.addEventListener('resize', scheduleMasonryResize)
window.addEventListener('hashchange', revealHashTarget)

observeMasonryChanges()
loadPublicResources()
