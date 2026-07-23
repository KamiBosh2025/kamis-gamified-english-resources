import { supabase } from './supabase.js'

const myList = document.querySelector('#my-demonstrations-list')
const externalList = document.querySelector('#external-demonstrations-list')

async function loadDemonstrations() {
  const { data, error } = await supabase
    .from('resources')
    .select(`
      id,
      title,
      description,
      resource_url,
      demonstration_type,
      resource_media (
        media_url,
        file_name,
        media_type
      )
    `)
    .not('demonstration_type', 'is', null)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Could not load demonstrations:', error)
    return
  }

  if (myList) {
    renderDemonstrations(
      myList,
      data.filter((resource) => resource.demonstration_type === 'my'),
    )
  }

  if (externalList) {
    renderDemonstrations(
      externalList,
      data.filter((resource) => resource.demonstration_type === 'external'),
    )
  }
}

function renderDemonstrations(container, resources) {
  container.innerHTML = ''

  resources.forEach((resource) => {
    const item = document.createElement('article')
    item.className = 'teaching-demo-container'

    const mediaItem = Array.isArray(resource.resource_media)
      ? resource.resource_media.find((media) => media.media_type === 'video')
      : null

    const mediaUrl = mediaItem?.media_url || resource.resource_url || ''

    item.innerHTML = `
      <div class="teaching-demo-heading">
        <h2>${resource.title}</h2>
        <p>${resource.description || ''}</p>
      </div>

      ${
        mediaUrl
          ? `
            <div class="teaching-demo-video">
              <video controls preload="metadata">
                <source src="${mediaUrl}" type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>

            <a
              href="${mediaUrl}"
              class="resource-button"
              target="_blank"
              rel="noopener noreferrer"
            >
              Open Demonstration
            </a>
          `
          : ''
      }
    `

    container.appendChild(item)
  })
}

loadDemonstrations()