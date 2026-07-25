import { supabase } from './supabase.js'

const resourceForm = document.querySelector('#resource-form')
const adminMessage = document.querySelector('#admin-message')
const adminProgress = document.querySelector('#admin-progress')
const adminProgressTrack = document.querySelector('#admin-progress-track')
const adminProgressBar = document.querySelector('#admin-progress-bar')
const adminProgressText = document.querySelector('#admin-progress-text')
const logoutButton = document.querySelector('#logout-button')
const mediaRoleSelect = document.querySelector('#media-role')
const mediaTypeSelect = document.querySelector('#media-type')
const demonstrationTypeSelect = document.querySelector('#demonstration-type')
const imageUrlInput = document.querySelector('#image-url')
const coverImageFileInput = document.querySelector('#cover-image-file')
const startGradeInput = document.querySelector('#start-grade')
const endGradeInput = document.querySelector('#end-grade')
const gradeAndAboveInput = document.querySelector('#grade-and-above')
const resourceLevelInput = document.querySelector('#resource-level')
const skillsTopicsInput = document.querySelector('#skills-topics')
const skillCheckboxes = [
  ...document.querySelectorAll(
    '#skills-checkboxes input[type="checkbox"]'
  ),
]
const otherSkillsInput = document.querySelector('#other-skills')
const detailsPageInput = document.querySelector('#details-page')
const mediaSourceSelect = document.querySelector('#media-source')
const additionalMediaFields = document.querySelector('#additional-media-fields')
const externalMediaField = document.querySelector('#external-media-field')
const uploadMediaField = document.querySelector('#upload-media-field')
const mediaUrlInput = document.querySelector('#media-url')
const mediaFileInput = document.querySelector('#media-file')
const mediaFolderInput = document.querySelector('#media-folder')
const selectedFilesSummary = document.querySelector('#selected-files-summary')
const resourcesList = document.querySelector('#resources-list')
const submitButton = resourceForm.querySelector('button[type="submit"]')

const ADMIN_ITEMS_PER_PAGE = 6
let adminCurrentPage = 1
let adminPaginationContainer = null

let progressHideTimer = null

function resetAdminProgress() {
  clearTimeout(progressHideTimer)
  adminProgress.hidden = true
  adminProgressBar.style.width = '0%'
  adminProgressTrack.setAttribute('aria-valuenow', '0')
  adminProgressText.textContent = 'Preparing...'
}

function setAdminProgress(percent, text) {
  clearTimeout(progressHideTimer)

  const safePercent = Math.max(
    0,
    Math.min(100, Number(percent) || 0)
  )

  adminProgress.hidden = false
  adminProgressBar.style.width = `${safePercent}%`
  adminProgressTrack.setAttribute(
    'aria-valuenow',
    String(safePercent)
  )
  adminProgressText.textContent = text
}

function finishAdminProgress(text) {
  setAdminProgress(100, text)
  progressHideTimer = setTimeout(resetAdminProgress, 1800)
}

function parseSkillsAndTopics(value) {
  const seen = new Set()

  return String(value ?? '')
    .split(/[,;·]+/)
    .map((item) => item.trim())
    .filter((item) => {
      if (!item) return false

      const key = item.toLowerCase()

      if (seen.has(key)) return false

      seen.add(key)
      return true
    })
}

function syncSkillsTopicsInput() {
  const selectedSkills = skillCheckboxes
    .filter((checkbox) => checkbox.checked)
    .map((checkbox) => checkbox.value)

  const otherSkills = parseSkillsAndTopics(
    otherSkillsInput.value
  )

  skillsTopicsInput.value = [
    ...selectedSkills,
    ...otherSkills,
  ].join(', ')
}

function populateSkillControls(skills) {
  const normalizedSkills = skills.map((skill) =>
    String(skill).trim().toLowerCase()
  )

  const standardSkillKeys = new Set(
    skillCheckboxes.map((checkbox) =>
      checkbox.value.toLowerCase()
    )
  )

  skillCheckboxes.forEach((checkbox) => {
    checkbox.checked = normalizedSkills.includes(
      checkbox.value.toLowerCase()
    )
  })

  otherSkillsInput.value = skills
    .filter(
      (skill) =>
        !standardSkillKeys.has(
          String(skill).trim().toLowerCase()
        )
    )
    .join(', ')

  syncSkillsTopicsInput()
}

skillCheckboxes.forEach((checkbox) => {
  checkbox.addEventListener(
    'change',
    syncSkillsTopicsInput
  )
})

otherSkillsInput.addEventListener(
  'input',
  syncSkillsTopicsInput
)

function formatGradeLabel(startGrade, endGrade, andAbove) {
  if (andAbove) {
    return `Grade ${startGrade} and above`
  }

  if (endGrade && endGrade !== startGrade) {
    return `Grades ${startGrade} - ${endGrade}`
  }

  return `Grade ${startGrade}`
}

function gradeRangeOverlaps(
  startGrade,
  endGrade,
  andAbove,
  minimum,
  maximum
) {
  const resolvedEnd = andAbove
    ? 12
    : endGrade || startGrade

  return startGrade <= maximum && resolvedEnd >= minimum
}

function buildAutomaticFilterGroup(
  startGrade,
  endGrade,
  andAbove,
  skills,
  category
) {
  const tags = []

  if (
    gradeRangeOverlaps(
      startGrade,
      endGrade,
      andAbove,
      1,
      4
    )
  ) {
    tags.push('primary')
  }

  if (
    gradeRangeOverlaps(
      startGrade,
      endGrade,
      andAbove,
      5,
      7
    )
  ) {
    tags.push('lower-secondary')
  }

  if (
    skills.length > 1 ||
    String(category ?? '')
      .toLowerCase()
      .includes('mixed')
  ) {
    tags.push('mixed-skills')
  }

  return tags.join(' ')
}

function updateGradeRangeControls() {
  const andAbove = gradeAndAboveInput.checked

  endGradeInput.disabled = andAbove

  if (andAbove) {
    endGradeInput.value = ''
  }
}

function parseSavedGradeLevel(value) {
  const text = String(value ?? '').trim()
  const numbers = text.match(/\d+/g)?.map(Number) || []
  const andAbove = /and\s+above|\+/i.test(text)

  return {
    startGrade: numbers[0] || '',
    endGrade: andAbove ? '' : numbers[1] || '',
    andAbove,
  }
}

function parseSavedMetaText(metaText, gradeLevel) {
  const parts = String(metaText ?? '')
    .split('·')
    .map((item) => item.trim())
    .filter(Boolean)

  if (
    parts.length > 0 &&
    parts[0].toLowerCase() ===
      String(gradeLevel ?? '').trim().toLowerCase()
  ) {
    parts.shift()
  }

  let level = ''

  if (
    parts.length > 0 &&
    /^[ABC][12](?:\s*[-–]\s*[ABC][12])?$/i.test(parts[0])
  ) {
    level = parts.shift()
  }

  if (!level) {
    const savedLevelMatch = String(gradeLevel ?? '').match(
      /\(([ABC][12](?:\s*[-–]\s*[ABC][12])?)\)/i
    )

    if (savedLevelMatch) {
      level = savedLevelMatch[1]
        .replace(/[–—]/g, '-')
        .replace(/\s+/g, '')
    }
  }

  return {
    level,
    skills: parts,
  }
}

async function getNextDisplayOrder() {
  const { data, error } = await supabase
    .from('resources')
    .select('display_order')
    .not('display_order', 'is', null)
    .order('display_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw new Error(
      `Could not determine display order: ${error.message}`
    )
  }

  return Number.isInteger(data?.display_order)
    ? data.display_order + 1
    : 1
}

gradeAndAboveInput.addEventListener(
  'change',
  updateGradeRangeControls
)

updateGradeRangeControls()

const ACCEPT_BY_TYPE = {
  image: 'image/*',
  video:
    'video/*,.mp4,.webm,.mov,.avi,.mkv,.mpeg,.mpg,.m4v,.wmv,.flv,.3gp,.3g2,.ogv,.ts,.mts,.m2ts,.vob,.asf,.rm,.rmvb',
  audio:
    'audio/*,.mp3,.wav,.m4a,.aac,.ogg,.oga,.flac,.wma,.opus,.aiff,.aif,.mid,.midi',
  document:
    '.pdf,.txt,.rtf,.doc,.docx,.odt,.xls,.xlsx,.ods,.csv,.epub,.mobi,.azw,.azw3',
  presentation:
    '.ppt,.pptx,.pps,.ppsx,.odp,.key,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation',
  collection: ''
}

const PRESENTATION_EXTENSIONS = new Set([
  'ppt',
  'pptx',
  'pps',
  'ppsx',
  'odp',
  'key'
])

const VIDEO_EXTENSIONS = new Set([
  'mp4',
  'webm',
  'mov',
  'avi',
  'mkv',
  'mpeg',
  'mpg',
  'm4v',
  'wmv',
  'flv',
  '3gp',
  '3g2',
  'ogv',
  'ts',
  'mts',
  'm2ts',
  'vob',
  'asf',
  'rm',
  'rmvb'
])

const AUDIO_EXTENSIONS = new Set([
  'mp3',
  'wav',
  'm4a',
  'aac',
  'ogg',
  'oga',
  'flac',
  'wma',
  'opus',
  'aiff',
  'aif',
  'mid',
  'midi'
])

const IMAGE_EXTENSIONS = new Set([
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
  'svg',
  'bmp',
  'tif',
  'tiff',
  'avif',
  'ico'
])

let editingResourceId = null
let editingExistingDisplayOrder = null
let editingExistingMediaItems = []
let editingExistingCoverImageUrl = ''

coverImageFileInput.addEventListener('change', () => {
  if (coverImageFileInput.files?.length) {
    imageUrlInput.value = ''
  }
})

imageUrlInput.addEventListener('input', () => {
  if (imageUrlInput.value.trim()) {
    coverImageFileInput.value = ''
  }
})

function getExtension(fileName) {
  const parts = fileName.toLowerCase().split('.')
  return parts.length > 1 ? parts.pop() : ''
}

function detectMediaType(file) {
  const extension = getExtension(file.name)

  if (file.type.startsWith('image/') || IMAGE_EXTENSIONS.has(extension)) {
    return 'image'
  }

  if (file.type.startsWith('video/') || VIDEO_EXTENSIONS.has(extension)) {
    return 'video'
  }

  if (file.type.startsWith('audio/') || AUDIO_EXTENSIONS.has(extension)) {
    return 'audio'
  }

  if (PRESENTATION_EXTENSIONS.has(extension)) {
    return 'presentation'
  }

  return 'document'
}

function sanitizePathSegment(value) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'file'
}

function buildStoragePath(userId, batchId, file) {
  const relativePath = file.webkitRelativePath || file.name
  const safeRelativePath = relativePath
    .split('/')
    .filter(Boolean)
    .map(sanitizePathSegment)
    .join('/')

  return `${userId}/${batchId}/${safeRelativePath}`
}

function getSelectedFiles() {
  const files = [
    ...Array.from(mediaFileInput.files || []),
    ...Array.from(mediaFolderInput.files || [])
  ]

  const seen = new Set()

  return files.filter((file) => {
    const relativePath = file.webkitRelativePath || file.name
    const key = `${relativePath}|${file.size}|${file.lastModified}`

    if (seen.has(key)) {
      return false
    }

    seen.add(key)
    return true
  })
}

function updateSelectedFilesSummary() {
  const files = getSelectedFiles()

  if (files.length === 0) {
    selectedFilesSummary.textContent = 'No files selected.'
    return
  }

  const totalBytes = files.reduce((sum, file) => sum + file.size, 0)
  const totalMegabytes = (totalBytes / (1024 * 1024)).toFixed(2)

  selectedFilesSummary.textContent =
    `${files.length} file(s) selected — ${totalMegabytes} MB total.`
}

function updateAcceptedFileTypes() {
  const acceptedTypes = ACCEPT_BY_TYPE[mediaTypeSelect.value] ?? ''

  mediaFileInput.accept = acceptedTypes
  mediaFolderInput.accept = acceptedTypes
}

function clearUploadSelections() {
  mediaFileInput.value = ''
  mediaFolderInput.value = ''
  updateSelectedFilesSummary()
}

function updateAdditionalMediaFields() {
  const hasAdditionalMedia = Boolean(mediaTypeSelect.value)

  additionalMediaFields.hidden = !hasAdditionalMedia
  updateAcceptedFileTypes()

  if (!hasAdditionalMedia) {
    mediaSourceSelect.value = ''
    mediaUrlInput.value = ''
    clearUploadSelections()
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
    clearUploadSelections()
  }
}

mediaTypeSelect.addEventListener('change', updateAdditionalMediaFields)
mediaSourceSelect.addEventListener('change', updateAdditionalMediaFields)
mediaFileInput.addEventListener('change', updateSelectedFilesSummary)
mediaFolderInput.addEventListener('change', updateSelectedFilesSummary)

mediaRoleSelect.value = mediaRoleSelect.value || 'main'
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

  resourceForm.addEventListener('submit', async (event) => {
    event.preventDefault()

    adminMessage.textContent = ''

    setAdminProgress(
      8,
      editingResourceId
        ? 'Preparing resource changes...'
        : 'Preparing new resource...'
    )

    submitButton.disabled = true

    try {
      const mediaRole = mediaRoleSelect.value || 'main'
      const mediaType = mediaTypeSelect.value
      const mediaSource = mediaSourceSelect.value
      const demonstrationType = demonstrationTypeSelect.value
      const mediaFiles = getSelectedFiles()
      const externalMediaUrl = mediaUrlInput.value.trim()
      const mainResourceUrl =
        document.querySelector('#resource-url').value.trim()
      const coverImageFile = coverImageFileInput.files?.[0] || null
      const coverImageUrl = imageUrlInput.value.trim()

      if (coverImageFile && coverImageUrl) {
        throw new Error(
          'Choose either a cover image URL or a cover image file, not both.'
        )
      }

      if (
        coverImageFile &&
        detectMediaType(coverImageFile) !== 'image'
      ) {
        throw new Error('The selected cover file must be an image.')
      }

      if (mediaType && !mediaSource) {
        throw new Error('Please choose a file source.')
      }

      if (mediaType && mediaRole === 'main' && mainResourceUrl) {
        throw new Error(
          'Choose only one main source: either Main Resource URL or Main Resource Content.'
        )
      }

      if (mediaType && mediaRole === 'additional' && !mainResourceUrl) {
        throw new Error(
          'Additional Media requires a Main Resource URL. Otherwise choose Main Resource Content.'
        )
      }

      if (mediaSource === 'upload' && !mediaType) {
        throw new Error('Please choose a media type.')
      }

      if (mediaSource === 'external' && !externalMediaUrl) {
        throw new Error('Please enter an external media URL.')
      }

      const keepsExistingUploadedMedia =
        Boolean(editingResourceId) &&
        editingExistingMediaItems.some((item) => item.file_name) &&
        mediaSource === 'upload' &&
        mediaFiles.length === 0

      if (
        mediaSource === 'upload' &&
        mediaFiles.length === 0 &&
        !keepsExistingUploadedMedia
      ) {
        throw new Error('Please choose one or more files, or a whole folder.')
      }

      let resolvedCoverImageUrl = coverImageUrl || null
      let uploadedCoverStoragePath = null

      if (coverImageFile) {
        setAdminProgress(
          25,
          `Uploading cover image: ${coverImageFile.name}`
        )

        const coverBatchId = `cover-${crypto.randomUUID()}`
        uploadedCoverStoragePath = buildStoragePath(
          user.id,
          coverBatchId,
          coverImageFile
        )

        const { error: coverUploadError } = await supabase.storage
          .from('resource-media')
          .upload(uploadedCoverStoragePath, coverImageFile, {
            cacheControl: '3600',
            upsert: false,
            contentType: coverImageFile.type || undefined
          })

        if (coverUploadError) {
          throw new Error(
            `Could not upload cover image: ${coverUploadError.message}`
          )
        }

        setAdminProgress(
          55,
          'Cover image uploaded. Preparing resource record...'
        )

        const { data: coverPublicUrlData } = supabase.storage
          .from('resource-media')
          .getPublicUrl(uploadedCoverStoragePath)

        resolvedCoverImageUrl = coverPublicUrlData.publicUrl
      }

      const startGrade = Number.parseInt(
        startGradeInput.value,
        10
      )

      const endGrade =
        endGradeInput.value === ''
          ? null
          : Number.parseInt(endGradeInput.value, 10)

      const gradeAndAbove = gradeAndAboveInput.checked

      if (
        !Number.isInteger(startGrade) ||
        startGrade < 1 ||
        startGrade > 12
      ) {
        throw new Error(
          'Start Grade must be a number from 1 to 12.'
        )
      }

      if (
        endGrade !== null &&
        (
          !Number.isInteger(endGrade) ||
          endGrade < 1 ||
          endGrade > 12
        )
      ) {
        throw new Error(
          'End Grade must be a number from 1 to 12.'
        )
      }

      if (
        endGrade !== null &&
        endGrade < startGrade
      ) {
        throw new Error(
          'End Grade cannot be lower than Start Grade.'
        )
      }

      const generatedGradeLevel = formatGradeLabel(
        startGrade,
        endGrade,
        gradeAndAbove
      )

      const resourceLevel =
        resourceLevelInput.value.trim()

      syncSkillsTopicsInput()

      const skillsAndTopics = parseSkillsAndTopics(
        skillsTopicsInput.value
      )

      if (skillsAndTopics.length === 0) {
        throw new Error(
          'Enter at least one skill or topic.'
        )
      }

      const categoryValue =
        document.querySelector('#category').value.trim()

      const generatedMetaText = [
        generatedGradeLevel,
        resourceLevel,
        ...skillsAndTopics,
      ]
        .filter(Boolean)
        .join(' · ')

      const generatedFilterGroup =
        buildAutomaticFilterGroup(
          startGrade,
          endGrade,
          gradeAndAbove,
          skillsAndTopics,
          categoryValue
        )

      const resolvedDisplayOrder =
        editingResourceId &&
        editingExistingDisplayOrder !== null
          ? editingExistingDisplayOrder
          : await getNextDisplayOrder()

      const newResource = {
        title: document.querySelector('#title').value.trim(),
        platform: document.querySelector('#platform').value.trim(),
        description: document.querySelector('#description').value.trim(),
        category: categoryValue,
        demonstration_type: demonstrationType || null,
        resource_url: mainResourceUrl || null,
        image_url: resolvedCoverImageUrl,
        grade_level: generatedGradeLevel,
        meta_text: generatedMetaText,
        details_page: detailsPageInput.value.trim() || null,
        filter_group: generatedFilterGroup || null,
        display_order: resolvedDisplayOrder,
        created_by: user.id,
      }

      setAdminProgress(
        65,
        editingResourceId
          ? 'Saving resource changes...'
          : 'Saving resource...'
      )

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

      const { data: savedResource, error: saveError } = saveResult

      if (saveError) {
        if (uploadedCoverStoragePath) {
          await supabase.storage
            .from('resource-media')
            .remove([uploadedCoverStoragePath])
        }

        throw new Error(`Could not save resource: ${saveError.message}`)
      }

      setAdminProgress(
        82,
        'Resource saved. Finishing remaining steps...'
      )

      const previousCoverStoragePath = getStoragePath({
        media_url: editingExistingCoverImageUrl
      })

      if (
        previousCoverStoragePath &&
        previousCoverStoragePath !== uploadedCoverStoragePath &&
        editingExistingCoverImageUrl !== resolvedCoverImageUrl
      ) {
        const { error: oldCoverDeleteError } = await supabase.storage
          .from('resource-media')
          .remove([previousCoverStoragePath])

        if (oldCoverDeleteError) {
          console.warn(
            'The previous cover image could not be removed:',
            oldCoverDeleteError.message
          )
        }
      }

      const pendingMediaItems = []
      const isEditing = Boolean(editingResourceId)
      const removesExistingMedia = isEditing && !mediaType
      const replacesExistingMedia =
        isEditing &&
        (
          mediaSource === 'external' ||
          (mediaSource === 'upload' && mediaFiles.length > 0)
        )

      if (removesExistingMedia || replacesExistingMedia) {
        const { error: mediaDeleteError } = await supabase
          .from('resource_media')
          .delete()
          .eq('resource_id', savedResource.id)

        if (mediaDeleteError) {
          throw new Error(
            `Could not update additional materials: ${mediaDeleteError.message}`
          )
        }
      }

      if (
        keepsExistingUploadedMedia &&
        !removesExistingMedia &&
        !replacesExistingMedia
      ) {
        const { error: mediaMetadataError } = await supabase
          .from('resource_media')
          .update({
            media_role: mediaRole,
            media_type: mediaType
          })
          .eq('resource_id', savedResource.id)

        if (mediaMetadataError) {
          throw new Error(
            `Could not update file settings: ${mediaMetadataError.message}`
          )
        }
      }

      if (mediaSource === 'external') {
        pendingMediaItems.push({
          media_role: mediaRole,
          media_type: mediaType,
          media_url: externalMediaUrl,
          file_name: null,
          storage_path: null
        })
      }

      if (mediaSource === 'upload') {
        const batchId = crypto.randomUUID()

        for (let index = 0; index < mediaFiles.length; index += 1) {
          const mediaFile = mediaFiles[index]

          const mediaProgress =
            82 +
            Math.round(
              ((index + 1) / mediaFiles.length) * 12
            )

          setAdminProgress(
            mediaProgress,
            `Uploading ${index + 1} of ${mediaFiles.length}: ${mediaFile.name}`
          )

          const storedFileName = buildStoragePath(
            user.id,
            batchId,
            mediaFile
          )

          const { error: uploadError } = await supabase.storage
            .from('resource-media')
            .upload(storedFileName, mediaFile, {
              cacheControl: '3600',
              upsert: false,
              contentType: mediaFile.type || undefined
            })

          if (uploadError) {
            throw new Error(
              `Could not upload "${mediaFile.name}": ${uploadError.message}`
            )
          }

          const { data: publicUrlData } = supabase.storage
            .from('resource-media')
            .getPublicUrl(storedFileName)

          pendingMediaItems.push({
            media_role: mediaRole,
            media_type: detectMediaType(mediaFile),
            media_url: publicUrlData.publicUrl,
            file_name: mediaFile.webkitRelativePath || mediaFile.name,
            storage_path: storedFileName
          })
        }
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
          throw new Error(
            `Resource saved, but media records failed: ${mediaInsertError.message}`
          )
        }
      }

      const wasEditing = Boolean(editingResourceId)

      adminMessage.textContent = wasEditing
        ? 'Resource updated successfully!'
        : 'Resource added successfully!'

      finishAdminProgress(
        wasEditing
          ? 'Resource update completed.'
          : 'Resource upload and save completed.'
      )

      editingResourceId = null
      editingExistingDisplayOrder = null
      editingExistingCoverImageUrl = ''
      editingExistingMediaItems = []
      submitButton.textContent = 'Add Resource'

      resourceForm.reset()
      editingExistingDisplayOrder = null
      mediaRoleSelect.value = 'main'
      syncSkillsTopicsInput()
      updateGradeRangeControls()
      updateAdditionalMediaFields()
      await loadResources()
    } catch (error) {
    resetAdminProgress()
      adminMessage.textContent = error.message
    } finally {
      submitButton.disabled = false
    }
  })

  logoutButton.addEventListener('click', async () => {
    await supabase.auth.signOut()
    window.location.href = '/login.html'
  })



function isExternalAppUrl(url) {
  try {
    const host = new URL(url, window.location.origin).hostname.toLowerCase()
    return ['gamma.app', 'youtube.com', 'youtu.be', 'kahoot.it', 'wordwall.net', 'docs.google.com', 'drive.google.com']
      .some((domain) => host === domain || host.endsWith(`.${domain}`))
  } catch {
    return false
  }
}

function isDirectFileMedia(mediaItem) {
  const url = String(mediaItem?.media_url || '')
  if (!url || isExternalAppUrl(url)) return false

  const fileName = String(mediaItem?.file_name || '')
  const path = (() => {
    try { return decodeURIComponent(new URL(url, window.location.origin).pathname) }
    catch { return url }
  })()

  return /\.(pdf|ppt|pptx|pps|ppsx|odp|key|doc|docx|mp3|wav|m4a|aac|ogg|flac|opus|mp4|webm|mov|avi|mkv|jpg|jpeg|png|gif|webp|svg|zip)(?:$|[?#])/i.test(path) ||
    (path.includes('/storage/v1/object/') && /\.[a-z0-9]+$/i.test(fileName))
}

function getPresentationOpenUrl(mediaItem) {
  return isDirectFileMedia(mediaItem)
    ? getOfficeViewerUrl(mediaItem.media_url)
    : mediaItem.media_url
}

function ensureAdminPagination() {
  if (adminPaginationContainer) return adminPaginationContainer
  adminPaginationContainer = document.createElement('nav')
  adminPaginationContainer.className = 'pagination-controls'
  adminPaginationContainer.setAttribute('aria-label', 'Admin resource pages')
  resourcesList.insertAdjacentElement('afterend', adminPaginationContainer)
  return adminPaginationContainer
}

function renderAdminPagination(cards) {
  const totalPages = Math.max(1, Math.ceil(cards.length / ADMIN_ITEMS_PER_PAGE))
  adminCurrentPage = Math.min(Math.max(adminCurrentPage, 1), totalPages)

  cards.forEach((card) => { card.hidden = true })
  const start = (adminCurrentPage - 1) * ADMIN_ITEMS_PER_PAGE
  cards.slice(start, start + ADMIN_ITEMS_PER_PAGE).forEach((card) => { card.hidden = false })

  const pagination = ensureAdminPagination()
  pagination.replaceChildren()
  if (totalPages <= 1) {
    pagination.hidden = true
    return
  }
  pagination.hidden = false

  const previous = document.createElement('button')
  previous.type = 'button'
  previous.className = 'pagination-button'
  previous.textContent = 'Previous'
  previous.disabled = adminCurrentPage === 1
  previous.addEventListener('click', () => {
    adminCurrentPage -= 1
    renderAdminPagination(cards)
    resourcesList.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })

  const status = document.createElement('span')
  status.className = 'pagination-status'
  status.textContent = `Page ${adminCurrentPage} of ${totalPages}`

  const next = document.createElement('button')
  next.type = 'button'
  next.className = 'pagination-button'
  next.textContent = 'Next'
  next.disabled = adminCurrentPage === totalPages
  next.addEventListener('click', () => {
    adminCurrentPage += 1
    renderAdminPagination(cards)
    resourcesList.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })

  pagination.append(previous, status, next)
}

function isPresentationMedia(mediaItem) {
  const fileName = String(mediaItem?.file_name || '').toLowerCase()
  const mediaType = String(mediaItem?.media_type || '').toLowerCase()

  return (
    mediaType === 'presentation' ||
    /\.(ppt|pptx|pps|ppsx|odp|key)$/.test(fileName)
  )
}

function getOfficeViewerUrl(fileUrl) {
  return `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(fileUrl)}`
}

function createMediaActionLink(label, url, download = false) {
  const link = document.createElement('a')
  link.href = url
  link.target = '_blank'
  link.rel = 'noopener noreferrer'
  link.textContent = label

  if (download) {
    link.setAttribute('download', '')
  }

  return link
}

function getTopLevelFolderName(mediaItems) {
  const folderNames = mediaItems
    .map((item) => String(item?.file_name || '').split('/').filter(Boolean))
    .filter((parts) => parts.length > 1)
    .map((parts) => parts[0])

  if (folderNames.length === 0) {
    return null
  }

  const firstFolder = folderNames[0]
  return folderNames.every((folder) => folder === firstFolder)
    ? firstFolder
    : 'Uploaded Folder'
}

function getDisplayFileName(fileName) {
  const parts = String(fileName || '').split('/').filter(Boolean)
  return parts.length > 0 ? parts[parts.length - 1] : 'Open file'
}

function getStoragePath(mediaItem) {
  if (mediaItem?.storage_path) {
    return mediaItem.storage_path
  }

  const publicMarker = '/storage/v1/object/public/resource-media/'
  const mediaUrl = String(mediaItem?.media_url || '')
  const markerIndex = mediaUrl.indexOf(publicMarker)

  if (markerIndex === -1) {
    return null
  }

  return decodeURIComponent(
    mediaUrl.slice(markerIndex + publicMarker.length)
  )
}

function createFolderMediaGroup(mediaItems, onDeleteFile) {
  const folderName = getTopLevelFolderName(mediaItems)

  if (!folderName || mediaItems.length < 2) {
    return null
  }

  const folder = document.createElement('details')
  folder.className = 'media-folder-group'
  folder.style.width = '100%'
  folder.style.flex = '1 1 100%'
  folder.style.minWidth = '0'
  folder.style.boxSizing = 'border-box'
  folder.style.margin = '0.5rem 0'

  const summary = document.createElement('summary')
  summary.textContent = `📁 ${folderName} — ${mediaItems.length} files`
  summary.style.cursor = 'pointer'
  summary.style.fontWeight = '700'
  summary.style.padding = '0.85rem 1rem'
  summary.style.border = '2px solid #7c3aed'
  summary.style.borderRadius = '12px'
  summary.style.background = '#f5f0ff'
  summary.style.color = '#3b1f75'
  summary.style.overflowWrap = 'anywhere'

  const fileList = document.createElement('div')
  fileList.className = 'media-folder-files'
  fileList.style.display = 'grid'
  fileList.style.gridTemplateColumns = 'repeat(auto-fit, minmax(220px, 1fr))'
  fileList.style.gap = '0.6rem'
  fileList.style.padding = '0.8rem 0'

  mediaItems.forEach((mediaItem, index) => {
    const fileName = getDisplayFileName(mediaItem.file_name)
    const extension = getExtension(fileName)
    const isPresentation = isPresentationMedia(mediaItem)

    const fileRow = document.createElement('div')
    fileRow.style.display = 'flex'
    fileRow.style.flexDirection = 'column'
    fileRow.style.gap = '0.4rem'
    fileRow.style.minWidth = '0'
    fileRow.style.padding = '0.75rem'
    fileRow.style.border = '1px solid #d8c9ff'
    fileRow.style.borderRadius = '10px'
    fileRow.style.background = '#ffffff'

    const fileLabel = document.createElement('span')
    fileLabel.textContent = `${index + 1}. ${fileName}`
    fileLabel.style.fontWeight = '600'
    fileLabel.style.overflowWrap = 'anywhere'
    fileLabel.style.wordBreak = 'break-word'

    const fileActions = document.createElement('div')
    fileActions.style.display = 'flex'
    fileActions.style.flexWrap = 'wrap'
    fileActions.style.gap = '0.4rem'

    if (isPresentation) {
      fileActions.append(
        createMediaActionLink(
          'View Online',
          getPresentationOpenUrl(mediaItem)
        )
      )

      if (isDirectFileMedia(mediaItem)) {
        fileActions.append(
          createMediaActionLink(
            'Download',
            mediaItem.media_url,
            true
          )
        )
      }
    } else {
      const actionLabel = AUDIO_EXTENSIONS.has(extension)
        ? 'Play Audio'
        : VIDEO_EXTENSIONS.has(extension)
          ? 'Open Video'
          : IMAGE_EXTENSIONS.has(extension)
            ? 'Open Image'
            : 'Open File'

      fileActions.append(
        createMediaActionLink(actionLabel, mediaItem.media_url)
      )
    }

    const deleteFileButton = document.createElement('button')
    deleteFileButton.type = 'button'
    deleteFileButton.textContent = '🗑'
    deleteFileButton.title = 'Delete File'
    deleteFileButton.setAttribute('aria-label', `Delete ${fileName}`)
    deleteFileButton.style.minWidth = '44px'
    deleteFileButton.style.padding = '0.65rem 0.8rem'
    deleteFileButton.addEventListener('click', async () => {
      await onDeleteFile(mediaItem, fileName)
    })

    fileActions.append(deleteFileButton)
    fileRow.append(fileLabel, fileActions)
    fileList.append(fileRow)
  })

  folder.append(summary, fileList)
  return folder
}

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
    adminCurrentPage = 1
    const renderedCards = []

    resources.forEach((resource) => {
      const card = document.createElement('article')
      card.className = 'saved-resource'

      const title = document.createElement('h3')
      title.textContent = resource.title

      const details = document.createElement('p')
      details.textContent =
        `${resource.platform || 'No Platform'} | ` +
        `${resource.meta_text || resource.grade_level || 'No grade level'}`

      const actions = document.createElement('div')
      actions.className = 'saved-resource-actions'
      actions.style.display = 'flex'
      actions.style.flexWrap = 'wrap'
      actions.style.alignItems = 'flex-start'
      actions.style.gap = '0.75rem'
      actions.style.width = '100%'

      if (resource.resource_url) {
        const resourceLink = document.createElement('a')
        resourceLink.href = resource.resource_url
        resourceLink.target = '_blank'
        resourceLink.rel = 'noopener noreferrer'
        resourceLink.textContent = 'Open Resource'
        actions.append(resourceLink)
      }

      const mediaItems = resource.resource_media || []
      const folderMediaGroup = createFolderMediaGroup(
        mediaItems,
        async (mediaItem, fileName) => {
          const confirmed = window.confirm(
            `Delete only "${fileName}" from this folder?`
          )

          if (!confirmed) {
            return
          }

          adminMessage.textContent = `Deleting "${fileName}"...`

          const storagePath = getStoragePath(mediaItem)

          if (storagePath) {
            const { error: storageDeleteError } = await supabase.storage
              .from('resource-media')
              .remove([storagePath])

            if (storageDeleteError) {
              adminMessage.textContent =
                `Could not delete file from Storage: ${storageDeleteError.message}`
              return
            }
          }

          const { error: mediaDeleteError } = await supabase
            .from('resource_media')
            .delete()
            .eq('id', mediaItem.id)

          if (mediaDeleteError) {
            adminMessage.textContent =
              `Could not delete file record: ${mediaDeleteError.message}`
            return
          }

          adminMessage.textContent = 'File deleted successfully!'
          await loadResources()
        }
      )

      if (folderMediaGroup) {
        actions.append(folderMediaGroup)
      } else {
        mediaItems.forEach((mediaItem, index) => {
          if (isPresentationMedia(mediaItem)) {
            actions.append(
              createMediaActionLink(
                'View Presentation Online',
                getPresentationOpenUrl(mediaItem)
              )
            )

            if (isDirectFileMedia(mediaItem)) {
              actions.append(
                createMediaActionLink(
                  'Download Presentation',
                  mediaItem.media_url,
                  true
                )
              )
            }

            return
          }

          const label = mediaItem.file_name
            ? `Open: ${getDisplayFileName(mediaItem.file_name)}`
            : mediaItems.length > 1
              ? `Open Additional Material ${index + 1}`
              : 'Open Additional Material'

          actions.append(
            createMediaActionLink(label, mediaItem.media_url)
          )
        })
      }

      const editButton = document.createElement('button')
      editButton.type = 'button'
      editButton.textContent = 'Edit'
      editButton.style.alignSelf = 'flex-start'
      editButton.style.flex = '0 0 auto'
      editButton.style.height = 'auto'

      editButton.addEventListener('click', () => {
        editingResourceId = resource.id
        editingExistingMediaItems = Array.isArray(resource.resource_media)
          ? resource.resource_media
          : resource.resource_media
            ? [resource.resource_media]
            : []

        document.querySelector('#title').value = resource.title || ''
        document.querySelector('#platform').value = resource.platform || ''
        document.querySelector('#description').value =
          resource.description || ''
        document.querySelector('#category').value = resource.category || ''
        document.querySelector('#resource-url').value =
          resource.resource_url || ''
        editingExistingCoverImageUrl = resource.image_url || ''
        imageUrlInput.value = editingExistingCoverImageUrl
        coverImageFileInput.value = ''
        const savedGrade = parseSavedGradeLevel(
          resource.grade_level
        )

        startGradeInput.value = savedGrade.startGrade
        endGradeInput.value = savedGrade.endGrade
        gradeAndAboveInput.checked = savedGrade.andAbove
        updateGradeRangeControls()

        const savedMeta = parseSavedMetaText(
          resource.meta_text,
          resource.grade_level
        )

        resourceLevelInput.value = savedMeta.level

        const skillsForEdit =
          savedMeta.skills.length > 0
            ? savedMeta.skills
            : resource.category
              ? [resource.category]
              : []

        populateSkillControls(skillsForEdit)

        detailsPageInput.value =
          resource.details_page || ''

        editingExistingDisplayOrder =
          resource.display_order ?? null

        demonstrationTypeSelect.value =
          resource.demonstration_type || ''

        const firstMediaItem = editingExistingMediaItems[0]

        if (firstMediaItem) {
          mediaRoleSelect.value =
            firstMediaItem.media_role ||
            (resource.resource_url ? 'additional' : 'main')
          mediaTypeSelect.value = firstMediaItem.media_type || 'document'

          if (firstMediaItem.file_name) {
            mediaSourceSelect.value = 'upload'
            mediaUrlInput.value = ''
          } else {
            mediaSourceSelect.value = 'external'
            mediaUrlInput.value = firstMediaItem.media_url || ''
          }
        } else {
          mediaRoleSelect.value = 'main'
          mediaTypeSelect.value = ''
          mediaSourceSelect.value = ''
          mediaUrlInput.value = ''
        }

        clearUploadSelections()
        updateAdditionalMediaFields()

        submitButton.textContent = 'Save Changes'
        resourceForm.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        })
      })

      actions.append(editButton)

      const deleteButton = document.createElement('button')
      deleteButton.type = 'button'
      deleteButton.textContent = 'Delete Entire Resource'
      deleteButton.style.alignSelf = 'flex-start'
      deleteButton.style.flex = '0 0 auto'
      deleteButton.style.height = 'auto'

      deleteButton.addEventListener('click', async () => {
        const confirmed = window.confirm(`Delete "${resource.title}"?`)

        if (!confirmed) {
          return
        }

        const coverStoragePath = getStoragePath({
          media_url: resource.image_url
        })

        const storagePaths = [
          ...(resource.resource_media || []).map(getStoragePath),
          coverStoragePath
        ].filter(Boolean)

        if (storagePaths.length > 0) {
          adminMessage.textContent =
            `Deleting ${storagePaths.length} uploaded file(s)...`

          const { error: storageDeleteError } = await supabase.storage
            .from('resource-media')
            .remove(storagePaths)

          if (storageDeleteError) {
            adminMessage.textContent =
              `Could not delete uploaded files: ${storageDeleteError.message}`
            return
          }
        }

        const { error: deleteError } = await supabase
          .from('resources')
          .delete()
          .eq('id', resource.id)

        if (deleteError) {
          adminMessage.textContent =
            `Could not delete resource: ${deleteError.message}`
          return
        }

        adminMessage.textContent = 'Resource and uploaded files deleted successfully!'
        await loadResources()
      })

      actions.append(deleteButton)
      card.append(title, details, actions)
      resourcesList.append(card)
      renderedCards.push(card)
    })

    renderAdminPagination(renderedCards)
  }

  await loadResources()
}
