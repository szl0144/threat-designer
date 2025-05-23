import { getApiUrl } from '../config';
import { fetchAuthSession } from 'aws-amplify/auth';

const API_BASE_URL = getApiUrl();

export const sendChatMessage = async (prompt, threatModelId, modelId) => {
  try {
    // Get the current session from Cognito
    const session = await fetchAuthSession();
    // Get the ID token
    const token = session.tokens.idToken.toString();
    
    if (!token) {
      throw new Error('No authentication token found');
    }

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    const response = await fetch(`${API_BASE_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        prompt: prompt,
        threat_model_id: threatModelId,
        model_id: modelId,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Request timeout - the model is taking too long to respond. Please try again.');
    }
    console.error('Error sending chat message:', error);
    throw error;
  }
}; 