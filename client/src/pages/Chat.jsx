import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Send, Sparkles, Phone, ArrowLeft } from 'lucide-react';
import useAuthStore from '../store/authStore';
import { connectSocket, getSocket } from '../services/socket';
import api from '../services/api';
import toast from 'react-hot-toast';

const Chat = () => {
  const { userId: targetUserId } = useParams();
  const { user: me, token } = useAuthStore();
  const [conversations, setConversations] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPages, setHistoryPages] = useState(1);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(null);
  const [summarizing, setSummarizing] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const activeRoomRef = useRef(null);
  const shouldStickToBottomRef = useRef(true);
  const preserveScrollRef = useRef(null);

  const getRoomId = (id1, id2) => [id1, id2].sort().join('_');
  const loadHistoryPage = useCallback(async (roomId, page, mode = 'replace') => {
    const container = messagesContainerRef.current;
    if (mode === 'append-older' && container) {
      preserveScrollRef.current = {
        previousHeight: container.scrollHeight,
        previousTop: container.scrollTop,
      };
    }

    const { data } = await api.get(`/messages/${roomId}?page=${page}&limit=30`);
    const nextMessages = data.messages || [];

    setMessages((prev) => (
      mode === 'append-older' ? [...nextMessages, ...prev] : nextMessages
    ));
    setHistoryPage(data.pagination?.page || page);
    setHistoryPages(data.pagination?.pages || 1);
  }, []);

  const mergeIncomingMessage = useCallback((incomingMessage) => {
    setMessages((prev) => {
      const existingIndex = prev.findIndex((message) => (
        incomingMessage.clientMessageId && message.clientMessageId === incomingMessage.clientMessageId
      ));

      if (existingIndex !== -1) {
        const nextMessages = [...prev];
        nextMessages[existingIndex] = incomingMessage;
        return nextMessages;
      }

      if (incomingMessage._id && prev.some((message) => message._id === incomingMessage._id)) {
        return prev;
      }

      return [...prev, incomingMessage];
    });
  }, []);

  const sortConversations = useCallback((items) => (
    [...items].sort((a, b) => {
      if (a.lastMessageAt && b.lastMessageAt) {
        return new Date(b.lastMessageAt) - new Date(a.lastMessageAt);
      }
      if (a.lastMessageAt) return -1;
      if (b.lastMessageAt) return 1;
      return (a.name || '').localeCompare(b.name || '');
    })
  ), []);

  const buildConversationList = useCallback((conversationData) => {
    const mapped = (conversationData || []).map((item) => ({
      ...item.user,
      roomId: item.roomId || getRoomId(me._id, item.user._id),
      lastMessage: item.lastMessage || '',
      lastMessageAt: item.lastMessageAt || null,
    }));

    return sortConversations(mapped);
  }, [me._id, sortConversations]);

  const updateConversationPresence = useCallback((userId, isOnline) => {
    setConversations((prev) => prev.map((user) => (
      user._id === userId ? { ...user, isOnline } : user
    )));
    setActiveChat((prev) => (
      prev?._id === userId ? { ...prev, isOnline } : prev
    ));
  }, []);

  const updateConversationPreview = useCallback((message) => {
    const senderId = message.sender?._id || message.sender;
    const receiverId = message.receiver?._id || message.receiver;
    const partnerId = senderId === me._id ? receiverId : senderId;
    const roomId = message.roomId || getRoomId(me._id, partnerId);
    const content = message.content || '';
    const createdAt = message.createdAt || new Date().toISOString();

    setConversations((prev) => {
      const existing = prev.find((user) => user._id === partnerId);
      if (!existing) return prev;

      const updated = prev.map((user) => (
        user._id === partnerId
          ? { ...user, roomId, lastMessage: content, lastMessageAt: createdAt }
          : user
      ));

      return sortConversations(updated);
    });

    setActiveChat((prev) => (
      prev?._id === partnerId
        ? { ...prev, roomId, lastMessage: content, lastMessageAt: createdAt }
        : prev
    ));
  }, [getRoomId, me._id, sortConversations]);

  const loadConversations = useCallback(async () => {
    try {
      const { data } = await api.get('/messages/conversations');
      const nextConversations = buildConversationList(data.conversations || []);
      setConversations(nextConversations);

      if (targetUserId) {
        const target = nextConversations.find((user) => user._id === targetUserId);
        if (target) {
          setActiveChat(target);
          setShowSidebar(false);
        }
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  }, [buildConversationList, targetUserId]);

  useEffect(() => {
    activeRoomRef.current = activeChat ? getRoomId(me._id, activeChat._id) : null;
  }, [activeChat, me._id]);

  useEffect(() => {
    const socket = connectSocket(token);
    loadConversations();

    const handleIncomingMessage = (msg) => {
      if (msg.roomId === activeRoomRef.current) {
        mergeIncomingMessage(msg);
      }
      updateConversationPreview(msg);
    };

    const handleUsersOnline = (ids) => {
      setConversations((prev) => prev.map((user) => ({
        ...user,
        isOnline: ids.includes(user._id),
      })));
      setActiveChat((prev) => prev ? { ...prev, isOnline: ids.includes(prev._id) } : prev);
    };

    socket.on('chat:message', handleIncomingMessage);
    socket.on('chat:typing', ({ name }) => setTyping(name));
    socket.on('chat:stop-typing', () => setTyping(null));
    socket.on('users:online', handleUsersOnline);
    socket.on('user:online', ({ userId }) => updateConversationPresence(userId, true));
    socket.on('user:offline', ({ userId }) => updateConversationPresence(userId, false));
    socket.on('chat:notification', ({ from, message: content }) => {
      toast(`${from}: ${content}`, { icon: '💬' });
    });

    return () => {
      socket.off('chat:message', handleIncomingMessage);
      socket.off('chat:typing');
      socket.off('chat:stop-typing');
      socket.off('users:online', handleUsersOnline);
      socket.off('user:online');
      socket.off('user:offline');
      socket.off('chat:notification');
    };
  }, [loadConversations, mergeIncomingMessage, token, updateConversationPresence, updateConversationPreview]);

  useEffect(() => {
    if (!activeChat) return undefined;

    const socket = getSocket();
    const roomId = getRoomId(me._id, activeChat._id);
    socket.emit('chat:join', roomId);

    const loadHistory = async () => {
      try {
        await loadHistoryPage(roomId, 1);
      } catch (err) {
        console.error('Failed to load messages:', err);
        setMessages([]);
        setHistoryPage(1);
        setHistoryPages(1);
      }
    };

    loadHistory();

    return () => {
      socket.emit('chat:leave', roomId);
    };
  }, [activeChat, loadHistoryPage, me._id]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    if (preserveScrollRef.current) {
      const { previousHeight, previousTop } = preserveScrollRef.current;
      container.scrollTop = container.scrollHeight - previousHeight + previousTop;
      preserveScrollRef.current = null;
      return;
    }

    if (shouldStickToBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleMessagesScroll = () => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    shouldStickToBottomRef.current = distanceFromBottom < 80;
  };

  const handleSelectUser = (user) => {
    setActiveChat(user);
    setShowSidebar(false);
  };

  const handleBackToList = () => {
    setShowSidebar(true);
    setActiveChat(null);
  };

  const sendMessage = () => {
    if (!input.trim() || !activeChat) return;

    const socket = getSocket();
    const roomId = getRoomId(me._id, activeChat._id);
    const content = input.trim();
    const clientMessageId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    mergeIncomingMessage({
      _id: clientMessageId,
      clientMessageId,
      sender: { _id: me._id, name: me.name },
      receiver: activeChat._id,
      roomId,
      content,
      createdAt: new Date().toISOString(),
      pending: true,
    });

    socket.emit('chat:message', {
      roomId,
      receiverId: activeChat._id,
      content,
      clientMessageId,
    });

    updateConversationPreview({
      sender: me._id,
      receiver: activeChat._id,
      roomId,
      content,
      createdAt: new Date().toISOString(),
    });

    socket.emit('chat:stop-typing', { roomId });
    setInput('');
  };

  const handleTyping = () => {
    const socket = getSocket();
    if (!activeChat) return;

    const roomId = getRoomId(me._id, activeChat._id);
    socket.emit('chat:typing', { roomId });

    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('chat:stop-typing', { roomId });
    }, 2000);
  };

  const handleSummarize = async () => {
    if (!activeChat) return;

    setSummarizing(true);
    try {
      const roomId = getRoomId(me._id, activeChat._id);
      const { data } = await api.post('/ai/summarize', { roomId });
      toast.success('Summary generated!');
      setMessages((prev) => [...prev, {
        _id: `summary-${Date.now()}`,
        sender: { _id: 'ai', name: 'AI Assistant' },
        content: `📋 **Summary**: ${data.summary}`,
        type: 'ai-summary',
        createdAt: new Date().toISOString(),
      }]);
    } catch (err) {
      toast.error('Failed to summarize');
    }
    setSummarizing(false);
  };

  const handleLoadOlder = async () => {
    if (!activeChat || loadingOlder || historyPage >= historyPages) return;

    setLoadingOlder(true);
    try {
      const roomId = getRoomId(me._id, activeChat._id);
      await loadHistoryPage(roomId, historyPage + 1, 'append-older');
    } catch (err) {
      toast.error('Failed to load older messages');
    } finally {
      setLoadingOlder(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-0 sm:gap-4 fade-in">
      <div className={`${showSidebar ? 'flex' : 'hidden'} sm:flex w-full sm:w-72 glass rounded-2xl flex-col shrink-0 overflow-hidden`}>
        <div className="p-4 border-b border-dark-400">
          <h2 className="text-lg font-semibold text-white">Messages</h2>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {conversations.map((u) => (
            <button
              key={u._id}
              onClick={() => handleSelectUser(u)}
              className={`w-full flex items-center gap-3 px-4 py-3 transition-colors text-left ${activeChat?._id === u._id ? 'bg-primary-600/20' : 'hover:bg-dark-500'}`}
            >
              <div className="relative flex-shrink-0">
                {u.avatar ? (
                  <img src={u.avatar} alt={u.name} className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-sm font-semibold">
                    {u.name?.[0]?.toUpperCase()}
                  </div>
                )}
                {u.isOnline && <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-dark-600 pulse-dot" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm text-white font-medium truncate">{u.name}</p>
                  {u.lastMessageAt && (
                    <span className="text-[10px] text-dark-300 whitespace-nowrap">
                      {new Date(u.lastMessageAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <p className="text-xs text-dark-200 truncate">
                  {u.lastMessage || u.skills?.[0]?.name || 'Start a conversation'}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {activeChat ? (
        <div className={`${!showSidebar ? 'flex' : 'hidden'} sm:flex flex-1 glass rounded-2xl flex-col overflow-hidden`}>
          <div className="flex items-center justify-between p-3 sm:p-4 border-b border-dark-400">
            <div className="flex items-center gap-3">
              <button onClick={handleBackToList} className="sm:hidden p-2 rounded-lg text-dark-100 hover:bg-dark-500 transition-colors -ml-1">
                <ArrowLeft className="w-5 h-5" />
              </button>
              {activeChat.avatar ? (
                <img src={activeChat.avatar} alt={activeChat.name} className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover" />
              ) : (
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-semibold text-sm sm:text-base">
                  {activeChat.name?.[0]?.toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-white font-medium text-sm sm:text-base">{activeChat.name}</p>
                <p className="text-xs text-dark-200">{activeChat.isOnline ? '🟢 Online' : '⚪ Offline'}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <button onClick={handleSummarize} disabled={summarizing} className="p-2 rounded-lg text-primary-400 hover:bg-primary-600/20 transition-colors" title="AI Summarize">
                <Sparkles className={`w-4 h-4 sm:w-5 sm:h-5 ${summarizing ? 'animate-spin' : ''}`} />
              </button>
              <button className="p-2 rounded-lg text-dark-100 hover:bg-dark-500 transition-colors">
                <Phone className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>

          <div ref={messagesContainerRef} onScroll={handleMessagesScroll} className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
            {historyPage < historyPages && (
              <div className="flex justify-center">
                <button
                  onClick={handleLoadOlder}
                  disabled={loadingOlder}
                  className="px-3 py-1.5 rounded-lg bg-dark-500 text-dark-50 text-xs hover:bg-dark-400 transition-colors disabled:opacity-60"
                >
                  {loadingOlder ? 'Loading...' : 'Load older messages'}
                </button>
              </div>
            )}
            {messages.length === 0 && (
              <div className="text-center py-12 sm:py-20">
                <p className="text-dark-200">No messages yet</p>
                <p className="text-dark-300 text-sm">Say hello to start the conversation! 👋</p>
              </div>
            )}
            {messages.map((msg) => {
              const isOwn = msg.sender?._id === me._id || msg.sender === me._id;
              const isAI = msg.type === 'ai-summary';
              return (
                <div key={msg._id || msg.createdAt} className={`flex ${isAI ? 'justify-center' : isOwn ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] sm:max-w-[70%] px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl text-sm ${
                    isAI ? 'bg-primary-600/20 text-primary-200 border border-primary-500/20' :
                    isOwn ? 'bg-primary-600 text-white rounded-br-md' :
                    'bg-dark-500 text-dark-50 rounded-bl-md'
                  }`}>
                    {!isOwn && !isAI && <p className="text-xs text-primary-400 font-medium mb-1">{msg.sender?.name}</p>}
                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                    {msg.pending && <p className="mt-1 text-[10px] opacity-70">Sending...</p>}
                  </div>
                </div>
              );
            })}
            {typing && (
              <div className="flex items-center gap-2 text-dark-200 text-sm">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-dark-200 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-dark-200 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-dark-200 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                {typing} is typing...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 sm:p-4 border-t border-dark-400">
            <div className="flex gap-2 sm:gap-3">
              <input
                id="chat-input"
                type="text"
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  handleTyping();
                }}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Type a message..."
                className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 bg-dark-700 border border-dark-400 rounded-xl text-white placeholder-dark-200 focus:outline-none focus:border-primary-500 transition-colors text-sm sm:text-base"
              />
              <button id="chat-send" onClick={sendMessage} className="px-4 sm:px-5 py-2.5 sm:py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-500 transition-colors">
                <Send className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className={`${!showSidebar ? 'flex' : 'hidden'} sm:flex flex-1 glass rounded-2xl items-center justify-center`}>
          <div className="text-center p-8">
            <div className="w-16 h-16 rounded-2xl bg-dark-500 flex items-center justify-center mx-auto mb-4">
              <Send className="w-8 h-8 text-dark-200" />
            </div>
            <p className="text-dark-100 text-lg">Select a conversation</p>
            <p className="text-dark-300 text-sm">Choose someone from the sidebar to start chatting</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;
