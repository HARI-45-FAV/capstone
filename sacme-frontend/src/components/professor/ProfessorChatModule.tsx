import { useState, useEffect, useRef } from "react";
import { getAuthToken } from "@/lib/auth";
import { io, Socket } from "socket.io-client";
import { Loader2, Send, Users, Circle, Paperclip } from "lucide-react";

export default function ProfessorChatModule({ courseId }: { courseId: string }) {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [roster, setRoster] = useState<any[]>([]);
    const [messages, setMessages] = useState<any[]>([]);
    const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
    
    const [activeChat, setActiveChat] = useState<{ type: 'BROADCAST' | 'PRIVATE', targetId: string | null, targetName: string }>({ type: 'BROADCAST', targetId: null, targetName: 'Everyone' });
    const [inputText, setInputText] = useState("");
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [myUserId, setMyUserId] = useState<string>("");

    useEffect(() => {
        // Decode simple token to get own user ID
        const token = getAuthToken();
        if (token) {
            try { setMyUserId(JSON.parse(atob(token.split('.')[1])).id); } catch(e){}
        }

        const fetchInitialData = async () => {
            try {
                const [rosterRes, chatRes] = await Promise.all([
                    fetch(`http://localhost:5000/api/communication/contacts/${courseId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
                    fetch(`http://localhost:5000/api/communication/chat/${courseId}?limit=50`, { headers: { 'Authorization': `Bearer ${token}` } })
                ]);
                
                if (rosterRes.ok) {
                    const data = await rosterRes.json();
                    setRoster(data.roster || []);
                }
                if (chatRes.ok) {
                    const data = await chatRes.json();
                    setMessages(data.messages || []);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchInitialData();

        const newSocket = io("http://localhost:5000");
        setSocket(newSocket);

        newSocket.on("connect", () => {
             // Let the backend know who I am
             if (token) {
                 const id = JSON.parse(atob(token.split('.')[1])).id;
                 newSocket.emit("join_user_room", id);
             }
             newSocket.emit("join_course_room", courseId);
        });

        newSocket.on("receive_message", (msg) => {
            setMessages(prev => [...prev, msg]);
            // If message is for a private chat we aren't looking at, we could increment unread logic here.
        });

        newSocket.on("user_status", (payload) => {
            setOnlineUsers(prev => {
                const updated = new Set(prev);
                if (payload.status === 'ONLINE') updated.add(payload.userId);
                else updated.delete(payload.userId);
                return updated;
            });
        });

        return () => {
            newSocket.off("receive_message");
            newSocket.off("user_status");
            newSocket.disconnect();
        };
    }, [courseId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, activeChat]);

    const handleSendMessage = () => {
        if (!inputText.trim() || !socket) return;
        
        const payload = {
            senderId: myUserId,
            receiverId: activeChat.type === 'PRIVATE' ? activeChat.targetId : null,
            courseId: courseId,
            messageText: inputText,
            chatType: activeChat.type
        };

        socket.emit("send_message", payload);
        setInputText("");
    };

    const displayMessages = messages.filter(m => {
        if (activeChat.type === 'BROADCAST') return m.chatType === 'BROADCAST' || m.chatType === 'GROUP';
        return (m.senderId === activeChat.targetId || m.receiverId === activeChat.targetId);
    });

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

    return (
        <div className="flex h-[600px] bg-white dark:bg-slate-900 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800">
            {/* Left Panel: Contacts */}
            <div className="w-80 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-slate-50 dark:bg-slate-900/50">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                    <h3 className="font-bold text-slate-800 dark:text-slate-200">Chat & Contacts</h3>
                </div>
                <div className="flex-1 overflow-y-auto overflow-x-hidden">
                    <div 
                        onClick={() => setActiveChat({ type: 'BROADCAST', targetId: null, targetName: 'Everyone' })}
                        className={`p-4 border-b border-slate-100 dark:border-slate-800 cursor-pointer flex items-center gap-3 transition-colors ${activeChat.type === 'BROADCAST' ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                    >
                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 flex items-center justify-center shrink-0">
                            <Users className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="font-semibold text-slate-900 dark:text-white line-clamp-1">Class Broadcast</p>
                            <p className="text-xs text-slate-500">Send to all students</p>
                        </div>
                    </div>

                    <div className="px-4 py-2 text-xs font-bold text-slate-400 tracking-wider uppercase mt-2">
                        Direct Messages
                    </div>
                    
                    {roster.map(student => (
                        <div 
                            key={student.id}
                            onClick={() => {
                                 setActiveChat({ type: 'PRIVATE', targetId: student.userId, targetName: student.name });
                                 const unreadMsgIds = messages.filter(m => !m.isRead && m.senderId === student.userId).map(m => m.id);
                                 if (unreadMsgIds.length > 0) socket?.emit("mark_read", unreadMsgIds);
                                 setMessages(prev => prev.map(m => unreadMsgIds.includes(m.id) ? { ...m, isRead: true } : m));
                            }}
                            className={`px-4 py-3 cursor-pointer flex items-center gap-3 transition-colors ${activeChat.targetId === student.userId ? 'bg-blue-50 dark:bg-blue-900/20 shadow-[inset_4px_0_0_0_#2563eb]' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                        >
                            <div className="relative">
                                <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500 font-bold shrink-0">
                                    {student.name.charAt(0)}
                                </div>
                                <Circle className={`w-3 h-3 absolute bottom-0 right-0 fill-current ${onlineUsers.has(student.userId) ? 'text-emerald-500' : 'text-slate-400'}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-center">
                                    <p className="font-semibold text-sm text-slate-800 dark:text-slate-200 truncate">{student.name}</p>
                                    {(() => {
                                        const unread = messages.filter(m => !m.isRead && m.senderId === student.userId).length;
                                        return unread > 0 ? <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{unread}</span> : null;
                                    })()}
                                </div>
                                <p className="text-xs text-slate-500 truncate">{student.rollNo}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Right Panel: Chat Area */}
            <div className="flex-1 flex flex-col bg-white dark:bg-slate-900">
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center shadow-sm z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                            {activeChat.type === 'BROADCAST' ? <Users className="w-5 h-5 text-blue-500" /> : <div className="font-bold text-slate-500">{activeChat.targetName.charAt(0)}</div>}
                        </div>
                        <div>
                            <h2 className="font-bold text-slate-800 dark:text-white">{activeChat.targetName}</h2>
                            <p className="text-xs text-slate-500">{activeChat.type === 'BROADCAST' ? 'Broadcast restricted to enrolled students' : onlineUsers.has(activeChat.targetId || '') ? 'Online' : 'Offline'}</p>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50 dark:bg-slate-900/20">
                    {displayMessages.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                            No messages yet. Send a message to start the conversation.
                        </div>
                    ) : (
                        displayMessages.map((msg, i) => {
                            const isMe = msg.senderId === myUserId;
                            return (
                                <div key={msg.id || i} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                    <div className={`max-w-[70%] px-4 py-2 rounded-2xl ${isMe ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-tl-sm shadow-sm'}`}>
                                        {!isMe && msg.sender && activeChat.type === 'BROADCAST' && <p className="text-[10px] font-bold text-blue-500 mb-1">{msg.sender.name || 'User'}</p>}
                                        <p className="text-sm whitespace-pre-wrap">{msg.messageText}</p>
                                    </div>
                                    <span className="text-[10px] text-slate-400 mt-1 px-1">
                                        {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                        {isMe && msg.isRead && activeChat.type === 'PRIVATE' && <span className="ml-1 text-blue-500 font-bold">✓✓</span>}
                                    </span>
                                </div>
                            );
                        })
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
                    <div className="flex items-end gap-2 bg-slate-100 dark:bg-slate-800 p-2 rounded-xl focus-within:ring-2 focus-within:ring-blue-500 transition-all">
                        <button className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                            <Paperclip className="w-5 h-5" />
                        </button>
                        <textarea
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage();
                                }
                            }}
                            placeholder={activeChat.type === 'BROADCAST' ? "Type a broadcast message to all students..." : `Message ${activeChat.targetName}...`}
                            className="flex-1 max-h-32 min-h-10 bg-transparent resize-none outline-none text-sm py-2 px-2 text-slate-800 dark:text-slate-200 placeholder:text-slate-400"
                            rows={1}
                        />
                        <button 
                            onClick={handleSendMessage}
                            disabled={!inputText.trim()}
                            className="p-2 mb-0.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white rounded-lg transition-colors"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="px-2 mt-2 flex justify-between">
                        <span className="text-xs text-slate-400">⏎ to send, Shift + ⏎ for new line</span>
                        {activeChat.type === 'BROADCAST' && <span className="text-xs font-bold text-blue-500 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">Broadcast Ready</span>}
                    </div>
                </div>
            </div>
        </div>
    );
}

