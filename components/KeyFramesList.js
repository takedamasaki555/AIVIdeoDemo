import KeyFrame from './KeyFrame'

const KeyFramesList = ({ keyFrames, handleSeek, deleteKeyFrame, getThumbnailPositionStyle }) => (
  <div className="relative mt-4">
    <div className="w-full h-24 bg-gray-200 flex items-center justify-center overflow-x-scroll">
      {keyFrames.map((frame) => (
        <KeyFrame
          key={frame.id}
          frame={frame}
          handleSeek={handleSeek}
          deleteKeyFrame={deleteKeyFrame}
          getThumbnailPositionStyle={getThumbnailPositionStyle}
        />
      ))}
    </div>
  </div>
)

export default KeyFramesList
