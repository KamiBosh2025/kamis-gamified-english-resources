import { supabase } from './supabase.js'

const form = document.querySelector('#forgot-password-form')
const emailInput = document.querySelector('#recovery-email')
const message = document.querySelector('#recovery-message')
const submitButton = form.querySelector('button[type="submit"]')

form.addEventListener('submit', async (event) => {
  event.preventDefault()

  const email = emailInput.value.trim()
  message.textContent = 'Sending reset link...'
  submitButton.disabled = true

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password.html`
    })

    if (error) {
      throw error
    }

    message.textContent =
      'If an account exists for this email, a password reset link has been sent. Please check your inbox and spam folder.'
  } catch (error) {
    console.error('Password reset request failed:', error)
    message.textContent =
      'The reset link could not be sent. Please wait a moment and try again.'
  } finally {
    submitButton.disabled = false
  }
})
