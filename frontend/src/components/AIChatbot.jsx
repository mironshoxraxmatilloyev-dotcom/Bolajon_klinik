import { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';

export default function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [typingMessage, setTypingMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const typingIntervalRef = useRef(null);

  useEffect(() => {
    // Session ID yaratish yoki localStorage'dan olish
    let sid = localStorage.getItem('chatbot_session_id');
    if (!sid) {
      sid = uuidv4();
      localStorage.setItem('chatbot_session_id', sid);
    }
    setSessionId(sid);

    // Suhbat tarixini localStorage'dan yuklash
    const savedMessages = localStorage.getItem('chatbot_messages');
    if (savedMessages) {
      setMessages(JSON.parse(savedMessages));
    } else {
      // Boshlang'ich xabar
      setMessages([{
        role: 'assistant',
        content: 'Assalomu alaykum! Men klinika AI yordamchisiman. Sizga qanday yordam bera olaman?',
        timestamp: new Date().toISOString()
      }]);
    }
  }, []);

  useEffect(() => {
    // Xabarlarni localStorage'ga saqlash
    if (messages.length > 0) {
      localStorage.setItem('chatbot_messages', JSON.stringify(messages));
    }
  }, [messages]);

  useEffect(() => {
    // Scroll to bottom
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingMessage]);

  useEffect(() => {
    // Cleanup typing interval on unmount
    return () => {
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
      }
    };
  }, []);

  const typeMessage = (fullMessage) => {
    setIsTyping(true);
    setTypingMessage('');
    let currentIndex = 0;

    typingIntervalRef.current = setInterval(() => {
      if (currentIndex < fullMessage.length) {
        setTypingMessage(prev => prev + fullMessage[currentIndex]);
        currentIndex++;
      } else {
        clearInterval(typingIntervalRef.current);
        setIsTyping(false);
        
        // Add the complete message to messages array
        const aiMessage = {
          role: 'assistant',
          content: fullMessage,
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, aiMessage]);
        setTypingMessage('');
      }
    }, 30); // 30ms per character for smooth typing effect
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading || isTyping) return;

    const userMessage = {
      role: 'user',
      content: inputMessage,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001/api/v1';
      const response = await fetch(`${apiUrl}/ai-chatbot/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: inputMessage,
          sessionId
        })
      });

      const data = await response.json();

      if (data.success) {
        // Start typing animation instead of adding message directly
        typeMessage(data.message);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = 'Kechirasiz, AI chatbot xizmati hozircha ishlamayapti. Iltimos, keyinroq urinib ko\'ring yoki administrator bilan bog\'laning.';
      typeMessage(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    // Clear typing animation if active
    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current);
    }
    setIsTyping(false);
    setTypingMessage('');
    
    setMessages([{
      role: 'assistant',
      content: 'Assalomu alaykum! Men klinika AI yordamchisiman. Sizga qanday yordam bera olaman?',
      timestamp: new Date().toISOString()
    }]);
    localStorage.removeItem('chatbot_messages');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Chat Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-green-500 to-purple-600 text-white rounded-full p-4 shadow-2xl hover:scale-110 transition-transform duration-300 animate-bounce"
          aria-label="AI Chatbot"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
            AI
          </span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-96 h-[600px] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-500 to-purple-600 text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></span>
              </div>
              <div>
                <h3 className="font-bold">AI Yordamchi</h3>
                <p className="text-xs opacity-90">Online</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={clearChat}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                title="Suhbatni tozalash"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-r from-green-500 to-purple-600 text-white shadow-lg'
                      : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 shadow-md'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  <p className={`text-xs mt-1 ${msg.role === 'user' ? 'text-white/70' : 'text-gray-500'}`}>
                    {new Date(msg.timestamp).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
            
            {/* Typing Animation Message */}
            {isTyping && typingMessage && (
              <div className="flex justify-start animate-fadeIn">
                <div className="max-w-[80%] bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-2xl px-4 py-3 shadow-md">
                  <p className="text-sm whitespace-pre-wrap">{typingMessage}<span className="animate-pulse">|</span></p>
                </div>
              </div>
            )}
            
            {/* Loading Indicator */}
            {isLoading && !isTyping && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-gray-800 rounded-2xl px-4 py-3 shadow-md">
                  <div className="flex gap-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
            <div className="flex gap-2">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Savolingizni yozing..."
                className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:outline-none resize-none bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200"
                rows="2"
                disabled={isLoading || isTyping}
              />
              <button
                onClick={sendMessage}
                disabled={isLoading || isTyping || !inputMessage.trim()}
                className="px-6 py-3 bg-gradient-to-r from-green-500 to-purple-600 text-white rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">
              AI yordamchi tibbiyot va klinika haqida savollar javob beradi
            </p>
          </div>
        </div>
      )}
    </>
  );
}
