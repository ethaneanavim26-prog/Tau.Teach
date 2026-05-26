const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { Plus, Search, MessageSquare, X, Menu } from "lucide-react";

export default function Sidebar({ conversations, activeId, onSelect, onNew, onClose, isOpen }) {
  return (
    <>
      {/* Mobile overlay */}
      {isOpen &&
      <div
        className="fixed inset-0 bg-black/50 z-30 md:hidden"
        onClick={onClose} />

      }

      <aside
        className={`fixed md:relative z-40 flex flex-col h-full w-72 bg-[#1a1a1a] border-r border-white/10 transition-transform duration-300 ${
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`
        }>
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <img src="https://media.db.com/images/public/69bcb8a79e8d746742c2ec7c/03871898a_IMG_2883.jpeg" alt="TauTeach" className="opacity-80 rounded-[14px] w-8 h-8 object-cover" />
            <span className="font-semibold text-white">TauTeach AI</span>
          </div>
          <button onClick={onClose} className="md:hidden text-white/40 hover:text-white">
            <X size={18} />
          </button>
        </div>

        {/* New Chat */}
        <div className="px-3 py-3">
          <button
            onClick={onNew}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/80 hover:bg-white/10 hover:text-white transition">
            
            <Plus size={16} />
            New chat
          </button>
        </div>

        {/* Conversations */}
        <div className="flex-1 overflow-y-auto px-3 pb-4">
          {conversations.length > 0 &&
          <>
              <p className="text-xs text-white/30 uppercase tracking-wider px-2 mb-2">Recent</p>
              <div className="space-y-0.5">
                {conversations.map((conv) =>
              <button
                key={conv.id}
                onClick={() => {onSelect(conv.id);onClose();}}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition truncate ${
                activeId === conv.id ?
                "bg-white/15 text-white" :
                "text-white/60 hover:bg-white/10 hover:text-white"}`
                }>
                
                    <div className="flex items-center gap-2">
                      <MessageSquare size={14} className="flex-shrink-0 opacity-50" />
                      <span className="truncate">{conv.title}</span>
                    </div>
                  </button>
              )}
              </div>
            </>
          }
        </div>
      </aside>
    </>);

}