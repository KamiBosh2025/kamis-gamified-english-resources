import { supabase } from './supabase.js'

const favoritesList = document.querySelector('#favorites-list')

const {
  data: { user },
} = await supabase.auth.getUser()

if (!user) {
  window.location.href = '/login.html'
} else {
  await loadFavorites()
}

async function loadFavorites() {
  favoritesList.innerHTML = '<p>Loading favourites...</p>'

  const { data: favorites, error } = await supabase
    .from('favorites')
    .select(`
      id,
      resource_id,
      resources (
        id,
        title,
        platform,
        resource_url
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    favoritesList.innerHTML = '<p>Favourites could not be loaded.</p>'
    return
  }

  if (!favorites?.length) {
    favoritesList.innerHTML =
      '<p>You have not saved any favourite resources yet. Open the Resources page and choose the activities you would like to keep here for quick access.</p>'
    return
  }

  favoritesList.replaceChildren(
    ...favorites.map((favorite) => {
      const article = document.createElement('article')
      article.className = 'favorite-item'

      const resource = favorite.resources

      const title = document.createElement('h3')
      title.textContent = resource?.title || 'Saved resource'

      const platform = document.createElement('p')
      platform.textContent =
        resource?.platform || 'Learning resource'

      const actions = document.createElement('div')
      actions.className = 'resource-actions'

      const detailsLink = document.createElement('a')
      detailsLink.href =
        `/resource-details.html?id=${encodeURIComponent(favorite.resource_id)}`
      detailsLink.className = 'resource-button'
      detailsLink.textContent = 'View Details'

      actions.appendChild(detailsLink)

      if (resource?.resource_url) {
        const openLink = document.createElement('a')
        openLink.href = resource.resource_url
        openLink.target = '_blank'
        openLink.rel = 'noopener noreferrer'
        openLink.className = 'resource-button'
        openLink.textContent = 'Open Resource'
        actions.appendChild(openLink)
      }

      const removeButton = document.createElement('button')
      removeButton.type = 'button'
      removeButton.className =
        'resource-button resource-button-secondary'
      removeButton.textContent = 'Remove from Favourites'

      removeButton.addEventListener('click', async () => {
        removeButton.disabled = true

        const { error: removeError } = await supabase
          .from('favorites')
          .delete()
          .eq('id', favorite.id)
          .eq('user_id', user.id)

        if (removeError) {
          removeButton.disabled = false
          return
        }

        article.remove()

        if (!favoritesList.querySelector('.favorite-item')) {
          favoritesList.innerHTML =
            '<p>You have not saved any favourite resources yet. Open the Resources page and choose the activities you would like to keep here for quick access.</p>'
        }
      })

      actions.appendChild(removeButton)
      article.append(title, platform, actions)

      return article
    })
  )
}

