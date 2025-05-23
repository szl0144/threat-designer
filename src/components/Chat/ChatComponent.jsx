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
import { sendChatMessage } from '../../services/chatService';

const MODEL_OPTIONS = [
  { label: "Amazon Nova Lite", value: "us.amazon.nova-lite-v1:0", },
  { label: "Amazon Nova Micro", value: "us.amazon.nova-micro-v1:0" },
  { label: "Amazon Nova Premier", value: "us.amazon.nova-premier-v1:0" },
  { label: "Amazon Nova Pro", value: "us.amazon.nova-pro-v1:0" },
  { label: "Claude 4.0 Opus", value: "us.anthropic.claude-opus-4-20250514-v1:0" },
  { label: "Claude 4.0 Sonnet", value: "us.amazon.nova-pro-v1:0" },
  { label: "Claude 3.7 Sonnet", value: "us.anthropic.claude-sonnet-4-20250514-v1:0" },
  { label: "Claude 3.5 Sonnet v2", value: "us.anthropic.claude-3-5-sonnet-20241022-v2:0" },
  { label: "Claude 3.5 Haiku", value: "us.anthropic.claude-3-5-haiku-20241022-v1:0" },
  { label: "DeepSeek-R1", value: "us.deepseek.r1-v1:0" }
];

const RED_TEAM_PROMPT = `You are a cloud security professional specialized in adversary emulation and threat preparedness. I will provide you with a detailed threat modeling report for a cloud-based application.

Based on this report, I would like you to:
1. Propose a security validation plan that follows industry frameworks (e.g., MITRE ATT&CK, OWASP Top 10 for LLMs).
2. For each major risk or attacker model, suggest one or more controlled simulation exercises.
3. For each exercise, describe:
   - Objective
   - Emulated kill chain steps (e.g., access testing, lateral access, exfil simulation)
   - Tools or techniques for ethical simulation in a lab environment
   - Visibility and logging checkpoints
   - Recommendations for detection and mitigation validation
4. Where applicable, provide example test scripts (in Bash, Python, or Terraform) to demonstrate scenarios in a sandbox environment.
5. Ensure all actions are for educational or internal validation purposes only, and follow ethical red team/blue team engagement practices.`;

const IAC_TEMPLATE_PROMPT = `You are a cloud security engineer specializing in secure infrastructure-as-code (IaC) and threat mitigation.

I will provide you with A threat modeling report that lists identified risks, vulnerabilities, and misconfigurations in a specific cloud environment.
The report may includes an infrastructure-as-code (IaC) template file (in Terraform, AWS CloudFormation, or OpenAPI format) that represents the current, potentially insecure, cloud configuration.

Your task is to:
- Carefully review the threat modeling report and cross-reference it with the provided IaC template.
- Identify the insecure configurations, missing security controls, or exploitable design issues described in the report.
- If I provide you with an IaC template, Modify the IaC template to address and remediate all identified threats and vulnerabilities. 
- Ensure the updated IaC file follows best practices in cloud security (e.g., least privilege, encryption, logging, input validation, etc.).
- Do not explain your reasoning. Just return the fully remediated, secure IaC file as your output.
- If no IaC template is provided, response with "No IaC template provided".

⚠️ Notes:
- Keep the file format the same as the original input (Terraform, CloudFormation, or OpenAPI).
- Do not include any comments or explanations unless explicitly required in the syntax.
- Assume the code will be deployed in a production-grade environment.`;

const Remediate_Prompt = `You are a cloud security architect experienced in threat modeling and infrastructure remediation using AWS CloudFormation.

I will provide you with a full threat modeling report that identifies potential security risks, misconfigurations, and vulnerabilities in a cloud-based system architecture.

Your task is to:
1. Carefully analyze the threats listed in the report.
2. For each threat, suggest a concrete remediation strategy, step-by-step.
3. Where applicable, generate AWS CloudFormation YAML code snippets to implement the mitigation or fix directly in the infrastructure.
4. Use only native AWS services and security best practices (e.g., IAM least privilege, encryption at rest and in transit, secure logging, VPC isolation, etc.).
5. Include references to the original threat IDs or categories, so the fixes are traceable back to the report.

Formatting requirements:
- Clearly label each threat ID or name from the report.
- Provide either:
   a) a step-by-step explanation of how to remediate it,   
   b) a YAML CloudFormation code block that implements the fix. (if can)
- Do not include any unrelated commentary or generic suggestions.
- Assume the audience understands AWS but needs clear, actionable remediation advice.`

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

  const handleSend = async () => {
    if (inputMessage.trim() && selectedChat) {
      // Get the current chat to find the threat model ID
      const currentChat = chatHistory.find(chat => chat.id === selectedChat);
      if (!currentChat || !currentChat.modelId) {
        console.error('No threat model associated with current chat');
        return;
      }

      // Create an updated messages array with the new user message
      const updatedMessages = [...messages, { role: 'user', content: inputMessage }];
      const userMessage = inputMessage;
      
      setMessages(updatedMessages);
      setInputMessage('');
      
      // Add a loading message
      const loadingMessage = { role: 'assistant', content: 'Generating...' };
      const messagesWithLoading = [...updatedMessages, loadingMessage];
      setMessages(messagesWithLoading);
      
      try {
        // Send the message to the backend
        const response = await sendChatMessage(
          userMessage,
          currentChat.modelId, // threat model ID
          selectedModel.value // selected AI model ID
        );
        
        // Replace loading message with actual response
        const responseMessage = { 
          role: 'assistant', 
          content: response.response || 'No response received from the AI model.'
        };
        
        const messagesWithResponse = [...updatedMessages, responseMessage];
        setMessages(messagesWithResponse);
        
        // Update chat history
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
          return updatedHistory;
        });
        
      } catch (error) {
        console.error('Error sending message:', error);
        
        // Replace loading message with error message
        const errorMessage = { 
          role: 'assistant', 
          content: `Sorry, there was an error processing your request: ${error.message}`
        };
        
        const messagesWithError = [...updatedMessages, errorMessage];
        setMessages(messagesWithError);
        
        // Update chat history with error
        setChatHistory(prev => {
          const updatedHistory = [...prev];
          const chatIndex = updatedHistory.findIndex(c => c.id === selectedChat);
          if (chatIndex !== -1) {
            updatedHistory[chatIndex] = {
              ...updatedHistory[chatIndex],
              messages: messagesWithError,
              timestamp: Date.now()
            };
          }
          return updatedHistory;
        });
      }
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
                        padding: '0px 16px 5px 0px',
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
                          fontSize: '18px',
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
            <SpaceBetween size="xs">
              <Container variant="borderless">
                <div style={{ 
                  height: "60vh", 
                  overflowY: "auto", 
                  padding: "0",
                  width: "100%",
                  margin: "0"
                }}>
                  {messages.map((message, index) => (
                    <ChatMessage key={index} message={message} />
                  ))}
                </div>
              </Container>
              
              <div style={{ display: 'flex', justifyContent: 'flex-start', gap: '16px', marginBottom: '5px', marginTop: '-15px' }}>
                <div 
                  onClick={() => setInputMessage(RED_TEAM_PROMPT)}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #0972d3',
                    borderRadius: '16px',
                    padding: '8px 16px',
                    color: '#0972d3',
                    cursor: 'pointer',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                    transition: 'all 0.2s ease',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  Generate Red Teaming Solution
                </div>
                <div 
                  onClick={() => setInputMessage( IAC_TEMPLATE_PROMPT)}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #0972d3',
                    borderRadius: '16px',
                    padding: '8px 16px',
                    color: '#0972d3',
                    cursor: 'pointer',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                    transition: 'all 0.2s ease',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  Give me the remediated IaC template
                </div>
                <div 
                  onClick={() => setInputMessage(Remediate_Prompt)}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #0972d3',
                    borderRadius: '16px',
                    padding: '8px 16px',
                    color: '#0972d3',
                    cursor: 'pointer',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                    transition: 'all 0.2s ease',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  Generate the threat remediation plan
                </div>
              </div>
              
              
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