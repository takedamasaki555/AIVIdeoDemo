import { uploadImageToApi } from './services'

export const handleScenarioChange = (uploading, setScenario, newScenario, setKeyFrames, setAnnotations, setMessage) => {
  if (uploading) {
    setMessage('Please wait for the upload to complete before changing the scenario.')
    return
  }
  setScenario(newScenario)
  setKeyFrames([])
  setAnnotations({})
}

export const handleAnnotationChange = (frameTime, annotation, annotations, setAnnotations) => {
  setAnnotations({ ...annotations, [frameTime]: annotation })
}

export const handleSeek = (time, videoRef) => {
  if (videoRef.current) {
    videoRef.current.currentTime = time
  }
}

export const handleTextareaResize = (e) => {
  e.target.style.height = 'auto'
  e.target.style.height = `${e.target.scrollHeight}px`
}

export const handleFileUpload = async (e, index, updateFewShotExample) => {
  const file = e.target.files[0]
  if (file) {
    const reader = new FileReader()
    reader.onloadend = async () => {
      const uploadedUrl = await uploadImageToApi(reader.result)
      updateFewShotExample(index, 'image', uploadedUrl)
    }
    reader.readAsDataURL(file)
  }
}

export const handleVideoUpload = (e, setVideoFile, setKeyFrames, setAnnotations, setIsVideoLoaded) => {
  const file = e.target.files[0]
  if (file) {
    const url = URL.createObjectURL(file)
    setVideoFile(url)
    setKeyFrames([])
    setAnnotations({})
    setIsVideoLoaded(false) // Reset the video loaded state
  }
}

export const handleLoadedMetadata = (setIsVideoLoaded) => {
  setIsVideoLoaded(true)
  console.log('Video metadata loaded and video is ready.')
}
