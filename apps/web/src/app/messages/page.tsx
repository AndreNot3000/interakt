'use client';

import { useState } from 'react';
import {
  Search,
  Send,
  Image as ImageIcon,
  Paperclip,
  CheckCheck,
  MoreVertical,
  ShieldCheck,
  User,
  Users,
} from 'lucide-react';

export default function DirectMessagingPage() {
  const [selectedChat, setSelectedChat] = useState('c1');
  const [inputText, setInputText] = useState('');

  const conversations = [
    {
      id: 'c1',
      name: 'Chioma Eze',
      type: 'DIRECT',
      lastMessage: 'Thanks for sharing the recurrence tree notes!',
      time: '12:45 PM',
      unread: 0,
      level: '300L',
      dept: 'Computer Science',
      verified: true,
    },
    {
      id: 'c2',
      name: 'CSC 301 Study Team Alpha',
      type: 'GROUP',
      lastMessage: 'Ade: When are we meeting at the library?',
      time: '11:20 AM',
      unread: 3,
      level: 'Group Chat',
      dept: '5 members',
      verified: false,
    },
    {
      id: 'c3',
      name: 'Emeka Okafor',
      type: 'DIRECT',
      lastMessage: 'Are you attending the Developer Club meeting today?',
      time: 'Yesterday',
      unread: 0,
      level: '400L',
      dept: 'Computer Science',
      verified: true,
    },
  ];

  const [messages, setMessages] = useState([
    { id: 'm1', sender: 'Chioma Eze', isMe: false, text: 'Hey David, did you solve question 4 on Dijkstra’s algorithm?', time: '12:40 PM' },
    { id: 'm2', sender: 'David Adeyemi', isMe: true, text: 'Yes! You have to use a priority queue to achieve O((V + E) log V). Otherwise standard array scanning degrades it to O(V^2).', time: '12:43 PM' },
    { id: 'm3', sender: 'Chioma Eze', isMe: false, text: 'Thanks for sharing the recurrence tree notes! That makes total sense now.', time: '12:45 PM' },
  ]);

  const active = conversations.find((c) => c.id === selectedChat) || conversations[0];

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    setMessages([
      ...messages,
      {
        id: `m_${Date.now()}`,
        sender: 'David Adeyemi',
        isMe: true,
        text: inputText.trim(),
        time: 'Just now',
      },
    ]);
    setInputText('');
  };

  return (
    <div className="h-[calc(100vh-8.5rem)] bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden flex">
      {/* Conversations Left Rail */}
      <div className="w-80 border-r border-slate-200 flex flex-col h-full bg-slate-50/50">
        <div className="p-4 border-b border-slate-200">
          <h2 className="text-base font-extrabold text-slate-900 mb-3">Messages</h2>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {conversations.map((c) => {
            const isSelected = c.id === selectedChat;
            return (
              <button
                key={c.id}
                onClick={() => setSelectedChat(c.id)}
                className={`w-full text-left p-3.5 flex items-start gap-3 transition-colors ${
                  isSelected ? 'bg-blue-50/80 border-r-2 border-blue-600' : 'hover:bg-slate-100/70'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                  {c.name[0]}
                </div>
                <div className="flex-1 overflow-hidden">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-900 truncate">{c.name}</span>
                    <span className="text-[10px] text-slate-400">{c.time}</span>
                  </div>
                  <p className="text-xs text-slate-500 truncate">{c.lastMessage}</p>
                </div>
                {c.unread > 0 && (
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                    {c.unread}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Chat Thread Area */}
      <div className="flex-1 flex flex-col h-full bg-white">
        {/* Thread Header */}
        <div className="h-16 px-6 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
              {active.name[0]}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-slate-900">{active.name}</span>
                {active.verified && <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />}
              </div>
              <p className="text-[11px] text-slate-400">{active.dept} • {active.level}</p>
            </div>
          </div>

          <button className="p-2 text-slate-400 hover:text-slate-700">
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>

        {/* Message Bubble Stream */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col ${m.isMe ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-md px-4 py-2.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                  m.isMe
                    ? 'bg-blue-600 text-white rounded-tr-xs shadow-xs'
                    : 'bg-slate-100 text-slate-800 rounded-tl-xs'
                }`}
              >
                <p>{m.text}</p>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 px-1">{m.time}</span>
            </div>
          ))}
        </div>

        {/* Chat Input Bar */}
        <form
          onSubmit={handleSendMessage}
          className="p-4 border-t border-slate-200 bg-white flex items-center gap-2"
        >
          <button
            type="button"
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl"
          >
            <Paperclip className="w-4 h-4" />
          </button>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-600 focus:bg-white"
          />
          <button
            type="submit"
            className="p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors shadow-xs"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
