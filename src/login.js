import { supabase } from './supabase.js'

const loginForm = document.querySelector('#login-form')
const loginMessage = document.querySelector('#login-message')

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault()

  const email = document.querySelector('#email').value.trim()
  const password = document.querySelector('#password').value

  loginMessage.textContent = 'Signing in...'

  const { data: authData, error: loginError } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    })

  if (loginError) {
    loginMessage.textContent = `Login failed: ${loginError.message}`
    return
  }

  const { data: roleData, error: roleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', authData.user.id)
    .single()

  if (roleError) {
    loginMessage.textContent = `Role check failed: ${roleError.message}`
    return
  }

  loginMessage.textContent = 'Login successful!'

  if (roleData.role === 'admin') {
    window.location.href = '/admin.html'
    return
  }

  window.location.href = '/index.html'
})