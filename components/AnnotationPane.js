import { useState, useEffect } from 'react'
import { EyeIcon, EyeOffIcon } from '@heroicons/react/outline'
import { encryptData, decryptData } from '../lib/services' // 暗号化関数と復号関数をインポート

const AnnotationPane = ({
  prompts,
  scenario,
  setPrompts,
  addKeyFramesAtIntervals,
  numFrames,
  setNumFrames,
  fewShotExamples,
  handleFileUpload,
  updateFewShotExample,
  deleteFewShotExample,
  addFewShotExample,
  setIsPaneOpen
}) => {
  const [apiKey, setApiKey] = useState('')
  const [endpoint, setEndpoint] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [isAddingKeyFrames, setIsAddingKeyFrames] = useState(false)
  const [endpointOptions, setEndpointOptions] = useState([])
  const [apiKeyOptions, setApiKeyOptions] = useState([])

  useEffect(() => {
    const savedApiKey = localStorage.getItem('apiKey')
    const savedEndpoint = localStorage.getItem('endpoint')
    if (savedApiKey) setApiKey(decryptData(savedApiKey)) // 復号化
    if (savedEndpoint) setEndpoint(savedEndpoint)

    const savedApiKeyOptions = JSON.parse(localStorage.getItem('apiKeyOptions')) || []
    const savedEndpointOptions = JSON.parse(localStorage.getItem('endpointOptions')) || []
    setApiKeyOptions(savedApiKeyOptions.map(decryptData))
    setEndpointOptions(savedEndpointOptions)
  }, [])

  const validateAndSave = async () => {
    if (!apiKey || !endpoint) {
      alert('API Key and Endpoint cannot be empty.')
      return
    }

    setIsTesting(true)
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': apiKey
        },
        body: JSON.stringify({ messages: [{ role: 'system', content: 'Say Hello' }] })
      })

      if (!response.ok) {
        throw new Error('Invalid API Key or Endpoint')
      }

      // If the response is okay, save the API key and endpoint
      localStorage.setItem('apiKey', encryptData(apiKey)) // 暗号化
      localStorage.setItem('endpoint', endpoint) // 暗号化

      // Save options for autocomplete
      const newApiKeyOptions = Array.from(new Set([...apiKeyOptions, apiKey]))
        .slice(-5)
        .map(encryptData)
      const newEndpointOptions = Array.from(new Set([...endpointOptions, endpoint])).slice(-5)
      localStorage.setItem('apiKeyOptions', JSON.stringify(newApiKeyOptions))
      localStorage.setItem('endpointOptions', JSON.stringify(newEndpointOptions))

      setApiKeyOptions(newApiKeyOptions.map(decryptData))
      setEndpointOptions(newEndpointOptions)

      alert('API Key and Endpoint saved successfully.')
    } catch (error) {
      alert('Failed to validate API Key and Endpoint. Please check and try again.')
    } finally {
      setIsTesting(false)
    }
  }

  const handleAddKeyFramesAtIntervals = async () => {
    setIsAddingKeyFrames(true)
    try {
      await addKeyFramesAtIntervals()
    } catch (error) {
      console.error('Error adding key frames:', error)
    } finally {
      setIsAddingKeyFrames(false)
    }
  }

  return (
    <div className="fixed top-0 right-0 w-1/3 h-full bg-white p-4 shadow-lg overflow-y-auto">
      <button
        onClick={() => setIsPaneOpen(false)}
        className="mb-4 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
      >
        Close Pane
      </button>

      <div className="mb-4 border-b pb-4">
        <h2 className="text-xl font-bold mb-2">System Prompts</h2>
        <textarea
          value={prompts.mainPrompt[scenario]}
          onChange={(e) =>
            setPrompts({ ...prompts, mainPrompt: { ...prompts.mainPrompt, [scenario]: e.target.value } })
          }
          placeholder="Enter main prompt..."
          className="w-full p-2 border border-gray-300 rounded"
          style={{ height: '150px' }}
        />
      </div>

      <div className="mb-4 border-b pb-4">
        <h2 className="text-xl font-bold mb-2">Auto-Generate Prompt</h2>
        <textarea
          value={prompts.autoGenerate[scenario]}
          onChange={(e) =>
            setPrompts({ ...prompts, autoGenerate: { ...prompts.autoGenerate, [scenario]: e.target.value } })
          }
          placeholder="Enter auto-generate prompt..."
          className="w-full p-2 border border-gray-300 rounded"
          style={{ height: '150px' }}
        />
      </div>

      <button
        onClick={handleAddKeyFramesAtIntervals}
        className={`mt-4 bg-green-500 text-white px-4 py-2 rounded flex items-center justify-center hover:bg-green-600 ${isAddingKeyFrames ? 'opacity-50 cursor-not-allowed' : ''}`}
        disabled={isAddingKeyFrames}
      >
        {isAddingKeyFrames ? (
          <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        ) : (
          'Add KeyFrames at Intervals'
        )}
      </button>

      <div className="mt-4 border-b pb-4">
        <label className="mr-2">Number of Frames:</label>
        <input
          type="number"
          value={numFrames}
          onChange={(e) => setNumFrames(Number(e.target.value))}
          className="p-2 border border-gray-300 rounded"
        />
      </div>

      <div className="mt-4 border-b pb-4">
        <h2 className="text-xl font-bold mb-2">Few Shot Examples</h2>
        {fewShotExamples.map((example, index) => (
          <div key={index} className="mb-4 p-2 border border-gray-300 rounded">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleFileUpload(e, index)}
              className="w-full mb-2 p-2 border border-gray-300 rounded"
            />
            <textarea
              placeholder="Description"
              value={example.description}
              onChange={(e) => updateFewShotExample(index, 'description', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded"
            />
            <button
              onClick={() => deleteFewShotExample(index)}
              className="mt-2 bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
            >
              Delete
            </button>
          </div>
        ))}
        <button onClick={addFewShotExample} className="mt-2 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
          Add Few Shot Example
        </button>
      </div>
      <div className="mt-4 border-b pb-4">
        <label className="mr-2">Endpoint:</label>
        <input
          type="text"
          value={endpoint}
          onChange={(e) => setEndpoint(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded"
          list="endpoint-options"
        />
        <datalist id="endpoint-options">
          {endpointOptions.map((option, index) => (
            <option key={index} value={option} />
          ))}
        </datalist>
      </div>
      <div className="mt-4 border-b pb-4">
        <label className="mr-2">API Key:</label>
        <div className="relative">
          <input
            type={showApiKey ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded pr-10"
            list="api-key-options"
          />
          <datalist id="api-key-options">
            {apiKeyOptions.map((option, index) => (
              <option key={index} value={option} />
            ))}
          </datalist>
          <button
            onClick={() => setShowApiKey(!showApiKey)}
            className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-gray-700"
          >
            {showApiKey ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
          </button>
        </div>
      </div>
      <button
        onClick={validateAndSave}
        className={`mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 ${isTesting ? 'opacity-50 cursor-not-allowed' : ''}`}
        disabled={isTesting}
      >
        {isTesting ? 'Validating...' : 'Save'}
      </button>
    </div>
  )
}

export default AnnotationPane
