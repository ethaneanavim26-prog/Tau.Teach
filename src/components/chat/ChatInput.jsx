import { useRef } from "react";
import { Send, Paperclip, X } from "lucide-react";

export default function ChatInput({ value, onChange, onSubmit, loading, attachment, onAttach, onRemoveAttachment }) {
  const fileRef = useRef(null);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="bg-[#2a2a2a] rounded-2xl border border-white/10 overflow-hidden">
      {/* Attachment preview */}
      {attachment && (
        <div className="px-4 pt-3 flex items-center gap-2">
          <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-1.5 text-xs text-white/70">
            {attachment.type?.startsWith("image/") ? (