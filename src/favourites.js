import { supabase } from './supabase.js'

const favouritesList = document.querySelector('#favorites-list')
const ITEMS_PER_PAGE = 5
let currentPage = 1
let favouriteArticles = []
let paginationContainer = null

const STATIC_DETAILS_BY_TITLE = new Map([
  ["The Big Bad Wolf’s Story", '/big-bad-wolf.html'],
  ["The Big Bad Wolf's Story", '/big-bad-wolf.html'],
  ['English & Bulgarian Basics', '/english-bulgarian-basics.html'],
  ['Playful English & Bulgarian Quiz with GIFs and Emojis', '/playful-english-bulgarian-quiz.html'],
  ['Everyday Directions & City Places', '/everyday-directions-city-places-vocabulary.html'],
  ["Bulgaria’s 100 Tourist Sites", '/bulgarias-100-tourist-sites-challenge.html'],
  ["Bulgaria's 100 Tourist Sites", '/bulgarias-100-tourist-sites-challenge.html'],
  ['Bulgarian–English Fun Word Mix', '/bulgarian-english-fun-word-mix.html'],
  ['Bulgarian-English Fun Word Mix', '/bulgarian-english-fun-word-mix.html'],
  ['Have fun, kids!', '/have-fun-kids.html'],
  ['Amazing Planet Earth', '/amazing-planet-earth.html'],
  ['Crazy Insects', '/crazy-insects.html'],
  ['Click only Present Simple tense!', '/click-only-present-simple-tense.html'],
])

const {
  data: { user },
} = await supabase.auth.getUser()

if (!user) {
  window.location.href = '/login.html'
} else {
  await loadFavourites()
}

function ensurePagination() {
  if (paginationContainer) return paginationContainer

  paginationContainer = document.createElement('nav')
  paginationContainer.className = 'pagination-controls'
  paginationContainer.setAttribute('aria-label', 'Favourite resources pages')
  favouritesList.insertAdjacentElement('afterend', paginationContainer)
  return paginationContainer
}

function renderPage({ scroll = false } = {}) {
  const totalPages = Math.max(1, Math.ceil(favouriteArticles.length / ITEMS_PER_PAGE))
  currentPage = Math.min(Math.max(1, currentPage), totalPages)

  favouriteArticles.forEach((article) => {
    article.hidden = true
  })

  const start = (currentPage - 1) * ITEMS_PER_PAGE
  favouriteArticles.slice(start, start + ITEMS_PER_PAGE).forEach((article) => {
    article.hidden = false
  })

  const pagination = ensurePagination()
  pagination.replaceChildren()

  if (totalPages <= 1) {
    pagination.hidden = true
  } else {
    pagination.hidden = false

    const previous = document.createElement('button')
    previous.type = 'button'
    previous.className = 'pagination-button'
    previous.textContent = 'Previous'
    previous.disabled = currentPage === 1
    previous.addEventListener('click', () => {
      currentPage -= 1
      renderPage({ scroll: true })
    })

    const status = document.createElement('span')
    status.className = 'pagination-status'
    status.textContent = `Page ${currentPage} of ${totalPages}`

    const next = document.createElement('button')
    next.type = 'button'
    next.className = 'pagination-button'
    next.textContent = 'Next'
    next.disabled = currentPage === totalPages
    next.addEventListener('click', () => {
      currentPage += 1
      renderPage({ scroll: true })
    })

    pagination.append(previous, status, next)
  }

  if (scroll) {
    favouritesList.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

function revealFavouriteFromHash() {
  const id = window.location.hash.replace(/^#favourite-/, '')
  if (!id) return

  const target = document.getElementById(`favourite-${id}`)
  if (!target) return

  const index = favouriteArticles.indexOf(target)
  if (index >= 0) currentPage = Math.floor(index / ITEMS_PER_PAGE) + 1
  renderPage()

  window.setTimeout(() => {
    target.scrollIntoView({ behavior: 'smooth', block: 'center' })
    target.classList.add('resource-card-highlight')
    window.setTimeout(() => target.classList.remove('resource-card-highlight'), 1800)
  }, 100)
}

function showEmptyMessage() {
  favouritesList.innerHTML =
    '<p>You have not saved any favourite resources yet. Open the Resources page and choose the activities you would like to keep here for quick access.</p>'
  favouriteArticles = []
  ensurePagination().hidden = true
}

function buildDetailsUrl(resource, resourceId) {
  const staticDetails = STATIC_DETAILS_BY_TITLE.get(resource?.title)
  const rawUrl = resource?.details_page || staticDetails || `/resource-details.html?id=${encodeURIComponent(resourceId)}`
  const url = new URL(rawUrl, window.location.origin)
  url.searchParams.set('from', 'favourites')
  url.searchParams.set('favourite', String(resourceId))
  return `${url.pathname}${url.search}${url.hash}`
}

async function loadFavourites() {
  favouritesList.innerHTML = '<p>Loading favourites...</p>'

  const { data: favourites, error } = await supabase
    .from('favorites')
    .select(`
      id,
      resource_id,
      created_at,
      resources (
        id,
        title,
        platform,
        resource_url,
        details_page
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    favouritesList.innerHTML = '<p>Favourites could not be loaded.</p>'
    return
  }

  if (!favourites?.length) {
    showEmptyMessage()
    return
  }

  favouriteArticles = favourites.map((favourite) => {
    const article = document.createElement('article')
    article.className = 'favorite-item'
    article.id = `favourite-${favourite.resource_id}`

    const resource = favourite.resources

    const title = document.createElement('h3')
    title.textContent = resource?.title || 'Saved resource'

    const platform = document.createElement('p')
    platform.textContent = resource?.platform || 'Learning resource'

    const actions = document.createElement('div')
    actions.className = 'resource-actions'

    const detailsLink = document.createElement('a')
    detailsLink.href = buildDetailsUrl(resource, favourite.resource_id)
    detailsLink.className = 'resource-button'
    detailsLink.textContent = 'View Details'
    actions.appendChild(detailsLink)

    if (resource?.resource_url) {
      const openLink = document.createElement('a')
      openLink.href = resource.resource_url
      openLink.target = '_blank'
      openLink.rel = 'noopener noreferrer'
      openLink.className = 'resource-button'

      const platformKey = String(resource.platform || '').toLowerCase()
      openLink.textContent = platformKey.includes('kahoot')
        ? 'Play on Kahoot'
        : platformKey.includes('wordwall')
          ? 'Play on Wordwall'
          : 'Open Resource'

      actions.appendChild(openLink)
    }

    const removeButton = document.createElement('button')
    removeButton.type = 'button'
    removeButton.className = 'resource-button resource-button-secondary'
    removeButton.textContent = 'Remove from My Favourites'

    removeButton.addEventListener('click', async () => {
      removeButton.disabled = true

      const { error: removeError } = await supabase
        .from('favorites')
        .delete()
        .eq('id', favourite.id)
        .eq('user_id', user.id)

      if (removeError) {
        removeButton.disabled = false
        return
      }

      favouriteArticles = favouriteArticles.filter((item) => item !== article)
      article.remove()

      if (favouriteArticles.length === 0) showEmptyMessage()
      else renderPage()
    })

    actions.appendChild(removeButton)
    article.append(title, platform, actions)
    return article
  })

  favouritesList.replaceChildren(...favouriteArticles)
  renderPage()
  revealFavouriteFromHash()
}

window.addEventListener('hashchange', revealFavouriteFromHash)
