import React, { useState, useEffect, useRef } from 'react';
import { Mic, Loader2, MessageSquare, X, Send } from 'lucide-react';
import { processVoiceInput } from '../aiEngine';

export default function FloatingVoiceAssistant({ appData }) {
  const [isOpen, setIsOpen] = useState(false);
  const [chatLang, setChatLang] = useState('en-US');
  const [messages, setMessages] = useState([
    { id: 1, sender: 'ai', text: "Hello! I am your Farmer's Companion. You can speak to me or type your questions below." }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Update initial greeting when language changes (if it's the only message)
  useEffect(() => {
    if (messages.length === 1 && messages[0].id === 1) {
      const greetings = {
        'en-US': "Hello! I am your Farmer's Companion. You can speak to me or type your questions below.",
        'hi-IN': "Namaste! Main aapka Kisan Saathi hoon. Aap mujhse khet ke baare mein pooch sakte hain.",
        'kn-IN': "ನಮಸ್ಕಾರ! ನಾನು ನಿಮ್ಮ ರೈತ ಮಿತ್ರ. ನಿಮ್ಮ ಹೊಲದ ಬಗ್ಗೆ ನನ್ನನ್ನು ಕೇಳಬಹುದು."
      };
      setMessages([{ id: 1, sender: 'ai', text: greetings[chatLang] || greetings['en-US'] }]);
    }
  }, [chatLang]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-IN'; 

      recognitionRef.current.onstart = () => setIsListening(true);
      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        handleUserInput(transcript);
      };
      recognitionRef.current.onerror = (event) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
      };
      recognitionRef.current.onend = () => setIsListening(false);
    }
  }, []);

  const handleUserInput = (text) => {
    setIsListening(false);
    if (!text.trim()) return;

    setMessages(prev => [...prev, { id: Date.now(), sender: 'user', text }]);
    
    // Slight delay for realism
    setTimeout(() => {
      const response = processVoiceInput(text, appData, chatLang); 
      setMessages(prev => [...prev, { id: Date.now(), sender: 'ai', text: response }]);
      speakResponse(response, chatLang);
    }, 400);
  };

  const handleTextSubmit = (e) => {
    e.preventDefault();
    handleUserInput(inputValue);
    setInputValue('');
  };

  const speakResponse = (text, lang) => {
    if (!text || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    if (lang === 'hi-IN' || text.includes('hai') || text.includes('hoon') || text.includes('khet')) {
      utterance.lang = 'hi-IN';
    } else if (lang === 'kn-IN' || text.includes('ide') || text.includes('agide') || text.includes('ondu')) {
      utterance.lang = 'kn-IN';
    } else {
      utterance.lang = 'en-US';
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      if (isSpeaking) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
      }
      recognitionRef.current?.start();
    }
  };

  return (
    <>
      {/* Floating Chat Window */}
      {isOpen && (
        <div style={{
          position: 'fixed',
          bottom: '100px',
          right: '24px',
          width: '350px',
          height: '500px',
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 9999,
          overflow: 'hidden',
          border: '1px solid #e5e7eb'
        }}>
          {/* Header */}
          <div style={{
            padding: '16px',
            backgroundColor: '#16a34a',
            color: 'white',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontWeight: '600'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {isSpeaking ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <MessageSquare size={18} />}
              {chatLang === 'hi-IN' ? "Kisan Saathi" : chatLang === 'kn-IN' ? "ರೈತ ಮಿತ್ರ" : "Farmer's Companion"}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <select 
                value={chatLang}
                onChange={(e) => {
                  setChatLang(e.target.value);
                  if (recognitionRef.current) recognitionRef.current.lang = e.target.value;
                }}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: '1px solid rgba(255,255,255,0.4)',
                  color: 'white',
                  borderRadius: '4px',
                  padding: '2px 4px',
                  fontSize: '12px',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="en-US" style={{ color: 'black' }}>EN</option>
                <option value="hi-IN" style={{ color: 'black' }}>HI</option>
                <option value="kn-IN" style={{ color: 'black' }}>KN</option>
              </select>
              <button 
                onClick={() => setIsOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', display: 'flex' }}
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Message List */}
          <div style={{
            flex: 1,
            padding: '16px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            backgroundColor: '#f9fafb'
          }}>
            {messages.map(msg => (
              <div key={msg.id} style={{
                alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                backgroundColor: msg.sender === 'user' ? '#16a34a' : '#e5e7eb',
                color: msg.sender === 'user' ? 'white' : '#1f2937',
                padding: '10px 14px',
                borderRadius: '12px',
                maxWidth: '80%',
                fontSize: '14px',
                lineHeight: '1.4'
              }}>
                {msg.text}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={handleTextSubmit} style={{
            padding: '12px',
            borderTop: '1px solid #e5e7eb',
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
            backgroundColor: 'white'
          }}>
            <button
              type="button"
              onClick={toggleListening}
              disabled={!recognitionRef.current}
              style={{
                background: 'transparent',
                border: 'none',
                color: isListening ? '#ef4444' : '#6b7280',
                cursor: recognitionRef.current ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '8px',
                borderRadius: '50%',
                backgroundColor: isListening ? '#fee2e2' : 'transparent',
                transition: 'all 0.2s',
                animation: isListening ? 'pulse 1.5s infinite' : 'none'
              }}
              title={recognitionRef.current ? "Click to speak" : "Voice not supported"}
            >
              <Mic size={20} />
            </button>
            <input 
              type="text" 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={chatLang === 'hi-IN' ? "Khet ke baare mein puchein..." : chatLang === 'kn-IN' ? "ಹೊಲದ ಬಗ್ಗೆ ಕೇಳಿ..." : "Ask me about your farm..."}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: '20px',
                border: '1px solid #d1d5db',
                outline: 'none',
                fontSize: '14px'
              }}
            />
            <button 
              type="submit"
              disabled={!inputValue.trim()}
              style={{
                background: '#16a34a',
                border: 'none',
                color: 'white',
                cursor: inputValue.trim() ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '10px',
                borderRadius: '50%',
                opacity: inputValue.trim() ? 1 : 0.5
              }}
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}

      {/* Floating Toggle Button */}
      <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999 }}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          style={{
            padding: '16px',
            borderRadius: '50%',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            backgroundColor: '#16a34a',
            color: 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            transition: 'all 0.2s',
            transform: isOpen ? 'scale(0.9)' : 'scale(1)'
          }}
          title="Open AI Companion"
        >
          {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
        </button>
      </div>
      
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: .5; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
