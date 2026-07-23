import { supabase } from './supabase.js'

const form = document.querySelector('#reset-password-form')
const passwordInput = document.querySelector('#new-password')
const confirmInput = document.querySelector('#confirm-new-password')
const message = document.querySelector('#reset-message')
const submitButton = form.querySelector('button[type="submit"]')
const togglePasswordsButton = document.querySelector('#toggle-reset-passwords')

togglePasswordsButton.addEventListener('click', () => {
  const passwordsAreVisible = passwordInput.type === 'text'
  const nextType = passwordsAreVisible ? 'password' : 'text'

  passwordInput.type = nextType
  confirmInput.type = nextType
  togglePasswordsButton.textContent = passwordsAreVisible
    ? '👁 Show passwords'
    : '🙈 Hide passwords'
  togglePasswordsButton.setAttribute(
    'aria-pressed',
    passwordsAreVisible ? 'false' : 'true'
  )
})

form.addEventListener('submit', async (event) => {
  event.preventDefault()

  const password = passwordInput.value
  const confirmation = confirmInput.value

  if (password !== confirmation) {
    message.textContent = 'The two passwords do not match.'
    return
  }

  if (password.length < 6) {
    message.textContent = 'The password must contain at least 6 characters.'
    return
  }

  submitButton.disabled = true
  message.textContent = 'Saving your new password...'

  try {
    const {
      data: { session }
    } = await supabase.auth.getSession()

    if (!session) {
      throw new Error('No password recovery session was found.')
    }

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      throw error
    }

    message.textContent =
      'Your password has been changed successfully. You can now sign in with the new password.'

    window.setTimeout(() => {
      window.location.href = '/login.html'
    }, 1800)
  } catch (error) {
    console.error('Password update failed:', error)
    message.textContent =
      'This reset link is invalid or has expired. Request a new link from the Forgot Password page.'
  } finally {
    submitButton.disabled = false
  }
})
