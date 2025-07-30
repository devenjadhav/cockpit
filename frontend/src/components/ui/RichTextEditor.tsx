'use client';

import { useState, useRef, useEffect } from 'react';
import { Bold, Italic, List, Link, Type, AlignLeft } from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function RichTextEditor({ value, onChange, placeholder, className }: RichTextEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [cursorPosition, setCursorPosition] = useState(0);

  const insertFormatting = (before: string, after: string = '') => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    
    const newText = value.substring(0, start) + before + selectedText + after + value.substring(end);
    onChange(newText);
    
    // Set cursor position after formatting
    setTimeout(() => {
      if (textarea) {
        const newCursorPos = start + before.length + selectedText.length + after.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
        textarea.focus();
      }
    }, 0);
  };

  const formatButtons = [
    {
      icon: Bold,
      label: 'Bold',
      action: () => insertFormatting('**', '**'),
    },
    {
      icon: Italic,
      label: 'Italic',
      action: () => insertFormatting('_', '_'),
    },
    {
      icon: List,
      label: 'Bullet List',
      action: () => insertFormatting('• '),
    },
    {
      icon: Type,
      label: 'Heading',
      action: () => insertFormatting('### '),
    },
  ];

  return (
    <div className={`border border-gray-300 rounded-md overflow-hidden ${className}`}>
      {/* Toolbar */}
      <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 flex items-center space-x-2">
        {formatButtons.map((button, index) => (
          <button
            key={index}
            type="button"
            onClick={button.action}
            className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors"
            title={button.label}
          >
            <button.icon className="w-4 h-4" />
          </button>
        ))}
        <div className="flex-1" />
        <span className="text-xs text-gray-500">Markdown supported</span>
      </div>
      
      {/* Editor */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-32 px-3 py-2 border-0 focus:outline-none focus:ring-2 focus:ring-yellow-500 resize-vertical"
        onFocus={() => setIsEditing(true)}
        onBlur={() => setIsEditing(false)}
      />
      
      {/* Help text */}
      <div className="bg-gray-50 px-3 py-1 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          Use **bold**, _italic_, ### headings, and • bullet points for formatting
        </p>
      </div>
    </div>
  );
}
