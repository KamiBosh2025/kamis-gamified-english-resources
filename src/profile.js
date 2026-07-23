import { supabase } from './supabase.js'

const {
  data: { user },
} = await supabase.auth.getUser()

if (!user) {
  window.location.href = '/login.html'
} else {
  const nameElement = document.querySelector('#profile-name')
  const emailElement = document.querySelector('#profile-email')
  const roleElement = document.querySelector('#profile-role')
  const messageElement = document.querySelector('#profile-message')
  const profileForm = document.querySelector('#profile-form')
  const nameInput = document.querySelector('#profile-name-input')
  const updateMessage = document.querySelector('#profile-update-message')
  const favoritesSection = document.querySelector('#favorites-section')
  const favoritesList = document.querySelector('#favorites-list')

  emailElement.textContent = user.email || 'Not available'
  nameElement.textContent = user.user_metadata?.full_name || ''

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  const profileName = profile?.full_name || profile?.name || profile?.display_name
  if (profileName) nameElement.textContent = profileName

  const { data: roleData, error: roleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle()

  const role = roleData?.role || 'normal'
  roleElement.textContent = role === 'admin' ? 'Administrator' : 'Registered user'

  if (!nameElement.textContent.trim()) {
    nameElement.textContent = role === 'admin' ? 'Teacher' : 'User'
  }
  nameInput.value = nameElement.textContent
  if (roleError) messageElement.textContent = 'Your role could not be loaded.'

  profileForm.addEventListener('submit', async (event) => {
    event.preventDefault()

    const fullName = nameInput.value.trim()
    if (!fullName) return

    const submitButton = profileForm.querySelector('button[type="submit"]')
    submitButton.disabled = true
    updateMessage.textContent = 'Saving profile...'

    const { error: authUpdateError } = await supabase.auth.updateUser({
      data: { full_name: fullName },
    })

    if (authUpdateError) {
      updateMessage.textContent = `Profile could not be saved: ${authUpdateError.message}`
      submitButton.disabled = false
      return
    }

    if (profile) {
      await supabase
        .from('profiles')
        .update({ full_name: fullName })
        .eq('user_id', user.id)
    }

    nameElement.textContent = fullName
    updateMessage.textContent = 'Profile saved successfully.'
    submitButton.disabled = false
  })

  if (role === 'admin') {
    favoritesSection.hidden = true
    document.querySelector('.profile-main').classList.add('admin-profile')
  } else {
    const { data: favorites, error: favoritesError } = await supabase
      .from('favorites')
      .select('id, resource_id, resources(id, title, platform, resource_url)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (favoritesError) {
      favoritesList.innerHTML = '<p>Favorites could not be loaded.</p>'
    } else if (!favorites?.length) {
      favoritesList.innerHTML = '<p>You have not saved any favorite resources yet.</p>'
    } else {
      favoritesList.replaceChildren(
        ...favorites.map((favorite) => {
          const article = document.createElement('article')
          article.className = 'favorite-item'
          const resource = favorite.resources

          const title = document.createElement('h3')
          title.textContent = resource?.title || 'Saved resource'
          const meta = document.createElement('p')
          meta.textContent = resource?.platform || 'Learning resource'
          article.append(title, meta)

          if (resource?.resource_url) {
            const link = document.createElement('a')
            link.href = resource.resource_url
            link.target = '_blank'
            link.rel = 'noopener noreferrer'
            link.className = 'resource-button'
            link.textContent = 'Open Resource'
            article.append(link)
          }

          return article
        }),
      )
    }
  }
}

const deleteAccountButton = document.getElementById("delete-account-button");
const deleteAccountMessage = document.getElementById("delete-account-message");

deleteAccountButton?.addEventListener("click", () => {
  const confirmed = window.confirm(
    "Are you sure you want to delete your account? This action cannot be undone."
  );

  if (!confirmed) {
    return;
  }

  deleteAccountMessage.textContent =
    "Account deletion requires final secure confirmation. Your account has not been deleted.";
});

window.addEventListener("load", () => {
  if (window.location.hash === "#favorites-section") {
    const favoritesSection = document.getElementById("favorites-section");

    favoritesSection?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }
});
