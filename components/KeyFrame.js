const KeyFrame = ({ frame, handleSeek, deleteKeyFrame, getThumbnailPositionStyle }) => (
  <div
    key={frame.id}
    className="relative mx-2 cursor-pointer"
    style={getThumbnailPositionStyle(frame.time)}
    onClick={() => handleSeek(frame.time)}
  >
    <img src={frame.thumbnailUrl} alt={`KeyFrame at ${frame.time}`} className="h-12" />
    <div className="text-center text-white bg-opacity-75 bg-black mt-1">{frame.time.toFixed(3)}s</div>
    <button
      onClick={(e) => {
        e.stopPropagation()
        deleteKeyFrame(frame.id)
      }}
      className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 text-xs"
    >
      ✕
    </button>
  </div>
)

export default KeyFrame
