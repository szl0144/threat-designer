import React from 'react';
import { Box, Button, Icon } from "@cloudscape-design/components";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './ChatMessage.css';

export default function ChatMessage({ message }) {
  const isAssistant = message.role === 'assistant';

  // Function to check if message is a prompt template
  const isPromptTemplate = (content) => {
    if (isAssistant) return false;
    return content.includes('You are a cloud security professional') ||
           content.includes('You are a cloud security engineer') ||
           content.includes('You are a cloud security architect');
  };

  const handleCopy = () => {
    if (navigator.clipboard && message.content) {
      navigator.clipboard.writeText(message.content)
        .then(() => {
          // Optional: Show some feedback to the user, e.g., a toast message
          console.log('Content copied to clipboard!');
        })
        .catch(err => {
          console.error('Failed to copy content: ', err);
        });
    }
  };
  
  // Function to preserve line breaks in user messages
  const formatUserMessage = (content) => {
    return content.split('\n').map((line, index) => (
      <React.Fragment key={index}>
        {line}
        {index < content.split('\n').length - 1 && <br />}
      </React.Fragment>
    ));
  };
  
  return (
    <Box
        padding={{ vertical: 'xxxs', horizontal: isAssistant ? 'xxxxs' : 'xxxxs' }}
    >
      <div style={{ 
        display: 'flex',
        flexDirection: 'column',
        alignItems: isAssistant ? 'flex-start' : 'flex-end',
        width: '99%'
      }}>
        <div style={{
          fontWeight: 'bold',
          marginBottom: '4px',
          color: isAssistant ? '#545b64' : '#16191f',
          alignSelf: isAssistant ? 'flex-start' : 'flex-end'
        }}>
          {isAssistant ? 'Assistant' : 'You'}
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          backgroundColor: isAssistant ? '#f2f3f3' : '#0972d3',
          color: isAssistant ? '#16191f' : '#ffffff',
          padding: isAssistant 
            ? '5px 5px 5px 15px' 
            : isPromptTemplate(message.content) 
              ? '8px 5px 8px 15px' 
              : '3px 5px 3px 15px',
          borderRadius: '8px',
          width: isAssistant ? '100%' : 'auto',
          maxWidth: '100%',
          wordBreak: 'break-word',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
          position: 'relative',
          minHeight: '30px'
        }}>
          <div style={{ flexGrow: 1, marginRight: '8px' }}>
            {isAssistant ? (
              <div className={`chat-message-markdown ${!isAssistant ? 'inverted' : ''}`}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {message.content}
                </ReactMarkdown>
              </div>
            ) : (
              <div style={{ whiteSpace: 'pre-wrap' }}>
                {formatUserMessage(message.content)}
              </div>
            )}
          </div>
          <div 
            onClick={handleCopy}
            style={{ 
              cursor: 'pointer', 
              padding: '4px',
              alignSelf: 'flex-start'
            }}
          >
            <Icon 
              name="copy" 
              size="normal"
              variant={isAssistant ? "normal" : "inverted"}
            />
          </div>
        </div>
      </div>
    </Box>
  );
} 