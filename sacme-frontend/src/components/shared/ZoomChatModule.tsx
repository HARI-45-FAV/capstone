import { useState, useEffect, useRef } from "react";
import { getAuthToken } from "@/lib/auth";
import { io, Socket } from "socket.io-client";
import { Loader2, Send, Users, Circle } from "lucide-react";

type Participant = {
    userId: string;
    name: string;
    role: string;
};

export default function ZoomChatModule({ courseId }: { courseId: string }) {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [messages, setMessages] = useState<any[]>([]);
    const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
    
    const [selectedTarget, setSelectedTarget] = useState<string>("EVERYONE"); // 'EVERYONE' or userId
    const [inputText, setInputText] = useState("");
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [myUserId, setMyUserId] = useState<string>("");

    useEffect(() => {
        const token = getAuthToken();
        if (token) {
            try { setMyUserId(JSON.parse(atob(token.split('.')[1])).userId); } catch(e){}
        }

        const fetchInitialData = async () => {
            try {
                const [participantsRes, chatRes] = await Promise.all([
                    fetch(`http://localhost:5000/api/communication/chat/participants/${courseId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
                    fetch(`http://localhost:5000/api/communication/chat/${courseId}?limit=50`, { headers: { 'Authorization': `Bearer ${token}` } })
                ]);
                
                if (participantsRes.ok) {
                    const data = await participantsRes.json();
                    setParticipants(data.participants || []);
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
             if (token) {
                 const id = JSON.parse(atob(token.split('.')[1])).userId;
                 // MANDATORY DEBUG STEP 6 - Emit registration
                 newSocket.emit("user_connected", { userId: id, courseId });
                 newSocket.emit("join_user_room", id);
             }
             newSocket.emit("join_course_room", courseId);
        });

        newSocket.on("participant_joined", (newUserId) => {
            console.log("Participant Joined dynamically:", newUserId);
            // We just add a dummy participant if they aren't in the list so the count increases.
            setParticipants(prev => {
                if (prev.some(p => p.userId === newUserId)) return prev;
                return [...prev, { userId: newUserId, name: `User ${newUserId.substring(0,4)}`, role: 'PARTICIPANT' }];
            });
        });

        // MANDATORY DEBUG STEP 4 - Verify frontend listener
        newSocket.on("receive_message", (msg) => {
            console.log("Message received:", msg);
            setMessages(prev => {
                if (prev.some(m => m.id && m.id === msg.id)) return prev;
                return [...prev, msg];
            });
        });

        newSocket.on("receive_private_message", (msg) => {
            console.log("Message received:", msg); // Matches requested debug log
            setMessages(prev => {
                if (prev.some(m => m.id && m.id === msg.id)) return prev;
                return [...prev, msg];
            });
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
            newSocket.off("receive_private_message");
            newSocket.off("participant_joined");
            newSocket.off("user_status");
            newSocket.disconnect();
        };
    }, [courseId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = () => {
        if (!inputText.trim() || !socket) return;
        
        const payload = {
            senderId: myUserId,
            receiverId: selectedTarget === "EVERYONE" ? null : selectedTarget,
            courseId: courseId,
            messageText: inputText,
            chatType: selectedTarget === "EVERYONE" ? "BROADCAST" : "PRIVATE"
        };

        console.log("[FrontEnd Socket] Emitting send_message:", payload);
        socket.emit("send_message", payload);
        
        // MANDATORY DEBUG STEP 5 - Verify local state update 
        // Adding optimistic string id to prevent dup in loopback while persisting instantly in UI
        const savedMessage = { ...payload, id: `local_temp_${Date.now()}`, timestamp: new Date().toISOString() };
        setMessages(prev => [...prev, savedMessage]);

        setInputText("");
    };

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

    return (
        <div className="flex h-[600px] bg-slate-900 rounded-xl overflow-hidden border border-slate-700 shadow-xl font-sans">
            {/* Zoom-style Dark Chat Panel Area */}
            {/* Left Sidebar: Participants List */}
            <div className="w-64 border-r border-slate-700 flex flex-col bg-slate-800 text-slate-200">
                <div className="p-4 border-b border-slate-700 flex items-center justify-between">
                    <h3 className="font-bold tracking-wide text-sm flex items-center gap-2">
                        <Users className="w-4 h-4 text-emerald-400" /> 
                        Participants ({participants.length})
                    </h3>
                </div>
                <div className="flex-1 overflow-y-auto w-full p-2 space-y-1">
                    {participants.map(p => (
                        <div key={p.userId} className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-slate-700/50 cursor-default transition-colors">
                            <Circle className={`w-2.5 h-2.5 fill-current shrink-0 ${onlineUsers.has(p.userId) || p.userId === myUserId ? 'text-emerald-500' : 'text-slate-500'}`} />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{p.name} {p.userId === myUserId ? '(You)' : ''}</p>
                                <p className="text-xs text-slate-400">{p.role}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Right Chat Area */}
            <div className="flex-1 flex flex-col bg-[#1A1A1A] relative">
                <div className="px-6 py-4 border-b border-slate-800 bg-[#1A1A1A] flex justify-between items-center shadow-lg z-10">
                    <h2 className="font-bold text-white text-lg">Meeting Chat</h2>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {messages.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                            No messages yet. Send a message to start communicating.
                        </div>
                    ) : (
                        messages.map((msg, i) => {
                            const isMe = msg.senderId === myUserId;
                            const fromUser = msg.sender?.name || participants.find(p => p.userId === msg.senderId)?.name || "User";
                            const toTarget = msg.chatType === 'PRIVATE' ? participants.find(p => p.userId === msg.receiverId)?.name || 'Direct Message' : 'Everyone';
                            
                            return (
                                <div key={msg.id || i} className="flex flex-col mb-4">
                                    <div className="flex items-baseline gap-2 mb-1">
                                        <span className={`font-bold text-sm ${isMe ? 'text-emerald-400' : 'text-blue-400'}`}>
                                            {isMe ? 'Me' : fromUser} 
                                        </span>
                                        <span className="text-xs text-slate-400">
                                            to {isMe && msg.chatType === 'PRIVATE' ? toTarget : (msg.chatType === 'PRIVATE' ? 'Me (Direct Message)' : 'Everyone')}
                                        </span>
                                        <span className="text-xs text-slate-500 ml-2">
                                            {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                        </span>
                                    </div>
                                    <div className="text-sm text-slate-200 whitespace-pre-wrap pl-1">
                                        {msg.messageText}
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 bg-[#242424] border-t border-slate-700 flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-sm text-slate-300">
                        <span>Send to:</span>
                        <select 
                            value={selectedTarget}
                            onChange={(e) => setSelectedTarget(e.target.value)}
                            className="bg-slate-700 border-none rounded px-3 py-1 text-white outline-none cursor-pointer focus:ring-1 focus:ring-blue-500"
                        >
                            <option value="EVERYONE">Everyone</option>
                            {participants.filter(p => p.userId !== myUserId).map(p => (
                                <option key={p.userId} value={p.userId}>{p.name} (Direct Message)</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-end gap-2 bg-[#333333] p-1 rounded-lg border border-slate-600 focus-within:border-blue-500 transition-colors">
                        <textarea
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage();
                                }
                            }}
                            placeholder="Type message here..."
                            className="flex-1 max-h-32 min-h-12 bg-transparent resize-none outline-none text-sm py-2 px-3 text-slate-100 placeholder:text-slate-400"
                            rows={2}
                        />
                        <button 
                            onClick={handleSendMessage}
                            disabled={!inputText.trim()}
                            className="p-2 mb-1 mr-1 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-md transition-colors shadow-sm"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
