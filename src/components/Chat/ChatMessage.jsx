import React from 'react';
import { Box, Button, Icon } from "@cloudscape-design/components";

export default function ChatMessage({ message }) {
  const isAssistant = message.role === 'assistant';

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
  
  return (
    <Box
        padding={{ vertical: 'xxxs', horizontal: isAssistant ? 'xxxxs' : 'xxxxs' }}
    >
      <div style={{ 
        display: 'flex',
        flexDirection: 'column',
        alignItems: isAssistant ? 'flex-start' : 'flex-end',
        width: '100%'
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
          padding: '2px 14px',
          borderRadius: '8px',
          maxWidth: '85%',
          wordBreak: 'break-word',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
          position: 'relative'
        }}>
          <div style={{ flexGrow: 1, marginRight: '8px' }}>
            {message.content}
          </div>
          <Button 
            variant="icon" 
            iconName="copy" 
            onClick={handleCopy} 
            ariaLabel="Copy message content"
            style={isAssistant ? {} : { color: '#ffffff' }}
          />
        </div>
      </div>
    </Box>
  );
} 