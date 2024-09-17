const ScenarioSelector = ({ scenario, handleScenarioChange }) => (
  <div className="mb-4">
    <label className="mr-2">Select Scenario:</label>
    <select onChange={(e) => handleScenarioChange(e.target.value)} value={scenario}>
      <option value="manualCreation">Manual Creation</option>
      <option value="safetyCheck">Safety Check</option>
      <option value="summary">Summary</option>
    </select>
  </div>
)

export default ScenarioSelector
