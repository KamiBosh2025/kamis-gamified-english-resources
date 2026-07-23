import { supabase } from './supabase.js'

const form = document.querySelector('#register-form')
const message = document.querySelector('#register-message')
const submitButton = form.querySelector('button[type="submit"]')

form.addEventListener('submit', async (event) => {
  event.preventDefault()

  const fullName = document.querySelector('#full-name').value.trim()
  const email = document.querySelector('#email').value.trim()
  const password = document.querySelector('#password').value
  const confirmation = document.querySelector('#confirm-password').value

  if (password !== confirmation) {
    message.textContent = 'The passwords do not match.'
    return
  }

  submitButton.disabled = true
  message.textContent = 'Creating your account...'

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  })

  if (error) {
    message.textContent = `Registration failed: ${error.message}`
    submitButton.disabled = false
    return
  }

  if (data.session) {
    message.textContent = 'Account created successfully. Redirecting...'
    window.setTimeout(() => {
      window.location.href = '/profile.html'
    }, 800)
    return
  }

  message.textContent = 'Account created. Check your email to confirm it, then sign in.'
  form.reset()
  submitButton.disabled = false
})
