'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { MessageSquare, Send, Bot, User, Loader2, Trash2, Menu, X, ArrowLeft } from 'lucide-react';
import { useTheme } from '@/lib/theme-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
}

export default function ChatPage() {
   const router = useRouter();
   const { theme } = useTheme();
   const [user, setUser] = useState<any>(null);
   const [chats, setChats] = useState<Chat[]>([]);
   const [currentChatId, setCurrentChatId] = useState<string>('');
   const [inputMessage, setInputMessage] = useState('');
   const [loading, setLoading] = useState(true);
   const [transactions, setTransactions] = useState<any[]>([]);
   const [isTyping, setIsTyping] = useState(false);
   const [sidebarOpen, setSidebarOpen] = useState(false);
   const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
   const [chatToDelete, setChatToDelete] = useState<string | null>(null);
   const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkUser();
    fetchTransactions();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }
    setUser(user);
    loadChats(user.id);
  };

  const fetchTransactions = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.error('No session token available');
        setTransactions([]);
        return;
      }

      const response = await fetch('/api/transactions', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setTransactions(data);
      } else {
        console.error('Failed to fetch transactions:', response.status);
        setTransactions([]);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setTransactions([]);
    }
  };

  const loadChats = (userId: string) => {
    const savedChats = localStorage.getItem(`budgetChats_${userId}`);
    if (savedChats) {
      const parsedChats: Chat[] = JSON.parse(savedChats).map((chat: any) => ({
        ...chat,
        createdAt: new Date(chat.createdAt),
        messages: chat.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }))
      }));
      setChats(parsedChats);
      if (parsedChats.length > 0) {
        setCurrentChatId(parsedChats[0].id);
      } else {
        createNewChat();
      }
    } else {
      createNewChat();
    }
    setLoading(false);
  };

  const saveChats = (chatsToSave: Chat[], userId: string) => {
    localStorage.setItem(`budgetChats_${userId}`, JSON.stringify(chatsToSave));
  };

  const createNewChat = () => {
    if (!user) return;
    const newChat: Chat = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [],
      createdAt: new Date()
    };
    const updatedChats = [newChat, ...chats];
    setChats(updatedChats);
    if (user?.id) {
      saveChats(updatedChats, user.id);
    }
    setCurrentChatId(newChat.id);
  };

  const getCurrentChat = () => {
    return chats.find(chat => chat.id === currentChatId);
  };

  const deleteChat = (chatId: string) => {
    const updatedChats = chats.filter(chat => chat.id !== chatId);
    setChats(updatedChats);
    saveChats(updatedChats, user.id);

    // If deleting current chat, switch to another or create new
    if (chatId === currentChatId) {
      if (updatedChats.length > 0) {
        setCurrentChatId(updatedChats[0].id);
      } else {
        createNewChat();
      }
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chats, isTyping]);


  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !currentChatId) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputMessage,
      sender: 'user',
      timestamp: new Date()
    };

    const currentInput = inputMessage;
    setInputMessage('');
    setIsTyping(true);

    // Update current chat with new message
    setChats(prev => prev.map(chat =>
      chat.id === currentChatId
        ? {
            ...chat,
            messages: [...chat.messages, userMessage],
            title: chat.messages.length === 0 ? currentInput.slice(0, 30) + (currentInput.length > 30 ? '...' : '') : chat.title
          }
        : chat
    ));

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: currentInput, transactions }),
      });
      const data = await res.json();
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: data.response,
        sender: 'ai',
        timestamp: new Date()
      };

      // Update current chat with AI response
      setChats(prev => {
        const updatedChats = prev.map(chat =>
          chat.id === currentChatId
            ? { ...chat, messages: [...chat.messages, aiResponse] }
            : chat
        );
        saveChats(updatedChats, user.id);
        return updatedChats;
      });
    } catch (error) {
      console.error('Error calling chat API:', error);
      // Show error message to user
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        text: 'Sorry, I encountered an error. Please try again.',
        sender: 'ai',
        timestamp: new Date()
      };
      setChats(prev => prev.map(chat =>
        chat.id === currentChatId
          ? { ...chat, messages: [...chat.messages, errorMessage] }
          : chat
      ));
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  const currentChat = getCurrentChat();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Button variant="outline" onClick={() => router.push('/dashboard')} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <MessageSquare className="h-8 w-8 text-indigo-600" />
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">AI Financial Assistant</h1>
            </div>
             <Button
               variant="outline"
               size="sm"
               className="md:hidden"
               onClick={() => setSidebarOpen(!sidebarOpen)}
             >
               {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
             </Button>
           </div>
        </div>

        <div className="flex gap-6">
          {/* Sidebar */}
          <div className={`w-80 flex-shrink-0 fixed md:relative inset-y-0 left-0 z-50 md:z-auto transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-300 ease-in-out`}>
            <div className="md:hidden fixed inset-0 bg-black bg-opacity-50" onClick={() => setSidebarOpen(false)}></div>
            <Card className="h-full md:h-[600px] w-80 relative z-10">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Chats</CardTitle>
                  <Button onClick={createNewChat} size="sm" className="bg-black hover:bg-gray-800 text-white">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    New Chat
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[calc(100vh-200px)] md:h-[500px]">
                  <div className="space-y-1 p-4">
                    {chats.map((chat) => (
                      <div
                        key={chat.id}
                        className={`group relative flex items-center p-3 rounded-lg transition-colors ${
                          chat.id === currentChatId
                            ? 'bg-indigo-100 text-indigo-900'
                            : 'hover:bg-gray-100 text-gray-700'
                        }`}
                      >
                        <button
                          onClick={() => {
                            setCurrentChatId(chat.id);
                            setSidebarOpen(false);
                          }}
                          className="flex-1 text-left"
                        >
                          <div className="font-medium truncate">{chat.title}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {chat.createdAt.toLocaleDateString()}
                          </div>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setChatToDelete(chat.id);
                            setDeleteDialogOpen(true);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded transition-opacity"
                          title="Delete chat"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Main Chat Area */}
          <div className="flex-1 md:ml-0">
            <Card className="min-h-[600px] flex flex-col">
              <CardHeader>
                <CardTitle>{currentChat?.title || 'New Chat'}</CardTitle>
              </CardHeader>

              <CardContent className="flex-1 flex flex-col">
                <div className="flex-1 overflow-y-auto pr-4 max-h-[500px]">
                  <div className="space-y-4 min-h-full">
                    {currentChat && currentChat.messages.length === 0 ? (
                      <div className="text-center text-gray-500 py-8">
                        <Bot className="w-12 h-12 mx-auto mb-4 text-indigo-600" />
                        <p>Ask me anything about your finances...</p>
                      </div>
                    ) : (
                      <>
                        {currentChat?.messages.map((message) => (
                          <div
                            key={message.id}
                            className={`flex items-start space-x-3 ${
                              message.sender === 'user' ? 'justify-end' : 'justify-start'
                            }`}
                          >
                            {message.sender === 'ai' && (
                              <div className="flex-shrink-0">
                                <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                                  <Bot className="w-4 h-4 text-indigo-600" />
                                </div>
                              </div>
                            )}

                            <div
                              className={`max-w-[280px] sm:max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                                message.sender === 'user'
                                  ? 'bg-indigo-600 text-white'
                                  : 'bg-indigo-100 text-indigo-900'
                              }`}
                            >
                              <p className="text-sm">{message.text}</p>
                              <p className="text-xs opacity-70 mt-1">
                                {message.timestamp.toLocaleTimeString()}
                              </p>
                            </div>

                            {message.sender === 'user' && (
                              <div className="flex-shrink-0">
                                <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center">
                                  <User className="w-4 h-4 text-white" />
                                </div>
                              </div>
                            )}
                          </div>
                        ))}

                        {isTyping && (
                          <div className="flex items-start space-x-3 justify-start">
                            <div className="flex-shrink-0">
                              <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                                <Bot className="w-4 h-4 text-indigo-600" />
                              </div>
                            </div>
                            <div className="bg-indigo-100 text-indigo-900 max-w-xs lg:max-w-md px-4 py-2 rounded-lg">
                              <div className="flex space-x-1">
                                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </div>

                <div className="flex space-x-2 mt-4">
                  <Input
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask me about your spending, budget, or financial goals..."
                    className="flex-1"
                  />
                  <Button onClick={handleSendMessage} disabled={!inputMessage.trim()}>
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
<div className="mt-4">
  <p className="text-sm text-gray-500 mb-2">Quick suggestions:</p>
  <div className="flex flex-wrap gap-2">
    {["How much did I spend this month?", "What's my budget for groceries?", "Suggest ways to save money", "Analyze my spending patterns", "Show me my expenses by category", "How can I improve my savings?", "What's my average daily spending?", "Compare my spending this month vs last month", "Give me tips for budgeting", "What are my top spending categories?", "How much have I saved this year?", "Predict my expenses for next month"].map((suggestion, index) => (
      <Button
        key={index}
        variant="outline"
        size="sm"
        onClick={() => {
          setInputMessage(suggestion);
          handleSendMessage();
        }}
      >
        {suggestion}
      </Button>
    ))}
  </div>
</div>
          </div>
        </div>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Chat</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this chat? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (chatToDelete) {
                  deleteChat(chatToDelete);
                  setChatToDelete(null);
                }
                setDeleteDialogOpen(false);
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
