import { useState, useEffect, useRef } from "react";
import { getAuthToken } from "@/lib/auth";
import { io, Socket } from "socket.io-client";
import { Loader2, Send, Users, Circle, Paperclip } from "lucide-react";

export default function StudentChatModule({ courseId }: { courseId: string }) {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [professor, setProfessor] = useState<{ id: string, name: string, isOnline: boolean } | null>(null);
    const [activeChat, setActiveChat] = useState<{ type: 'BROADCAST' | 'PRIVATE', targetId: string | null, targetName: string }>({ type: 'BROADCAST', targetId: null, targetName: 'Class Announcements' });
    const [inputText, setInputText] = useState("");
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [myUserId, setMyUserId] = useState<string>("");

    useEffect(() => {
        const token = getAuthToken();
        if (token) {
            try { setMyUserId(JSON.parse(atob(token.split('.')[1])).id); } catch(e){}
        }

        const fetchInitialData = async () => {
             try {
                 const [courseRes, chatRes] = await Promise.all([
                     fetch(`http://localhost:5000/api/courses/${courseId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
                     fetch(`http://localhost:5000/api/communication/chat/${courseId}?limit=50`, { headers: { 'Authorization': `Bearer ${token}` } })
                 ]);
                 
                 if (courseRes.ok) {
                     const data = await courseRes.json();
                     if (data.course && data.course.courseAssignments && data.course.courseAssignments[0]) {
                          const prof = data.course.courseAssignments[0].professor;
                          setProfessor({ id: prof.userId, name: prof.name, isOnline: false });
                     }
                 }
                 if (chatRes.ok) {
                     const data = await chatRes.json();
                     setMessages(data.messages || []);
                 }
             } catch(e) { console.error(e) }
             finally { setLoading(false); }
        };

        fetchInitialData();

        const newSocket = io("http://localhost:5000");
        setSocket(newSocket);

        newSocket.on("connect", () => {
             if (token) {
                 const id = JSON.parse(atob(token.split('.')[1])).id;
                 newSocket.emit("join_user_room", id);
             }
             newSocket.emit("join_course_room", courseId);
        });

        newSocket.on("receive_message", (msg) => {
            setMessages(prev => [...prev, msg]);
        });

        newSocket.on("user_status", (payload) => {
            setProfessor(prev => {
                 if (!prev || payload.userId !== prev.id) return prev;
                 return { ...prev, isOnline: payload.status === 'ONLINE' };
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
        
        if (activeChat.type === 'BROADCAST') {
            alert("Only professors can broadcast to the class.");
            return;
        }

        const payload = {
            senderId: myUserId,
            receiverId: activeChat.targetId,
            courseId: courseId, 
            messageText: inputText,
            chatType: 'PRIVATE'
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
        <div className="flex h-[600px] bg-white dark:bg-slate-900 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="w-64 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-slate-50 dark:bg-slate-900/50">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                    <h3 className="font-bold text-slate-800 dark:text-slate-200">Inbox</h3>
                </div>
                <div className="flex-1 overflow-y-auto">
                    <div 
                        onClick={() => setActiveChat({ type: 'BROADCAST', targetId: null, targetName: 'Class Announcements' })}
                        className={`p-4 border-b border-slate-100 dark:border-slate-800 cursor-pointer flex items-center gap-3 transition-colors ${activeChat.type === 'BROADCAST' ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                    >
                        <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-600 flex items-center justify-center shrink-0">
                            <Users className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="font-semibold text-sm text-slate-900 dark:text-white">Class Chat</p>
                            <p className="text-[10px] text-slate-500">Read-only</p>
                        </div>
                    </div>

                    {professor && (
                        <div 
                            onClick={() => {
                                 setActiveChat({ type: 'PRIVATE', targetId: professor.id, targetName: `Prof. ${professor.name}` });
                                 const unreadMsgIds = messages.filter(m => !m.isRead && m.senderId === professor.id && activeChat.type !== 'PRIVATE').map(m => m.id);
                                 if (unreadMsgIds.length > 0) socket?.emit("mark_read", unreadMsgIds);
                                 setMessages(prev => prev.map(m => unreadMsgIds.includes(m.id) ? { ...m, isRead: true } : m));
                            }}
                            className={`p-4 border-b border-slate-100 dark:border-slate-800 cursor-pointer flex items-center gap-3 transition-colors ${activeChat.targetId === professor.id ? 'bg-blue-50 dark:bg-blue-900/20 shadow-[inset_4px_0_0_0_#2563eb]' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                        >
                            <div className="relative">
                                <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500 font-bold shrink-0">
                                    {professor.name.charAt(0)}
                                </div>
                                <Circle className={`w-3 h-3 absolute bottom-0 right-0 fill-current ${professor.isOnline ? 'text-emerald-500' : 'text-slate-400'}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-center">
                                    <p className="font-semibold text-sm text-slate-800 dark:text-slate-200 truncate">Prof. {professor.name}</p>
                                    {(() => {
                                        const unread = messages.filter(m => !m.isRead && m.senderId === professor.id && activeChat.type !== 'PRIVATE').length;
                                        return unread > 0 ? <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{unread}</span> : null;
                                    })()}
                                </div>
                                <p className="text-[10px] text-slate-500">Direct Message</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex-1 flex flex-col bg-white dark:bg-slate-900">
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center shadow-sm z-10">
                    <h2 className="font-bold text-slate-800 dark:text-white">{activeChat.targetName}</h2>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50 dark:bg-slate-900/20">
                    {displayMessages.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                            No messages yet.
                        </div>
                    ) : (
                        displayMessages.map((msg, i) => {
                            const isMe = msg.senderId === myUserId;
                            return (
                                <div key={msg.id || i} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                    <div className={`max-w-[70%] px-4 py-2 rounded-2xl ${isMe ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-tl-sm shadow-sm'}`}>
                                        {!isMe && msg.sender && activeChat.type === 'BROADCAST' && <p className="text-[10px] font-bold text-indigo-500 mb-1">{msg.sender.name || 'Professor'}</p>}
                                        <p className="text-sm whitespace-pre-wrap">{msg.messageText}</p>
                                    </div>
                                    <span className="text-[10px] text-slate-400 mt-1 px-1">
                                        {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </span>
                                </div>
                            );
                        })
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {activeChat.type === 'PRIVATE' ? (
                    <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
                        <div className="flex items-end gap-2 bg-slate-100 dark:bg-slate-800 p-2 rounded-xl focus-within:ring-2 focus-within:ring-blue-500 transition-all">
                            <textarea
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSendMessage();
                                    }
                                }}
                                placeholder={`Message ${activeChat.targetName}...`}
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
                    </div>
                ) : (
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800 text-center">
                        <p className="text-xs text-slate-500">You are viewing a read-only class channel.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
