import { supabase } from './supabase.js'

const resourceForm = document.querySelector('#resource-form')
const adminMessage = document.querySelector('#admin-message')
const logoutButton = document.querySelector('#logout-button')
const mediaTypeSelect = document.querySelector('#media-type')
const mediaSourceSelect = document.querySelector('#media-source')
const additionalMediaFields = document.querySelector('#additional-media-fields')
const externalMediaField = document.querySelector('#external-media-field')
const uploadMediaField = document.querySelector('#upload-media-field')
const mediaUrlInput = document.querySelector('#media-url')
const mediaFileInput = document.querySelector('#media-file')

function updateAdditionalMediaFields() {
    const hasAdditionalMedia = Boolean(mediaTypeSelect.value)

    additionalMediaFields.hidden = !hasAdditionalMedia

    if (!hasAdditionalMedia) {
        mediaSourceSelect.value = ''
        mediaUrlInput.value = ''
        mediaFileInput.value = ''
        externalMediaField.hidden = true
        uploadMediaField.hidden = true
        return
    }

    externalMediaField.hidden = mediaSourceSelect.value !== 'external'
    uploadMediaField.hidden = mediaSourceSelect.value !== 'upload'

    if (mediaSourceSelect.value !== 'external') {
        mediaUrlInput.value = ''
    }

    if (mediaSourceSelect.value !== 'upload') {
        mediaFileInput.value = ''
    }
}

mediaTypeSelect.addEventListener('change', updateAdditionalMediaFields)
mediaSourceSelect.addEventListener('change', updateAdditionalMediaFields)

updateAdditionalMediaFields()
const {
  data: { user },
} = await supabase.auth.getUser()

if (!user) {
  window.location.href = '/login.html'
} else {

const { data: roleData, error: roleError } = await supabase
  .from('user_roles')
  .select('role')
  .eq('user_id', user.id)
  .single()

if (roleError || roleData?.role !== 'admin') {
  window.location.href = '/index.html'
}
let editingResourceId = null
let editingResourceMediaUrl = null
const submitButton = resourceForm.querySelector('button[type="submit"]')
resourceForm.addEventListener('submit', async (event) => {
  event.preventDefault()

  adminMessage.textContent = 'Adding resource...'
const mediaType = document.querySelector('#media-type').value
const mediaSource = document.querySelector('#media-source').value
  const mediaFiles = Array.from(document.querySelector('#media-file').files)
let mediaUrl = document.querySelector('#media-url').value.trim()
 if (mediaType && !mediaSource) {
    adminMessage.textContent = 'Please choose a media source.'
    return
}

if (mediaSource === 'upload' && !mediaType) {
    adminMessage.textContent = 'Please choose a media type.'
    return
}

if (mediaSource === 'external' && !mediaUrl) {
    adminMessage.textContent = 'Please enter an external media URL.'
    return
}

if (mediaSource === 'upload' && mediaFiles.length === 0) {
    adminMessage.textContent = 'Please choose a media file.'
    return
}
const pendingMediaItems = []

if (mediaSource === 'external') {
    pendingMediaItems.push({
        media_type: mediaType,
        media_url: mediaUrl,
        file_name: null
    })
}

if (mediaSource === 'upload') {
    for (const mediaFile of mediaFiles) {
        const fileExtension = mediaFile.name.includes('.')
            ? mediaFile.name.split('.').pop()
            : 'file'

        const storedFileName =
            `${user.id}/${crypto.randomUUID()}.${fileExtension}`

        const { error: uploadError } = await supabase.storage
            .from('resource-media')
            .upload(storedFileName, mediaFile)

        if (uploadError) {
            adminMessage.textContent =
                `Could not upload "${mediaFile.name}": ${uploadError.message}`
            return
        }

        const { data: publicUrlData } = supabase.storage
            .from('resource-media')
            .getPublicUrl(storedFileName)

        const detectedMediaType =
            mediaFile.type.startsWith('image/') ? 'image' :
            mediaFile.type.startsWith('video/') ? 'video' :
            mediaFile.type.startsWith('audio/') ? 'audio' :
            'document'

        pendingMediaItems.push({
            media_type: detectedMediaType,
            media_url: publicUrlData.publicUrl,
            file_name: mediaFile.name
        })
    }
}
const newResource = {
    title: document.querySelector('#title').value.trim(),
    
    platform: document.querySelector('#platform').value,
    description: document.querySelector('#description').value.trim(),
    category: document.querySelector('#category').value.trim(),
   resource_url: document.querySelector('#resource-url').value.trim() || null,
   image_url: document.querySelector('#image-url').value.trim() || null,

    grade_level: document.querySelector('#grade-level').value.trim(),
    created_by: user.id,
  }

  let saveResult

if (editingResourceId) {
    saveResult = await supabase
        .from('resources')
        .update(newResource)
        .eq('id', editingResourceId)
        .select('id')
        .single()
} else {
    saveResult = await supabase
        .from('resources')
        .insert(newResource)
        .select('id')
        .single()
}

const { data: savedResource, error } = saveResult

  if (error) {
    adminMessage.textContent = `Could not add resource: ${error.message}`
    return
  }
if (pendingMediaItems.length > 0) {
    const mediaRows = pendingMediaItems.map((item) => ({
        ...item,
        resource_id: savedResource.id
    }))

    const { error: mediaInsertError } = await supabase
        .from('resource_media')
        .insert(mediaRows)

    if (mediaInsertError) {
        adminMessage.textContent =
            `Resource saved, but additional materials failed: ${mediaInsertError.message}`
        return
    }
}
  const wasEditing = Boolean(editingResourceId)

adminMessage.textContent = wasEditing
    ? 'Resource updated successfully!'
    : 'Resource added successfully!'

editingResourceId = null
editingResourceMediaUrl = null
submitButton.textContent = 'Add Resource'

resourceForm.reset()
updateAdditionalMediaFields()
await loadResources()

})

logoutButton.addEventListener('click', async () => {
  await supabase.auth.signOut()
  window.location.href = '/login.html'
})

const resourcesList = document.querySelector('#resources-list')

async function loadResources() {
    const { data: resources, error } = await supabase
        .from('resources')
        .select('*, resource_media(*)')
        .order('id', { ascending: false })

    if (error) {
        resourcesList.textContent = `Could not load resources: ${error.message}`
        return
    }

    resourcesList.innerHTML = ''

    resources.forEach((resource) => {
        const card = document.createElement('article')
        card.className = 'saved-resource'

        const title = document.createElement('h3')
        title.textContent = resource.title

        const details = document.createElement('p')
        details.textContent = `${resource.platform || 'No Platform'} | ${resource.grade_level || 'No grade level'}`

        const actions = document.createElement('div')
        actions.className = 'saved-resource-actions'

        if (resource.resource_url) {
    const resourceLink = document.createElement('a')
    resourceLink.href = resource.resource_url
    resourceLink.target = '_blank'
    resourceLink.rel = 'noopener noreferrer'
    resourceLink.textContent = 'Open Resource'
    actions.append(resourceLink)
}

const mediaItems = resource.resource_media || []

mediaItems.forEach((mediaItem, index) => {
    const mediaLink = document.createElement('a')
    mediaLink.href = mediaItem.media_url
    mediaLink.target = '_blank'
    mediaLink.rel = 'noopener noreferrer'

    mediaLink.textContent = mediaItem.file_name
        ? `Open: ${mediaItem.file_name}`
        : mediaItems.length > 1
            ? `Open Additional Material ${index + 1}`
            : 'Open Additional Material'

    actions.append(mediaLink)
})
const editButton = document.createElement('button')
editButton.type = 'button'
editButton.textContent = 'Edit'

editButton.addEventListener('click', () => {
    editingResourceId = resource.id
    editingResourceMediaUrl = resource.media_url || null

    document.querySelector('#title').value = resource.title || ''
    document.querySelector('#platform').value = resource.platform || ''
    document.querySelector('#description').value = resource.description || ''
    document.querySelector('#category').value = resource.category || ''
    document.querySelector('#resource-url').value = resource.resource_url || ''
    document.querySelector('#image-url').value = resource.image_url || ''
    mediaTypeSelect.value = ''
document.querySelector('#grade-level').value = resource.grade_level || ''

mediaSourceSelect.value = ''
mediaUrlInput.value = ''
    

    mediaFileInput.value = ''
    updateAdditionalMediaFields()

    submitButton.textContent = 'Save Changes'
    resourceForm.scrollIntoView({ behavior: 'smooth', block: 'start' })
})

actions.append(editButton)
        const deleteButton = document.createElement('button')
        deleteButton.type = 'button'
        deleteButton.textContent = 'Delete'

        deleteButton.addEventListener('click', async () => {
            const confirmed = window.confirm(
                `Delete "${resource.title}"?`
            )

            if (!confirmed) return

            const { error: deleteError } = await supabase
                .from('resources')
                .delete()
                .eq('id', resource.id)

            if (deleteError) {
                adminMessage.textContent =
                    `Could not delete resource: ${deleteError.message}`
                return
            }

            adminMessage.textContent =
                'Resource deleted successfully!'

            await loadResources()
        })

        actions.append(deleteButton)
        card.append(title, details, actions)
        resourcesList.append(card)
        })
}

await loadResources()
}


