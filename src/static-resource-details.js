import { supabase } from './supabase.js'
import { cleanText, safeAnchor } from './resource-media-utils.js'

const page = document.querySelector('.resource-details-page')
const layout = document.querySelector('.resource-details-layout')
const title = cleanText(document.querySelector('.resource-details-content h2')?.textContent)

function getPageAnchor() {
  const fileName = window.location.pathname.split('/').filter(Boolean).at(-1) || 'resource'
  return `resource-${safeAnchor(fileName.replace(/\.html$/i, ''))}`
}

function createAction(label, href, className = 'resource-button') {
  const link = document.createElement('a')
  link.href = href
  link.textContent = label
  link.className = className
  return link
}

async function findResource() {
  if (!title) return null

  const { data, error } = await supabase
    .from('resources')
    .select('id,title')

  if (error) {
    console.error('Static resource record could not be loaded:', error)
    return null
  }

  const normalizedTitle = safeAnchor(title)
  return (data || []).find((resource) => safeAnchor(resource.title) === normalizedTitle) || null
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

async function initialiseStaticDetails() {
  if (!page || !layout) return

  page.querySelectorAll('.back-link').forEach((link) => link.remove())

  const navigation = document.createElement('div')
  navigation.className = 'resource-actions detail-navigation-actions'

  const parameters = new URLSearchParams(window.location.search)

  if (parameters.get('from') === 'favourites') {
    const favouriteId = parameters.get('favourite')
    if (favouriteId) {
      navigation.appendChild(
        createAction(
          'Back to My Favourites',
          `/favourites.html#favourite-${favouriteId}`,
          'resource-button resource-button-secondary'
        )
      )
    }
  }

  const backLink = createAction(
    'Back to Resources',
    `/resources.html#${getPageAnchor()}`,
    'resource-button resource-button-secondary'
  )
  navigation.appendChild(backLink)
  const detailsButtons = page.querySelector('.resource-details-content .details-button-wrap')
  const detailsContent = page.querySelector('.resource-details-content')

  if (detailsButtons) {
    detailsButtons.insertAdjacentElement('afterend', navigation)
  } else if (detailsContent) {
    detailsContent.appendChild(navigation)
  } else {
    layout.insertAdjacentElement('afterend', navigation)
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const resource = user ? await findResource() : null

  if (user && resource?.id) {
    navigation.insertBefore(
      await createFavouriteButton(resource.id, user.id),
      backLink
    )
  }
}

initialiseStaticDetails()
