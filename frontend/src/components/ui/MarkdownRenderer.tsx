'use client';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  // Simple markdown parser for basic formatting
  const parseMarkdown = (text: string) => {
    if (!text) return '';
    
    return text
      // Bold text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Italic text
      .replace(/_(.*?)_/g, '<em>$1</em>')
      // Headings
      .replace(/^### (.*$)/gm, '<h3 class="text-lg font-semibold text-gray-900 mt-4 mb-2">$1</h3>')
      .replace(/^## (.*$)/gm, '<h2 class="text-xl font-semibold text-gray-900 mt-4 mb-2">$1</h2>')
      .replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold text-gray-900 mt-4 mb-2">$1</h1>')
      // Bullet points
      .replace(/^• (.*$)/gm, '<li class="ml-4">$1</li>')
      // Line breaks
      .replace(/\n/g, '<br />');
  };

  const htmlContent = parseMarkdown(content);

  return (
    <div 
      className={`prose prose-sm max-w-none ${className}`}
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
}
