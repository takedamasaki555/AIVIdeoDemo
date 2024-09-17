import nextConnect from 'next-connect'
import axios from 'axios'

const apiRoute = nextConnect({
  onError(error, req, res) {
    console.error(`Error: ${error.message}`)
    res.status(501).json({ error: `Sorry something happened! ${error.message}` })
  },
  onNoMatch(req, res) {
    console.warn(`Method '${req.method}' Not Allowed`)
    res.status(405).json({ error: `Method '${req.method}' Not Allowed` })
  }
})

const MAX_IMAGES_PER_REQUEST = 5
const OVERLAP_COUNT = 0

const logPayload = (payload) => {
  console.log('Payload:', JSON.stringify(payload, null, 2))
}

apiRoute.post(async (req, res) => {
  const { systemPrompt, keyFrameAnnotations, fewShotExamples } = req.body
  const apiKey = req.headers['api-key']
  const endpoint = req.headers['endpoint']
  if (!apiKey || !endpoint) {
    return res.status(400).json({ error: 'API Key or Endpoint is missing' })
  }

  const formatFewShotExamples = (examples) => {
    return examples.map((example) => ({
      role: 'system',
      content: [
        { type: 'text', text: `Description: ${example.description}` },
        { type: 'image_url', image_url: { url: example.image } }
      ]
    }))
  }

  const novelObjectDefinition = {
    role: 'system',
    content: 'Novel Object Reference (May not appear)'
  }

  const fewShotPromptMessages =
    fewShotExamples && fewShotExamples.length > 0
      ? [novelObjectDefinition, ...formatFewShotExamples(fewShotExamples)]
      : []

  const splitIntoChunksWithOverlap = (array, chunkSize, overlap) => {
    const chunks = []
    for (let i = 0; i < array.length; i += chunkSize - overlap) {
      chunks.push(array.slice(i, i + chunkSize))
    }
    return chunks
  }

  const annotationChunks = splitIntoChunksWithOverlap(keyFrameAnnotations, MAX_IMAGES_PER_REQUEST, OVERLAP_COUNT)

  try {
    const createMessagesForChunk = (prompt, chunk) => {
      return [
        { role: 'system', content: prompt },
        ...fewShotPromptMessages,
        {
          role: 'user',
          content: chunk
            .map((item) => {
              const content = [{ type: 'text', text: `Time: ${item.time}s, Image URL: ${item.thumbnailUrl}` }]
              if (item.annotation) {
                content.push({ type: 'text', text: `Annotation: ${item.annotation}` })
              }
              content.push({ type: 'image_url', image_url: { url: item.thumbnailUrl } })
              return content
            })
            .flat()
        }
      ]
    }

    const extendedSystemPrompt =
      annotationChunks.length === 1
        ? `${systemPrompt}`
        : `${systemPrompt}\n\nDue to the large number of images, they will be processed in chunks.`

    if (annotationChunks.length === 1) {
      const messages = createMessagesForChunk(extendedSystemPrompt, annotationChunks[0])
      const payload = {
        messages,
        max_tokens: 4096,
        temperature: 0.0
      }
      const response = await axios.post(endpoint, payload, {
        headers: {
          'Content-Type': 'application/json',
          'api-key': apiKey
        }
      })
      const finalOutput = response.data.choices[0].message.content
      return res.json({ message: finalOutput })
    }

    const chunkProcessingPromises = annotationChunks.map((chunk, index) => {
      return new Promise(async (resolve, reject) => {
        const startTime = Date.now()
        console.log(`Processing chunk ${index + 1}/${annotationChunks.length}...`)
        const messages = createMessagesForChunk(extendedSystemPrompt, chunk)
        const payload = {
          messages,
          max_tokens: 4096
        }
        try {
          const response = await axios.post(endpoint, payload, {
            headers: {
              'Content-Type': 'application/json',
              'api-key': apiKey
            }
          })
          const endTime = Date.now()
          console.log(`Chunk ${index + 1} processed in ${endTime - startTime} ms`)
          resolve({ index, output: response.data.choices[0].message.content })
        } catch (error) {
          reject(error)
        }
      })
    })

    const results = await Promise.all(chunkProcessingPromises)
    results.sort((a, b) => a.index - b.index)
    const orderedOutputs = results.map((result) => result.output)

    const consolidatePrompt = `${systemPrompt}\n\nThe following are partial outputs from processing video key frames in chunks. Please consolidate them into a coherent final output.`
    const finalMessages = [
      { role: 'system', content: consolidatePrompt },
      ...orderedOutputs.map((output) => ({
        role: 'user',
        content: output + '\n\n----------------------------------------\n\n'
      }))
    ]

    const finalPayload = {
      messages: finalMessages,
      max_tokens: 4096,
      temperature: 0.0
    }
    const finalResponseStartTime = Date.now()
    const finalResponse = await axios.post(endpoint, finalPayload, {
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey
      }
    })
    const finalResponseEndTime = Date.now()
    const finalOutput = finalResponse.data.choices[0].message.content
    res.json({ message: finalOutput })
  } catch (error) {
    console.error('Error communicating with OpenAI:', error)
    if (error.response) {
      console.error('Error response data:', error.response.data)
    }
    res.status(500).json({ error: 'Failed to communicate with GPT' })
  }
})

export default apiRoute
