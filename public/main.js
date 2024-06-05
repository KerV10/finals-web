const socket = io()

const clientsTotal = document.getElementById('users-total')
const messageContainer = document.getElementById('message-container')
const nameInput = document.getElementById('name-input')
const messageForm = document.getElementById('message-form')
const messageInput = document.getElementById('message-input')
const fileInput = document.getElementById('file-input')
const fileButton = document.getElementById('file-button')
const recordButton = document.getElementById('record-button')
const imagePreviewContainer = document.getElementById('image-preview-container')
const imagePreview = document.getElementById('image-preview')
const cancelPreviewButton = document.getElementById('cancel-preview-button')
const messageTone = new Audio('/chat tone.mp3')

let mediaRecorder
let audioChunks = []
let startTime
let maxDurationTimeout

messageForm.addEventListener('submit', (e) => {
  e.preventDefault()
  if (fileInput.files.length > 0) {
    sendFile()
  } else {
    sendMessage()
  }
})

fileButton.addEventListener('click', () => {
  fileInput.click()
})

fileInput.addEventListener('change', () => {
  if (fileInput.files && fileInput.files[0]) {
    const file = fileInput.files[0]
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (e) => {
        imagePreview.src = e.target.result
        imagePreviewContainer.style.display = 'block'
      }
      reader.readAsDataURL(file)
    }
  }
})

cancelPreviewButton.addEventListener('click', () => {
  imagePreviewContainer.style.display = 'none'
  fileInput.value = ''
})

recordButton.addEventListener('mousedown', startRecording)
recordButton.addEventListener('mouseup', stopRecording)
recordButton.addEventListener('touchstart', startRecording)
recordButton.addEventListener('touchend', stopRecording)

socket.on('users-total', (data) => {
  clientsTotal.innerText = `Total users: ${data}`
})

function startRecording() {
  navigator.mediaDevices.getUserMedia({ audio: true })
    .then(stream => {
      mediaRecorder = new MediaRecorder(stream)
      mediaRecorder.start()
      startTime = Date.now()
      audioChunks = []

      mediaRecorder.ondataavailable = event => {
        audioChunks.push(event.data)
      }

      maxDurationTimeout = setTimeout(() => {
        stopRecording()
      }, 60000) 
    })
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    const duration = (Date.now() - startTime) / 1000
    if (duration < 2) {
      alert('Recording is too short. Minimum duration is 2 seconds.')
      clearTimeout(maxDurationTimeout)
      return
    }
    mediaRecorder.stop()
    mediaRecorder.onstop = () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/wav' })
      const reader = new FileReader()
      reader.onload = function () {
        const data = {
          name: nameInput.value,
          audio: reader.result,
          dateTime: new Date(),
        }
        console.log('Sending audio data:', data) 
        socket.emit('audio', data)
        addAudioToUI(true, data)
      }
      reader.readAsDataURL(audioBlob)
    }
    clearTimeout(maxDurationTimeout)
  }
}

function sendMessage() {
  if (messageInput.value === '') return

  const data = {
    name: nameInput.value,
    message: messageInput.value,
    dateTime: new Date(),
  }
  socket.emit('message', data)
  addMessageToUI(true, data)
  messageInput.value = ''
}

function sendFile() {
  const file = fileInput.files[0]
  const reader = new FileReader()
  reader.onload = function () {
    const data = {
      name: nameInput.value,
      file: reader.result,
      fileName: file.name,
      fileType: file.type,
      dateTime: new Date(),
    }
    socket.emit('file', data)
    addFileToUI(true, data)
    fileInput.value = ''
    imagePreviewContainer.style.display = 'none'
  }
  reader.readAsDataURL(file)
}

socket.on('chat-message', (data) => {
  messageTone.play()
  addMessageToUI(false, data)
})

socket.on('chat-file', (data) => {
  addFileToUI(false, data)
})

socket.on('chat-audio', (data) => {
  console.log('Received audio data:', data)
  addAudioToUI(false, data)
})

function addMessageToUI(isOwnMessage, data) {
  clearFeedback()
  const element = `
      <li class="${isOwnMessage ? 'message-right' : 'message-left'}">
          <p class="message">
            ${data.message}
            <span>${data.name} ● ${moment(data.dateTime).fromNow()}</span>
          </p>
      </li>
  `
  messageContainer.innerHTML += element
  scrollToBottom()
}

function addFileToUI(isOwnMessage, data) {
  clearFeedback()
  let element
  if (data.fileType.startsWith('image/')) {
    element = `
      <li class="${isOwnMessage ? 'message-right' : 'message-left'}">
          <p class="message">
            <img src="${data.file}" alt="${data.fileName}" style="max-width: 100%; height: auto;">
            <span>${data.name} ● ${moment(data.dateTime).fromNow()}</span>
          </p>
      </li>
    `
  } else if (data.fileType.startsWith('video/')) {
    element = `
      <li class="${isOwnMessage ? 'message-right' : 'message-left'}">
          <p class="message">
            <video controls style="max-width: 100%; height: auto;">
              <source src="${data.file}" type="${data.fileType}">
              Your browser does not support the video tag.
            </video>
            <span>${data.name} ● ${moment(data.dateTime).fromNow()}</span>
          </p>
      </li>
    `
  } else {
    element = `
      <li class="${isOwnMessage ? 'message-right' : 'message-left'}">
          <p class="message">
            <a href="${data.file}" download="${data.fileName}">${data.fileName}</a>
            <span>${data.name} ● ${moment(data.dateTime).fromNow()}</span>
          </p>
      </li>
    `
  }
  messageContainer.innerHTML += element
  scrollToBottom()
}

function addAudioToUI(isOwnMessage, data) {
  clearFeedback()
  const element = `
      <li class="${isOwnMessage ? 'message-right' : 'message-left'}">
          <p class="message">
            <audio controls>
              <source src="${data.audio}" type="audio/wav">
            </audio>
            <span>${data.name} ● ${moment(data.dateTime).fromNow()}</span>
          </p>
      </li>
  `
  messageContainer.innerHTML += element
  scrollToBottom()
}

function scrollToBottom() {
  messageContainer.scrollTo(0, messageContainer.scrollHeight)
}

messageInput.addEventListener('focus', (e) => {
  socket.emit('feedback', { feedback: ` ${nameInput.value} typing` })
})

messageInput.addEventListener('keypress', (e) => {
  socket.emit('feedback', { feedback: ` ${nameInput.value} typing` })
})

messageInput.addEventListener('blur', (e) => {
  socket.emit('feedback', { feedback: '' })
})

socket.on('feedback', (data) => {
  clearFeedback()
  const element = `
        <li class="message-feedback">
          <p class="feedback" id="feedback">${data.feedback}</p>
        </li>
  `
  messageContainer.innerHTML += element
})

function clearFeedback() {
  document.querySelectorAll('li.message-feedback').forEach((element) => {
    element.parentNode.removeChild(element)
  })
}
