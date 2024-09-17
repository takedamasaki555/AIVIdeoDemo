import { useState, useEffect } from 'react'
import { encryptData, decryptData } from '../lib/services'

const APIKeyOverlay = ({ onClose }) => {
  const [apiKey, setApiKey] = useState('')
  const [resourceName, setResourceName] = useState('')
  const [deploymentName, setDeploymentName] = useState('')
  const [isTesting, setIsTesting] = useState(false)
  const [endpointOptions, setEndpointOptions] = useState([])
  const [apiKeyOptions, setApiKeyOptions] = useState([])

  useEffect(() => {
    const savedApiKey = localStorage.getItem('apiKey')
    const savedEndpoint = localStorage.getItem('endpoint')
    if (savedApiKey) setApiKey(decryptData(savedApiKey))
    if (savedEndpoint) {
      const url = new URL(savedEndpoint)
      const resourceName = url.hostname.split('.')[0]
      const deploymentName = url.pathname.split('/')[3]
      setResourceName(resourceName)
      setDeploymentName(deploymentName)
    }

    const savedApiKeyOptions = JSON.parse(localStorage.getItem('apiKeyOptions')) || []
    const savedEndpointOptions = JSON.parse(localStorage.getItem('endpointOptions')) || []
    setApiKeyOptions(savedApiKeyOptions.map(decryptData))
    setEndpointOptions(savedEndpointOptions)
  }, [])

  const handleSave = async () => {
    if (!apiKey || !resourceName || !deploymentName) {
      alert('API Key, Resource Name, and Deployment Name cannot be empty.')
      return
    }

    const endpoint = `https://${resourceName}.openai.azure.com/openai/deployments/${deploymentName}/chat/completions?api-version=2024-02-15-preview`

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
        throw new Error('Invalid API Key, Resource Name, or Deployment Name')
      }

      // Save API key and endpoint
      localStorage.setItem('apiKey', encryptData(apiKey))
      localStorage.setItem('endpoint', endpoint)

      // Save options for autocomplete
      const newApiKeyOptions = Array.from(new Set([...apiKeyOptions, apiKey]))
        .slice(-5)
        .map(encryptData)
      const newEndpointOptions = Array.from(new Set([...endpointOptions, endpoint])).slice(-5)
      localStorage.setItem('apiKeyOptions', JSON.stringify(newApiKeyOptions))
      localStorage.setItem('endpointOptions', JSON.stringify(newEndpointOptions))

      setApiKeyOptions(newApiKeyOptions.map(decryptData))
      setEndpointOptions(newEndpointOptions)

      onClose()
    } catch (error) {
      alert('Failed to validate API Key, Resource Name, or Deployment Name. Please check and try again.')
    } finally {
      setIsTesting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white p-4 rounded shadow-lg w-96">
        <h2 className="text-xl mb-4">Enter API Key and Endpoint of your GPT-4 deployment</h2>
        <div className="mb-4">
          <label className="block mb-2">Your AOAI Resource Name</label>
          <input
            type="text"
            value={resourceName}
            onChange={(e) => setResourceName(e.target.value)}
            placeholder="AOAI-japaneast-hkusano"
            className="w-full p-2 border border-gray-300 rounded"
            list="resource-options"
          />
        </div>
        <div className="mb-4">
          <label className="block mb-2">GPT-4o Deployment Name</label>
          <input
            type="text"
            value={deploymentName}
            onChange={(e) => setDeploymentName(e.target.value)}
            placeholder="gpt-4o-japaneast-hkusano"
            className="w-full p-2 border border-gray-300 rounded"
            list="deployment-options"
          />
        </div>
        <div className="mb-4">
          <label className="block mb-2">API Key</label>
          <input
            type="text"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded"
            list="api-key-options"
          />
          <datalist id="api-key-options">
            {apiKeyOptions.map((option, index) => (
              <option key={index} value={option} />
            ))}
          </datalist>
        </div>
        <button
          onClick={handleSave}
          className={`bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 ${isTesting ? 'opacity-50 cursor-not-allowed' : ''}`}
          disabled={isTesting}
        >
          {isTesting ? 'Validating...' : 'Save'}
        </button>
      </div>
    </div>
  )
}

export default APIKeyOverlay
