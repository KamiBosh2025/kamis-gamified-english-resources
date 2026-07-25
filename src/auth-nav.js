import { supabase } from './supabase.js'

function createNavLink(label, href, className = '') {
  const link = document.createElement('a')
  link.textContent = label
  link.href = href

  if (className) link.className = className

  return link
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function addResourceUiStyles() {
  if (document.querySelector('#resource-ui-final-styles')) return

  const style = document.createElement('style')
  style.id = 'resource-ui-final-styles'
  style.textContent = `
    .resource-button,
    .resource-button.secondary,
    .resource-button.resource-button-secondary,
    .teaching-demo-actions .btn,
    .details-button-wrap .resource-button {
      background: #7c3aed !important;
      border: 2px solid #7c3aed !important;
      color: #ffffff !important;
      text-decoration: none !important;
    }

    .resource-button:hover,
    .resource-button.secondary:hover,
    .resource-button.resource-button-secondary:hover,
    .teaching-demo-actions .btn:hover,
    .details-button-wrap .resource-button:hover {
      background: #5b21b6 !important;
      border-color: #5b21b6 !important;
      color: #ffffff !important;
    }

    .resource-card-content > p:not(.resource-meta),
    .resource-details-content > p:not(.resource-meta),
    .resource-details-card .resource-details-description,
    .teaching-demo-heading > p,
    .external-source {
      text-align: justify !important;
    }

    .resource-card h3,
    .resource-details-content h2,
    .resource-details-content h3,
    .resource-details-card h2,
    .resource-details-card h3 {
      text-align: center !important;
    }

    .resource-actions,
    .details-button-wrap,
    .teaching-demo-actions,
    .generated-back-actions {
      display: flex !important;
      flex-wrap: wrap !important;
      justify-content: center !important;
      align-items: center !important;
      gap: 12px !important;
    }

    .resource-details-card:has(> .resource-details-image) {
      display: grid;
      grid-template-columns: minmax(220px, 320px) minmax(0, 1fr);
      column-gap: 32px;
      align-items: start;
    }

    .resource-details-card:has(> .resource-details-image) > .resource-details-image {
      grid-column: 1;
      grid-row: 1 / span 12;
      width: 100%;
      height: auto;
      object-fit: contain;
      margin: 0;
    }

    .resource-details-card:has(> .resource-details-image) > :not(.resource-details-image) {
      grid-column: 2;
    }

    @media (max-width: 760px) {
      .resource-details-card:has(> .resource-details-image) {
        display: block;
      }

      .resource-details-card:has(> .resource-details-image) > .resource-details-image {
        max-width: 420px;
        margin: 0 auto 24px;
      }
    }
  `

  document.head.appendChild(style)
}

function getActiveFilter() {
  return (
    document.querySelector('.filter-button.active')?.dataset.filter ||
    new URLSearchParams(window.location.search).get('filter') ||
    'all'
  )
}

function prepareResourceCards() {
  if (!document.body.classList.contains('resources-page-body') && !document.querySelector('.resources-page')) return

  document.querySelectorAll('.resource-card').forEach((card) => {
    const title = card.querySelector('h3')?.textContent || ''
    const cardId = card.id || `resource-${slugify(title)}`
    card.id = cardId

    card.querySelectorAll('a[href]').forEach((link) => {
      const href = link.getAttribute('href') || ''
      const isInternalDetails =
        href.endsWith('.html') &&
        !href.includes('resources.html') &&
        !href.includes('teaching-demonstration.html') &&
        !href.includes('external-teaching-examples.html')

      if (!isInternalDetails || link.dataset.returnReady === 'true') return

      link.dataset.returnReady = 'true'
      link.addEventListener('click', () => {
        const filter = getActiveFilter()
        sessionStorage.setItem('resourceReturnFilter', filter)
        sessionStorage.setItem('resourceReturnCard', cardId)

        const url = new URL(link.href, window.location.origin)
        url.searchParams.set('returnFilter', filter)
        url.searchParams.set('returnCard', cardId)
        link.href = `${url.pathname}${url.search}${url.hash}`
      })
    })
  })
}

function restoreResourcesPosition() {
  if (!document.querySelector('.resources-page')) return

  const params = new URLSearchParams(window.location.search)
  const filter = params.get('filter') || sessionStorage.getItem('resourceReturnFilter') || 'all'
  const cardId = window.location.hash.replace('#', '') || params.get('card') || sessionStorage.getItem('resourceReturnCard')

  const applyState = () => {
    const filterButton = document.querySelector(`.filter-button[data-filter="${CSS.escape(filter)}"]`)
    if (filterButton && !filterButton.classList.contains('active')) filterButton.click()

    if (cardId) {
      const card = document.getElementById(cardId)
      if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  window.setTimeout(applyState, 350)
  window.setTimeout(applyState, 1000)
}

function prepareBackLinks() {
  if (document.querySelector('.resources-page')) return

  const params = new URLSearchParams(window.location.search)
  const filter = params.get('returnFilter') || sessionStorage.getItem('resourceReturnFilter') || 'all'
  const cardId = params.get('returnCard') || sessionStorage.getItem('resourceReturnCard') || ''
  const resourcesHref = `/resources.html?filter=${encodeURIComponent(filter)}${cardId ? `#${encodeURIComponent(cardId)}` : ''}`

  document.querySelectorAll('a').forEach((link) => {
    const label = link.textContent.trim().replace(/^←\s*/, '')
    if (label !== link.textContent.trim()) link.textContent = label

    if (label === 'Back to Resources') link.href = resourcesHref
  })

  const detailsPage = document.querySelector('.resource-details-page')
  if (detailsPage && ![...document.querySelectorAll('a')].some((link) => link.textContent.trim() === 'Back to Resources')) {
    const actions = document.createElement('div')
    actions.className = 'generated-back-actions'

    const backLink = document.createElement('a')
    backLink.href = resourcesHref
    backLink.className = 'resource-button'
    backLink.textContent = 'Back to Resources'

    actions.appendChild(backLink)
    detailsPage.appendChild(actions)
  }
}

function initResourceUiFixes() {
  addResourceUiStyles()
  prepareResourceCards()
  restoreResourcesPosition()
  prepareBackLinks()

  const observer = new MutationObserver(() => prepareResourceCards())
  observer.observe(document.body, { childList: true, subtree: true })
}

export async function initAuthNavigation() {
  const nav = document.querySelector('.main-nav')

  if (!nav || nav.dataset.authReady === 'true') return

  nav.dataset.authReady = 'true'

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    nav.append(
      createNavLink('Sign In', '/login.html', 'auth-nav-link'),
      createNavLink('Register', '/register.html', 'auth-nav-link'),
    )
    return
  }

  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle()

  nav.append(createNavLink('My Favourites', '/favourites.html', 'auth-nav-link'))
  nav.append(createNavLink('My Profile', '/profile.html', 'auth-nav-link'))

  if (roleData?.role === 'admin') {
    nav.append(createNavLink('Admin Panel', '/admin.html', 'auth-nav-link'))
  }

  const signOutButton = document.createElement('button')
  signOutButton.type = 'button'
  signOutButton.className = 'auth-nav-button'
  signOutButton.textContent = 'Sign Out'
  signOutButton.addEventListener('click', async () => {
    signOutButton.disabled = true
    await supabase.auth.signOut()
    window.location.href = '/index.html'
  })

  nav.append(signOutButton)
}

initResourceUiFixes()
initAuthNavigation()
