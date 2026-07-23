import { supabase } from './supabase.js'

const cleanText = (value) => String(value ?? '').trim()

function getResourceId(card) {
  const detailsLink = [...card.querySelectorAll('a')].find((link) => {
    return link.href.includes('resource-details.html?id=')
  })

  if (!detailsLink) return ''

  const url = new URL(detailsLink.href)
  return cleanText(url.searchParams.get('id'))
}

function createFavoriteButton(resourceId, favoriteMap, userId) {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'resource-button resource-button-secondary'

  const updateButton = () => {
    button.textContent = favoriteMap.has(resourceId)
      ? 'Remove from Favourites'
      : 'Add to Favourites'
  }

  updateButton()

  button.addEventListener('click', async () => {
    button.disabled = true

    if (favoriteMap.has(resourceId)) {
      const favoriteId = favoriteMap.get(resourceId)

      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('id', favoriteId)
        .eq('user_id', userId)

      if (!error) {
        favoriteMap.delete(resourceId)
      }
    } else {
      const { data, error } = await supabase
        .from('favorites')
        .insert({
          user_id: userId,
          resource_id: resourceId,
        })
        .select('id')
        .single()

      if (!error && data?.id) {
        favoriteMap.set(resourceId, data.id)
        window.location.href = '/favourites.html'
        return
      }
    }

    updateButton()
    button.disabled = false
  })

  return button
}

async function activateFavoriteButtons() {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return

  const { data: favorites, error } = await supabase
    .from('favorites')
    .select('id, resource_id')
    .eq('user_id', user.id)

  if (error) {
    console.error('Favorites could not be loaded:', error)
    return
  }

  const favoriteMap = new Map(
    (favorites || []).map((favorite) => [
      String(favorite.resource_id),
      favorite.id,
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
        createFavoriteButton(resourceId, favoriteMap, user.id)
      )

      card.dataset.favoriteReady = 'true'
    })
  }

  prepareCards()

  const observer = new MutationObserver(prepareCards)

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  })
}

activateFavoriteButtons()

