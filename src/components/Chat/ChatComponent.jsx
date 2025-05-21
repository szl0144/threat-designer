import React, { useState, useEffect } from 'react';
import {
  AppLayout,
  Button,
  Select,
  Textarea,
  SpaceBetween,
  Container,
  Header,
  ButtonDropdown,
  Box,
  Link
} from "@cloudscape-design/components";
import ChatMessage from './ChatMessage';

const MODEL_OPTIONS = [
  { label: "Amazon Nova Lite", value: "nova-lite", },
  { label: "Amazon Nova Micro", value: "nova-micro" },
  { label: "Amazon Nova Premier", value: "nova-premier" },
  { label: "Amazon Nova Pro", value: "nova-pro" },
  { label: "Claude 3.7 Sonnet", value: "claude-3-sonnet" },
  { label: "Claude 3.5 Sonnet v2", value: "claude-3.5-sonnet" },
  { label: "Claude 3.5 Haiku", value: "claude-3.5-haiku" },
  { label: "DeepSeek-R1", value: "deepseek-r1" }
];

const formatDate = (timestamp) => {
  const date = new Date(parseInt(timestamp));
  return date.toLocaleString('en-US', { 
    month: 'short', 
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true 
  });
};

export default function ChatComponent({ threatModels = [] }) {
  const [selectedModel, setSelectedModel] = useState(MODEL_OPTIONS[0]);
  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'What do you want to know from your threat model?' }
  ]);
  const [navigationOpen, setNavigationOpen] = useState(true);
  const [selectedChat, setSelectedChat] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    console.log("🔄 Initializing from localStorage");
    let initialChatHistory = [];
    try {
      const storedHistory = localStorage.getItem('chatHistory');
      console.log("📂 Found stored history:", storedHistory ? "yes" : "no");
      if (storedHistory) {
        initialChatHistory = JSON.parse(storedHistory);
        console.log("📚 Parsed history count:", initialChatHistory.length);
        setChatHistory(initialChatHistory);
        
        const storedSelectedChatId = localStorage.getItem('selectedChatId');
        console.log("🔍 Found stored selected chat ID:", storedSelectedChatId);
        
        if (storedSelectedChatId && initialChatHistory.length > 0) {
          const activeChat = initialChatHistory.find(chat => chat.id === storedSelectedChatId);
          if (activeChat) {
            console.log("✅ Setting selected chat to:", activeChat.id);
            setSelectedChat(activeChat.id);
            setMessages(activeChat.messages);
          } else if (initialChatHistory.length > 0) {
            console.log("⚠️ Stored chat ID not found, using most recent");
            setSelectedChat(initialChatHistory[0].id);
            setMessages(initialChatHistory[0].messages);
          }
        } else if (initialChatHistory.length > 0) {
          console.log("ℹ️ No stored ID, using first chat");
          setSelectedChat(initialChatHistory[0].id);
          setMessages(initialChatHistory[0].messages);
        }
      }
      setIsInitialized(true);
    } catch (e) {
      console.error("❌ Failed to initialize from localStorage", e);
      setIsInitialized(true);
    }
  }, []); // Only run on initial mount

  useEffect(() => {
    if (isInitialized && chatHistory.length > 0) {
      try {
        localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
        console.log("💾 Saved chat history to localStorage:", chatHistory.length, "chats");
      } catch (e) {
        console.error("Failed to save chat history to localStorage", e);
      }
    }
  }, [chatHistory, isInitialized]);

  useEffect(() => {
    if (isInitialized && selectedChat) {
      try {
        localStorage.setItem('selectedChatId', selectedChat);
        console.log("💾 Saved selectedChatId to localStorage:", selectedChat);
      } catch (e) {
        console.error("Failed to save selected chat ID to localStorage", e);
      }
    } else if (isInitialized) {
      localStorage.removeItem('selectedChatId');
    }
  }, [selectedChat, isInitialized]);

  useEffect(() => {
    if (isInitialized && selectedChat) {
      setChatHistory(prevChatHistory => {
        const chatIndex = prevChatHistory.findIndex(c => c.id === selectedChat);
        
        if (chatIndex === -1) {
            return prevChatHistory;
        }

        const updatedChat = {
          ...prevChatHistory[chatIndex],
          messages: messages,
          timestamp: Date.now(), // Only update timestamp, don't reorder yet
        };

        const newChatHistory = [...prevChatHistory];
        newChatHistory[chatIndex] = updatedChat;
        
        // Don't sort here to prevent changing the display order
        return newChatHistory;
      });
    }
  }, [messages, selectedChat, isInitialized]);

  const handleSend = () => {
    if (inputMessage.trim() && selectedChat) {
      // Create an updated messages array with the new user message
      const updatedMessages = [...messages, { role: 'user', content: inputMessage }];
      
      setMessages([...messages, { role: 'user', content: inputMessage }]);
      setInputMessage('');
      
      setTimeout(() => {
        // Create a response message
        const responseMessage = { 
          role: 'assistant', 
          content: 'This is a placeholder response. Backend integration pending.' 
        };
        
        // Add the response to the messages state
        const messagesWithResponse = [...updatedMessages, responseMessage];
        setMessages(messagesWithResponse);
        
        // Manually update the specific chat in history with the updated messages
        // This provides an alternative update path besides the useEffect
        setChatHistory(prev => {
          const updatedHistory = [...prev];
          const chatIndex = updatedHistory.findIndex(c => c.id === selectedChat);
          if (chatIndex !== -1) {
            updatedHistory[chatIndex] = {
              ...updatedHistory[chatIndex],
              messages: messagesWithResponse,
              timestamp: Date.now()
            };
          }
          // Don't sort - maintain current order
          return updatedHistory;
        });
      }, 1000);
    }
  };

  const handleKeyDown = (event) => {
    console.log('handleKeyDown triggered. Event detail:', event.detail);
    if (event.detail.key === 'Enter' && !event.detail.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const handleNewChat = (detail) => {
    const selectedModelData = threatModels.find(model => model.id === detail.id);
    if (selectedModelData) {
      // Save current chat's messages before creating new chat
      if (selectedChat) {
        const currentChat = chatHistory.find(c => c.id === selectedChat);
        if (currentChat) {
          setChatHistory(prev => {
            const updatedHistory = [...prev];
            const idx = updatedHistory.findIndex(c => c.id === selectedChat);
            if (idx !== -1) {
              updatedHistory[idx] = {
                ...updatedHistory[idx],
                messages: messages,
                timestamp: Date.now()
              };
            }
            return updatedHistory;
          });
        }
      }

      const newChat = {
        id: Date.now().toString(),
        title: selectedModelData.title,
        modelId: selectedModelData.id,
        timestamp: Date.now(),
        messages: [
          { role: 'assistant', content: 'What do you want to know from your threat model?' }
        ]
      };
      // Sort chat history only when creating a new chat
      setChatHistory(prev => {
        // Add the new chat at the top but keep the rest in their existing order
        return [newChat, ...prev];
      });
      setSelectedChat(newChat.id);
      setMessages(newChat.messages);
    }
  };

  // Add a helper function to sort the chat history when needed
  const sortChatHistory = () => {
    setChatHistory(prev => [...prev].sort((a, b) => b.timestamp - a.timestamp));
  };

  const handleDeleteChat = (chatId, event) => {
    event.preventDefault(); 
    event.stopPropagation();
    // Get the deleted chat's index to help select a nearby chat
    const deletedChatIndex = chatHistory.findIndex(chat => chat.id === chatId);
    const remainingChats = chatHistory.filter(chat => chat.id !== chatId);
    
    setChatHistory(prev => prev.filter(chat => chat.id !== chatId));
    
    if (selectedChat === chatId) {
      // If we deleted the selected chat, select a nearby one
      if (remainingChats.length > 0) {
        // Try to select the chat that was just before or after the deleted one
        const targetIndex = Math.min(deletedChatIndex, remainingChats.length - 1);
        const nextChat = remainingChats[targetIndex];
        
        setSelectedChat(nextChat.id);
        setMessages([...nextChat.messages]);
        console.log("🔄 Deleted selected chat, switching to:", nextChat.id);
      } else {
        // No chats left
        setSelectedChat(null);
        setMessages([{ role: 'assistant', content: 'What do you want to know from your threat model?' }]);
        console.log("ℹ️ No chats left after deletion");
      }
    }
  };

  const Navigation = () => (
    <div style={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column', 
      margin: 0,
      padding: 0,
      overflow: 'hidden'
    }}>
      <Container 
        header={<Header variant="h2">Chat History</Header>}
        style={{ flex: 1, height: '100%', marginBottom: 0, borderBottom: 'none' }}
      >
        <SpaceBetween size="l">
          <div style={{ marginTop: '10px', marginBottom: '0px' }}>
            <ButtonDropdown
              items={threatModels.length > 0 
                ? threatModels.map(model => ({
                    id: model.id,
                    text: model.title
                  }))
                : [{id: 'no-models', text: 'No threat models, create one first', disabled: true}]
              }
              onItemClick={({ detail }) => handleNewChat(detail)}
              expandableGroups
            >
              Chat with threat model
            </ButtonDropdown>
          </div>
          <div style={{ 
            flex: 1,
            overflowY: 'auto',
            height: 'calc(100vh - 120px)',
            paddingBottom: '20px'
          }}>
            {chatHistory.length > 0 ? (
              <>
                <Box variant="awsui-key-label" padding={{ bottom: 'xs' }} color="text-status-inactive">
                  Recent chats
                </Box>
                <SpaceBetween size="xxxs">
                  {chatHistory.map(chat => (
                    <div
                      key={chat.id}
                      style={{
                        padding: '5px 16px 7px 0px',
                        borderRadius: '12px',
                        backgroundColor: selectedChat === chat.id ? '#fafbfb' : '#ffffff',
                        display: 'flex',
                        flexDirection: 'column',
                        cursor: 'pointer'
                      }}
                      onClick={() => {
                        const clickedChat = chatHistory.find(c => c.id === chat.id);
                        if (clickedChat) {
                          // First save the current chat's messages if we're switching
                          if (selectedChat && selectedChat !== clickedChat.id) {
                            // Get the current chat's messages before switching
                            console.log("🔄 Switching from chat", selectedChat, "to", clickedChat.id);
                            
                            // Find the current chat and keep its reference in state
                            const currentChat = chatHistory.find(c => c.id === selectedChat);
                            if (currentChat) {
                              // Update timestamp but don't change position yet
                              const updatedCurrentChat = {
                                ...currentChat,
                                messages: messages,
                                timestamp: Date.now()
                              };
                              
                              // Save to state without reordering
                              setChatHistory(prev => {
                                const updatedHistory = [...prev];
                                const idx = updatedHistory.findIndex(c => c.id === selectedChat);
                                if (idx !== -1) {
                                  updatedHistory[idx] = updatedCurrentChat;
                                }
                                return updatedHistory;
                              });
                            }
                          }
                          
                          // Now set the new chat as active and load its messages
                          console.log("✅ Setting active chat to:", clickedChat.id);
                          setSelectedChat(clickedChat.id);
                          setMessages([...clickedChat.messages]); // Create a copy to avoid reference issues
                        }
                      }}
                    >
                      <div style={{ 
                        color: '#687078', 
                        fontSize: '12px',
                        marginBottom: '0px',
                        textAlign: 'left'
                      }}>
                        {formatDate(chat.timestamp)}
                      </div>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        width: '100%'
                      }}>
                        <div style={{ 
                          fontSize: '20px',
                          fontWeight: selectedChat === chat.id ? 'normal' : 'normal',
                          color: selectedChat === chat.id ? '#0972d3' : '#666871',
                          textAlign: 'left',
                          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif'
                        }}>
                          {chat.title}
                        </div>
                        <Button
                          variant="icon"
                          iconName="remove"
                          onClick={(e) => handleDeleteChat(chat.id, e)}
                        />
                      </div>
                    </div>
                  ))}
                </SpaceBetween>
              </>
            ) : (
              <Box color="text-status-inactive">No chat history</Box>
            )}
          </div>
        </SpaceBetween>
      </Container>
    </div>
  );

  return (
    <AppLayout
      style={{ height: '100vh', margin: 0, padding: 0 }}
      navigation={<Navigation />}
      navigationOpen={navigationOpen}
      navigationWidth={280}
      onNavigationChange={({ detail }) => setNavigationOpen(detail.open)}
      toolsHide={true}
      contentType="default"
      content={
        <SpaceBetween size="s">
          <div style={{ marginTop: "5px"}}></div>
          <Container>
            <Header
              variant="h1"
              actions={
                <Select
                  selectedOption={selectedModel}
                  onChange={({ detail }) => setSelectedModel(detail.selectedOption)}
                  options={MODEL_OPTIONS}
                  placeholder="Select a model"
                />
              }
            >
              Chat
            </Header>
            <div style={{ marginTop: '0px' }}></div>
            <SpaceBetween size="xxl">
              <Container variant="borderless">
                <div style={{ 
                  height: "60vh", 
                  overflowY: "auto", 
                  padding: "15px",
                  marginTop: "0px",
                  width: "100%",
                  marginLeft: "-20px",
                  marginRight: "-20px"
                }}>
                  {messages.map((message, index) => (
                    <ChatMessage key={index} message={message} />
                  ))}
                </div>
              </Container>
              <div style={{ display: 'flex', gap: '16px', width: '100%' }}>
                <div style={{ flex: 1 }}>
                  <Textarea
                    value={inputMessage}
                    onChange={({ detail }) => setInputMessage(detail.value)}
                    placeholder="Ask your question here..."
                    rows={3}
                    onKeyDown={handleKeyDown}
                    disabled={!selectedChat}
                  />
                </div>
                <Button variant="primary" onClick={handleSend} disabled={!selectedChat || !inputMessage.trim()}>
                  Send
                </Button>
              </div>
            </SpaceBetween>
          </Container>
        </SpaceBetween>
      }
      ariaLabels={{
        navigation: "Side navigation",
        navigationClose: "Close side navigation",
        navigationToggle: "Open side navigation"
      }}
    />
  );
} 