const CHAT_HISTORY_KEY = 'threat_designer_chat_history';

export const saveChatHistory = (modelId, messages) => {
  try {
    const history = getChatHistory();
    history[modelId] = messages;
    localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(history));
  } catch (error) {
    console.error('Error saving chat history:', error);
  }
};

export const getChatHistory = () => {
  try {
    const history = localStorage.getItem(CHAT_HISTORY_KEY);
    return history ? JSON.parse(history) : {};
  } catch (error) {
    console.error('Error getting chat history:', error);
    return {};
  }
};

export const getChatHistoryForModel = (modelId) => {
  const history = getChatHistory();
  return history[modelId] || [];
};

export const clearChatHistory = () => {
  try {
    localStorage.removeItem(CHAT_HISTORY_KEY);
  } catch (error) {
    console.error('Error clearing chat history:', error);
  }
}; 