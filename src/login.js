import { supabase } from './supabase.js'

const loginForm = document.querySelector('#login-form')
const loginMessage = document.querySelector('#login-message')
const passwordInput = document.querySelector('#password')
const togglePassword = document.querySelector('#toggle-password')

togglePassword.addEventListener('click', () => {
  const passwordIsHidden = passwordInput.type === 'password'

  passwordInput.type = passwordIsHidden ? 'text' : 'password'
  togglePassword.textContent = passwordIsHidden ? '\u{1F648}' : '\u{1F441}\uFE0F'
  togglePassword.classList.toggle('password-hidden', !passwordIsHidden)
  togglePassword.setAttribute(
    'aria-label',
    passwordIsHidden ? 'Hide password' : 'Show password'
  )
})
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
    .maybeSingle()

  if (roleError) {
    loginMessage.textContent = `Role check failed: ${roleError.message}`
    return
  }

  loginMessage.textContent = 'Login successful!'

  if (roleData?.role === 'admin') {
    window.location.href = '/admin.html'
    return
  }

  window.location.href = '/index.html'
})
