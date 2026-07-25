import { supabase } from './supabase.js'

const cleanText = (value) => String(value ?? '').trim()

function getResourceId(card) {
  const savedId = cleanText(card.dataset.resourceId)
  if (savedId) return savedId

  const detailsLink = [...card.querySelectorAll('a')].find((link) => {
    return link.href.includes('resource-details.html?id=')
  })

  if (!detailsLink) return ''

  const url = new URL(detailsLink.href)
  return cleanText(url.searchParams.get('id'))
}

function createFavouriteButton(resourceId, favouriteMap, userId) {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'resource-button resource-button-secondary'

  const updateButton = () => {
    button.textContent = favouriteMap.has(resourceId)
      ? 'Remove from My Favourites'
      : 'Add to My Favourites'
  }

  updateButton()

  button.addEventListener('click', async () => {
    button.disabled = true

    if (favouriteMap.has(resourceId)) {
      const favouriteId = favouriteMap.get(resourceId)
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('id', favouriteId)
        .eq('user_id', userId)

      if (!error) favouriteMap.delete(resourceId)
    } else {
      const { data, error } = await supabase
        .from('favorites')
        .insert({ user_id: userId, resource_id: resourceId })
        .select('id')
        .single()

      if (!error && data?.id) favouriteMap.set(resourceId, data.id)
    }

    updateButton()
    button.disabled = false
  })

  return button
}

async function activateFavouriteButtons() {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return

  const { data: favourites, error } = await supabase
    .from('favorites')
    .select('id, resource_id')
    .eq('user_id', user.id)

  if (error) {
    console.error('Favourites could not be loaded:', error)
    return
  }

  const favouriteMap = new Map(
    (favourites || []).map((favourite) => [
      String(favourite.resource_id),
      favourite.id,
    ])
  )

  const prepareCards = () => {
    document.querySelectorAll('.resource-card').forEach((card) => {
      if (card.dataset.favoriteReady === 'true') return

      const resourceId = getResourceId(card)
      if (!resourceId) return

      const actions = card.querySelector('.resource-actions')
      if (!actions) return

      actions.appendChild(
        createFavouriteButton(resourceId, favouriteMap, user.id)
      )

      card.dataset.favoriteReady = 'true'
    })
  }

  prepareCards()

  const observer = new MutationObserver(prepareCards)
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['data-resource-id'],
  })

  window.addEventListener('resources:ready', prepareCards)
}

activateFavouriteButtons()
