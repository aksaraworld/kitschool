'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/Auth/ProtectedRoute';
import { UserRole, Communication, User } from '@/lib/types';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/aksara-api';
import { MessageSquare, Send, User as UserIcon } from 'lucide-react';

export default function MessagesPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Communication[]>([]);
  const [sentMessages, setSentMessages] = useState<Communication[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<Communication | null>(null);
  const [activeTab, setActiveTab] = useState<'inbox' | 'sent'>('inbox');
  const [loading, setLoading] = useState(true);
  const [showCompose, setShowCompose] = useState(false);
  const [recipients, setRecipients] = useState<User[]>([]);

  const [newMessage, setNewMessage] = useState({
    to: '',
    subject: '',
    message: ''
  });

  useEffect(() => {
    fetchMessages();
    fetchRecipients();
  }, [activeTab]);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const inboxData = await api.get<Communication[]>('/communications', { params: { type: 'received' } });
      const sentData = await api.get<Communication[]>('/communications', { params: { type: 'sent' } });
      setMessages(inboxData);
      setSentMessages(sentData);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecipients = async () => {
    try {
      // Fetch potential recipients based on user role
      // Parents can message teachers, teachers can message parents, etc.
      const usersData = await api.get<User[]>('/users');
      setRecipients(usersData.filter((u: User) => u._id !== user?._id));
    } catch (error) {
      console.error('Error fetching recipients:', error);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/communications', newMessage);
      setNewMessage({ to: '', subject: '', message: '' });
      setShowCompose(false);
      fetchMessages();
      alert('Message sent successfully!');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to send message');
    }
  };

  const handleMarkAsRead = async (messageId: string) => {
    try {
      await api.put(`/communications/${messageId}/read`);
      fetchMessages();
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  const displayMessages = activeTab === 'inbox' ? messages : sentMessages;
  const unreadCount = messages.filter((m) => !m.isRead).length;

  return (
    <ProtectedRoute>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Messages</h1>
            <p className="text-gray-600 mt-2">Communicate with teachers, parents, and staff</p>
          </div>
          <button
            onClick={() => setShowCompose(!showCompose)}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center space-x-2"
          >
            <Send className="w-4 h-4" />
            <span>Compose</span>
          </button>
        </div>

        {showCompose && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Compose Message</h2>
            <form onSubmit={handleSendMessage} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  To
                </label>
                <select
                  value={newMessage.to}
                  onChange={(e) => setNewMessage({ ...newMessage, to: e.target.value })}
                  className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder:text-gray-500"
                  required
                >
                  <option value="">Select recipient</option>
                  {recipients.map((recipient) => (
                    <option key={recipient._id} value={recipient._id}>
                      {recipient.name} ({recipient.role})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subject
                </label>
                <input
                  type="text"
                  value={newMessage.subject}
                  onChange={(e) => setNewMessage({ ...newMessage, subject: e.target.value })}
                  className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder:text-gray-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message
                </label>
                <textarea
                  value={newMessage.message}
                  onChange={(e) => setNewMessage({ ...newMessage, message: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg h-32"
                  required
                />
              </div>
              <div className="flex space-x-4">
                <button
                  type="submit"
                  className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700"
                >
                  Send
                </button>
                <button
                  type="button"
                  onClick={() => setShowCompose(false)}
                  className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-lg shadow">
          <div className="border-b">
            <div className="flex">
              <button
                onClick={() => setActiveTab('inbox')}
                className={`flex-1 px-6 py-4 text-center font-medium ${
                  activeTab === 'inbox'
                    ? 'text-primary-600 border-b-2 border-primary-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Inbox {unreadCount > 0 && `(${unreadCount})`}
              </button>
              <button
                onClick={() => setActiveTab('sent')}
                className={`flex-1 px-6 py-4 text-center font-medium ${
                  activeTab === 'sent'
                    ? 'text-primary-600 border-b-2 border-primary-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Sent
              </button>
            </div>
          </div>
          <div className="divide-y">
            {loading ? (
              <div className="p-8 text-center">Loading...</div>
            ) : displayMessages.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No messages found</div>
            ) : (
              displayMessages.map((message) => (
                <div
                  key={message._id}
                  className={`p-6 hover:bg-gray-50 cursor-pointer ${
                    !message.isRead && activeTab === 'inbox' ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => {
                    setSelectedMessage(message);
                    if (activeTab === 'inbox' && !message.isRead) {
                      handleMarkAsRead(message._id);
                    }
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                          <UserIcon className="w-5 h-5 text-primary-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {activeTab === 'inbox' ? message.from.name : message.to.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {activeTab === 'inbox' ? message.from.email : message.to.email}
                          </p>
                        </div>
                      </div>
                      <p className="mt-2 font-semibold text-gray-900">{message.subject}</p>
                      <p className="mt-1 text-sm text-gray-600 line-clamp-2">{message.message}</p>
                      <p className="mt-2 text-xs text-gray-500">
                        {new Date(message.createdAt).toLocaleString()}
                      </p>
                    </div>
                    {!message.isRead && activeTab === 'inbox' && (
                      <span className="w-2 h-2 bg-primary-600 rounded-full"></span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {selectedMessage && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">{selectedMessage.subject}</h2>
              <button
                onClick={() => setSelectedMessage(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>
            <div className="border-b pb-4 mb-4">
              <p className="text-sm text-gray-600">
                From: {selectedMessage.from.name} ({selectedMessage.from.email})
              </p>
              <p className="text-sm text-gray-600">
                To: {selectedMessage.to.name} ({selectedMessage.to.email})
              </p>
              <p className="text-sm text-gray-600">
                Date: {new Date(selectedMessage.createdAt).toLocaleString()}
              </p>
            </div>
            <div className="prose max-w-none">
              <p className="whitespace-pre-wrap">{selectedMessage.message}</p>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}

