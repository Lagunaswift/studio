import React, { useState } from 'react';
import { 
  advancedIngredientMatch, 
  ingredientMatchingFeedback 
} from '../../features/pantry/ingredient-matching-enhanced';

const IngredientMatchFeedbackModal = ({ 
  originalIngredient, 
  onMatchConfirmed 
}) => {
  const [matchResult] = useState(() => advancedIngredientMatch(originalIngredient));
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);
  const [customInput, setCustomInput] = useState('');

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion) => {
    setSelectedSuggestion(suggestion);
    ingredientMatchingFeedback.recordCorrection(originalIngredient, suggestion);
  };

  // Handle custom input confirmation
  const handleCustomConfirm = () => {
    if (customInput.trim()) {
      ingredientMatchingFeedback.recordCorrection(originalIngredient, customInput);
      onMatchConfirmed(customInput);
    }
  };

  // Confirm selected suggestion
  const confirmSuggestion = () => {
    if (selectedSuggestion) {
      onMatchConfirmed(selectedSuggestion);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 className="text-xl font-semibold mb-4">Ingredient Matching</h2>
        
        <p className="mb-4">
          We couldn't find an exact match for <strong>"{originalIngredient}"</strong>
        </p>

        {matchResult.suggestions && matchResult.suggestions.length > 0 ? (
          <div>
            <p className="mb-2 font-medium">Did you mean:</p>
            <div className="space-y-2 mb-4">
              {matchResult.suggestions.map(suggestion => (
                <button
                  key={suggestion}
                  onClick={() => handleSuggestionSelect(suggestion)}
                  className={`w-full p-2 text-left rounded-lg ${
                    selectedSuggestion === suggestion 
                      ? 'bg-green-100 border-2 border-green-500' 
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-yellow-600 mb-4">
            No suggestions found. Please enter the correct ingredient name.
          </p>
        )}

        <div className="mb-4">
          <label htmlFor="custom-input" className="block mb-2">
            Or enter a custom ingredient name:
          </label>
          <input
            id="custom-input"
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            className="w-full p-2 border rounded-lg"
            placeholder="Enter correct ingredient name"
          />
        </div>

        <div className="flex gap-3">
          {selectedSuggestion && (
            <button
              onClick={confirmSuggestion}
              className="flex-1 bg-green-500 text-white p-2 rounded-lg hover:bg-green-600"
            >
              Confirm "{selectedSuggestion}"
            </button>
          )}
          
          {customInput.trim() && (
            <button
              onClick={handleCustomConfirm}
              className="flex-1 bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600"
            >
              Confirm Custom Name
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default IngredientMatchFeedbackModal;
