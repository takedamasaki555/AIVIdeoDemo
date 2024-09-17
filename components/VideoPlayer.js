import { useRef, useEffect } from 'react'

const VideoPlayer = ({
  videoFile,
  videoSources,
  scenario,
  setKeyFrames,
  setAnnotations,
  onLoadedMetadata,
  setVideoRef,
  setCanvasRef
}) => {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)

  useEffect(() => {
    if (videoRef.current) {
      setVideoRef(videoRef)
    }
    if (canvasRef.current) {
      setCanvasRef(canvasRef)
    }
  }, [setVideoRef, setCanvasRef])

  useEffect(() => {
    const video = videoRef.current
    if (video) {
      const handleLoadedMetadata = () => {
        console.log('Video metadata loaded')
        onLoadedMetadata()
      }

      video.addEventListener('loadedmetadata', handleLoadedMetadata)
      return () => {
        video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      }
    }
  }, [onLoadedMetadata])

  return (
    <div className="relative">
      <video
        ref={videoRef}
        src={videoFile || videoSources[scenario]}
        controls
        className="mb-4 w-full h-auto max-w-md"
      />
      <canvas ref={canvasRef} className="hidden"></canvas>
    </div>
  )
}

export default VideoPlayer
