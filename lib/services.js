export const uploadImageToApi = async (imageDataUrl) => {
  try {
    const formData = new FormData()
    const response = await fetch(imageDataUrl)
    const blob = await response.blob()
    formData.append('file', blob, `image_${Date.now()}.png`)

    const res = await fetch('/api/upload?type=image', {
      method: 'POST',
      body: formData
    })

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`)
    }

    const data = await res.json()
    return data.url
  } catch (error) {
    throw new Error(`Upload failed: ${error.message}`)
  }
}

export const sendRequestToGPT = async (payload, apiKey, endpoint) => {
  if (!apiKey || !endpoint) {
    throw new Error('API Key or Endpoint is missing')
  }

  try {
    const response = await fetch('/api/send-to-gpt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
        endpoint: endpoint
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return data.message
  } catch (error) {
    throw new Error(`GPT request failed: ${error.message}`)
  }
}

import CryptoJS from 'crypto-js'

const SECRET_KEY = '159b3c54-31b3-a1a6-ed69-671c2cdd111c'

export const encryptData = (data) => {
  return CryptoJS.AES.encrypt(data, SECRET_KEY).toString()
}

export const decryptData = (data) => {
  const bytes = CryptoJS.AES.decrypt(data, SECRET_KEY)
  return bytes.toString(CryptoJS.enc.Utf8)
}
