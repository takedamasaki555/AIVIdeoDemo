import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import Loader from '../components/Loader'
import ScenarioSelector from '../components/ScenarioSelector'
import VideoPlayer from '../components/VideoPlayer'
import KeyFramesList from '../components/KeyFramesList'
import AnnotationPane from '../components/AnnotationPane'
import APIKeyOverlay from '../components/APIKeyOverlay'
import { uploadImageToApi, sendRequestToGPT, decryptData } from '../lib/services'
import { videoSources } from '../lib/constants'
import {
  handleScenarioChange,
  handleAnnotationChange,
  handleSeek,
  handleTextareaResize,
  handleFileUpload,
  handleVideoUpload,
  handleLoadedMetadata
} from '../lib/eventHandlers'

const AIVideoPlatform = () => {
  const [keyFrames, setKeyFrames] = useState([])
  const [annotations, setAnnotations] = useState({})
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [scenario, setScenario] = useState('manualCreation')
  const [prompts, setPrompts] = useState({
    autoGenerate: {
      manualCreation: `We would like to create an operational manual from screenshots of the video. To provide information to LLM, we need to add some information of each image as auxiliary information. Could you generate a draft of the image annotations?\nExample\n1. Action: The lady is carrying the box\n2. Outfit: The person is wearing safety gloves\n3. Attention: Carefully checking the box\n4. Environment: Outside`,
      safetyCheck: `We would like to ensure the safety of the driving video. To provide information to LLM, we need to add some information of each image as auxiliary information. Could you generate a draft of the image annotations?\nExample\n1. Action: The driver is checking mirrors\n2. Vehicle: The car is in good condition\n3. Attention: The driver is focusing on the road\n4. Environment: Urban area`,
      summary: `We would like to create a summary from the video. To provide information to LLM, we need to add some information of each image as auxiliary information. Could you generate a draft of the image annotations?\nExample\n1. Scene: The character is talking\n2. Action: The character is moving\n3. Attention: The character is pointing at the board\n4. Environment: Inside a room`
    },
    mainPrompt: {
      manualCreation: `Could you create an operational manual for operational procedures based on the following images and descriptions in markdown? We would like to show this manual to new joiners\n- Please leverage markdown grammar effectively e.g. using bullet points, # tag to emphasize, break lines\n- Please include image with using SAS image url(DO NOT modify the image URL, NOT output base64 encoding)`,
      safetyCheck: `Could you analyze the following driving video for safety compliance? First, answer the overall evaluation for the driving. Also, please annotate instances of safe and unsafe behaviors with specific timestamps and descriptions.`,
      summary: `Could you summarize the key points of the following video? Provide a concise summary`
    }
  })
  const [gptResponse, setGptResponse] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [numFrames, setNumFrames] = useState(5)
  const [fewShotExamples, setFewShotExamples] = useState([])
  const [isPaneOpen, setIsPaneOpen] = useState(false)
  const [videoFile, setVideoFile] = useState(null)
  const [showOverlay, setShowOverlay] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [endpoint, setEndpoint] = useState('')
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const [isVideoLoaded, setIsVideoLoaded] = useState(false)
  const [isAddingKeyFrames, setIsAddingKeyFrames] = useState(false)

  useEffect(() => {
    setLoading(false)
    const savedApiKey = localStorage.getItem('apiKey')
    const savedEndpoint = localStorage.getItem('endpoint')
    if (!savedApiKey || !savedEndpoint) {
      setShowOverlay(true)
    } else {
      setApiKey(decryptData(savedApiKey))
      setEndpoint(savedEndpoint)
    }
  }, [])

  const addKeyFrame = (time) => {
    if (!isVideoLoaded) {
      setMessage('Video is not loaded yet.')
      return
    }
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!canvas || !video) {
      setMessage('Canvas or video element is not available.')
      return
    }
    const context = canvas.getContext('2d')
    const MAX_WIDTH = 200
    const MAX_HEIGHT = 150
    video.pause()
    video.currentTime = time
    video.onseeked = () => {
      const currentTime = parseFloat(video.currentTime.toFixed(3))
      if (!keyFrames.some((frame) => frame.time === currentTime)) {
        let width = video.videoWidth
        let height = video.videoHeight
        if (width > MAX_WIDTH) {
          height = (height * MAX_WIDTH) / width
          width = MAX_WIDTH
        }
        if (height > MAX_HEIGHT) {
          width = (width * MAX_HEIGHT) / height
          height = MAX_HEIGHT
        }
        canvas.width = width
        canvas.height = height
        context.drawImage(video, 0, 0, canvas.width, canvas.height)
        const thumbnailUrl = canvas.toDataURL()
        const newKeyFrame = { id: currentTime, time: currentTime, thumbnailUrl }
        setKeyFrames((prevKeyFrames) => [...prevKeyFrames, newKeyFrame])
        setUploading(true)
        uploadImageToApi(thumbnailUrl)
          .then((uploadedImageUrl) => {
            setKeyFrames((prevKeyFrames) =>
              prevKeyFrames.map((frame) =>
                frame.id === currentTime ? { ...frame, thumbnailUrl: uploadedImageUrl } : frame
              )
            )
          })
          .catch((error) => {
            setMessage(`Upload failed: ${error.message}`)
          })
          .finally(() => {
            setUploading(false)
          })
      }
      video.onseeked = null
    }
  }

  const addKeyFramesAtIntervals = async () => {
    if (!isVideoLoaded) {
      setMessage('Video is not loaded yet.')
      return
    }
    setIsAddingKeyFrames(true)
    const video = videoRef.current
    const duration = video.duration
    const interval = duration / numFrames
    const promises = []
    for (let i = 1; i <= numFrames; i++) {
      const time = i * interval
      promises.push(
        new Promise((resolve) =>
          setTimeout(() => {
            addKeyFrame(time)
            resolve()
          }, i * 500)
        )
      )
    }
    await Promise.all(promises)
    setIsAddingKeyFrames(false)
  }

  const deleteKeyFrame = (id) => {
    setKeyFrames((prevKeyFrames) => prevKeyFrames.filter((frame) => frame.id !== id))
    setAnnotations((prevAnnotations) => {
      const updatedAnnotations = { ...prevAnnotations }
      delete updatedAnnotations[id]
      return updatedAnnotations
    })
  }

  const getThumbnailPositionStyle = (time) => {
    if (videoRef.current) {
      const videoDuration = videoRef.current.duration
      const percentage = (time / videoDuration) * 100
      return { left: `${percentage}%`, transform: `translateX(-50%)` }
    }
    return {}
  }

  const GenerateOutput = async () => {
    if (uploading) {
      setMessage('Please wait for the upload to complete.')
      return
    }
    const keyFrameAnnotations = keyFrames.map((frame) => ({
      ...frame,
      annotation: annotations[frame.time] || ''
    }))
    const payload = {
      systemPrompt: prompts.mainPrompt[scenario],
      keyFrameAnnotations,
      fewShotExamples
    }
    setIsSending(true)
    try {
      const gptMessage = await sendRequestToGPT(payload, apiKey, endpoint)
      setMessage('GPT request successful!')
      setGptResponse(gptMessage)
    } catch (error) {
      setMessage(`GPT request failed: ${error.message}`)
    } finally {
      setIsSending(false)
    }
  }

  const GenerateAnnotation = async () => {
    if (uploading) {
      setMessage('Please wait for the upload to complete.')
      return
    }

    setIsSending(true)
    try {
      const requests = keyFrames.map(async (frame) => {
        const payload = {
          systemPrompt: prompts.autoGenerate[scenario],
          keyFrameAnnotations: [{ ...frame, annotation: annotations[frame.time] || '' }],
          fewShotExamples
        }
        const response = await sendRequestToGPT(payload, apiKey, endpoint)
        return { time: frame.time, annotation: response }
      })

      const results = await Promise.all(requests)
      const newAnnotations = results.reduce((acc, { time, annotation }) => {
        acc[time] = annotation
        return acc
      }, {})
      setAnnotations(newAnnotations)
      setMessage('Auto-generation successful!')
    } catch (error) {
      setMessage(`Auto-generation failed: ${error.message}`)
    } finally {
      setIsSending(false)
    }
  }

  const addFewShotExample = () => {
    setFewShotExamples([...fewShotExamples, { image: '', description: '' }])
  }

  const updateFewShotExample = (index, field, value) => {
    const updatedExamples = fewShotExamples.map((example, i) =>
      i === index ? { ...example, [field]: value } : example
    )
    setFewShotExamples(updatedExamples)
  }

  const deleteFewShotExample = (index) => {
    setFewShotExamples(fewShotExamples.filter((_, i) => i !== index))
  }

  const setVideoRef = (ref) => {
    videoRef.current = ref.current
  }

  const setCanvasRef = (ref) => {
    canvasRef.current = ref.current
  }

  if (loading) {
    return <Loader />
  }

  return (
    <div className="relative p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">AI Video Platform</h1>
        <button
          onClick={() => setIsPaneOpen(!isPaneOpen)}
          className="bg-gray-500 text-white p-2 rounded hover:bg-gray-600"
        >
          ☰
        </button>
      </div>
      <ScenarioSelector
        scenario={scenario}
        handleScenarioChange={(newScenario) =>
          handleScenarioChange(uploading, setScenario, newScenario, setKeyFrames, setAnnotations, setMessage)
        }
      />
      <div className="mb-4">
        <input
          type="file"
          accept="video/*"
          onChange={(e) => handleVideoUpload(e, setVideoFile, setKeyFrames, setAnnotations, setIsVideoLoaded)}
        />
      </div>
      <VideoPlayer
        videoFile={videoFile}
        videoSources={videoSources}
        scenario={scenario}
        setKeyFrames={setKeyFrames}
        setAnnotations={setAnnotations}
        onLoadedMetadata={() => handleLoadedMetadata(setIsVideoLoaded)}
        setVideoRef={setVideoRef}
        setCanvasRef={setCanvasRef}
      />
      <KeyFramesList
        keyFrames={keyFrames}
        handleSeek={(time) => handleSeek(time, videoRef)}
        deleteKeyFrame={deleteKeyFrame}
        getThumbnailPositionStyle={getThumbnailPositionStyle}
      />
      <button
        onClick={() => addKeyFrame(videoRef.current ? videoRef.current.currentTime : 0)}
        className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
      >
        Add KeyFrame
      </button>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-4">
        {keyFrames.map((frame) => (
          <div key={frame.id} className="bg-white p-4 rounded shadow-md">
            <img src={frame.thumbnailUrl} alt={`KeyFrame at ${frame.time}`} className="mb-2" />
            <textarea
              value={annotations[frame.time] || ''}
              onChange={(e) => handleAnnotationChange(frame.time, e.target.value, annotations, setAnnotations)}
              placeholder="Add annotation..."
              className="w-full p-2 border border-gray-300 rounded"
              onInput={handleTextareaResize}
              style={{ overflow: 'hidden', height: '100px' }}
            />
            <button
              onClick={() => deleteKeyFrame(frame.id)}
              className="mt-2 bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
      {isPaneOpen && (
        <AnnotationPane
          prompts={prompts}
          scenario={scenario}
          setPrompts={setPrompts}
          addKeyFramesAtIntervals={addKeyFramesAtIntervals}
          numFrames={numFrames}
          setNumFrames={setNumFrames}
          fewShotExamples={fewShotExamples}
          handleFileUpload={(e, index) => handleFileUpload(e, index, updateFewShotExample)}
          updateFewShotExample={updateFewShotExample}
          deleteFewShotExample={deleteFewShotExample}
          addFewShotExample={addFewShotExample}
          setIsPaneOpen={setIsPaneOpen}
        />
      )}
      <button
        onClick={GenerateAnnotation}
        className="mt-4 bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
        disabled={isSending}
      >
        {isSending ? (
          <svg className="animate-spin h-5 w-5 text-white inline-block" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        ) : (
          'Auto-Generate Annotations'
        )}
      </button>
      <button
        onClick={GenerateOutput}
        className="mt-4 bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
        disabled={isSending}
      >
        {isSending ? (
          <svg className="animate-spin h-5 w-5 text-white inline-block" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        ) : (
          'Generate response with GPT'
        )}
      </button>
      {message && <div className="mt-4 text-red-500">{message}</div>}
      <div className="mt-4">
        {gptResponse && (
          <div className="bg-gray-100 p-4 rounded shadow-md">
            <ReactMarkdown remarkPlugins={[remarkGfm]} className="markdown">
              {gptResponse}
            </ReactMarkdown>
          </div>
        )}
      </div>
      {showOverlay && (
        <APIKeyOverlay
          onClose={() => {
            setShowOverlay(false)
            const savedApiKey = localStorage.getItem('apiKey')
            const savedEndpoint = localStorage.getItem('endpoint')
            setApiKey(decryptData(savedApiKey))
            setEndpoint(savedEndpoint)
          }}
        />
      )}
    </div>
  )
}

export default AIVideoPlatform
