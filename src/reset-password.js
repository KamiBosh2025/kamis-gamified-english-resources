import { supabase } from './supabase.js'

const form = document.querySelector('#reset-password-form')
const passwordInput = document.querySelector('#new-password')
const confirmInput = document.querySelector('#confirm-new-password')
const message = document.querySelector('#reset-message')
const submitButton = form.querySelector('button[type="submit"]')

const togglePasswordButton = document.querySelector('#toggle-new-password')
const toggleConfirmationButton = document.querySelector(
  '#toggle-confirm-new-password'
)

function setUpPasswordToggle(input, button) {
  button.addEventListener('click', () => {
    const passwordIsHidden = input.type === 'password'

    input.type = passwordIsHidden ? 'text' : 'password'
    button.textContent = passwordIsHidden
      ? '\u{1F648}'
      : '\u{1F441}\uFE0F'

    button.classList.toggle('password-hidden', !passwordIsHidden)

    button.setAttribute(
      'aria-label',
      passwordIsHidden ? 'Hide password' : 'Show password'
    )
  })
}

setUpPasswordToggle(passwordInput, togglePasswordButton)
setUpPasswordToggle(confirmInput, toggleConfirmationButton)

form.addEventListener('submit', async (event) => {
  event.preventDefault()

  const password = passwordInput.value
  const confirmation = confirmInput.value

  if (password.length < 8) {
    message.textContent =
      'The password must contain at least 8 characters.'
    return
  }

  if (password !== confirmation) {
    message.textContent = 'The two passwords do not match.'
    return
  }

  submitButton.disabled = true
  message.textContent = 'Saving your new password...'

  try {
    const {
      data: { session },
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
