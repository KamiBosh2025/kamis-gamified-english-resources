import { supabase } from './supabase.js'

function createNavLink(label, href, className = '') {
  const link = document.createElement('a')
  link.textContent = label
  link.href = href

  if (className) link.className = className

  return link
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

initAuthNavigation()


