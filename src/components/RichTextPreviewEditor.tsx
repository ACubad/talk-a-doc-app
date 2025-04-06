"use client"; // Required for Tiptap hooks

import React, { useEffect } from 'react'; // Import useEffect
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

interface RichTextPreviewEditorProps {
  value: string; // The HTML content
  onChange: (newValue: string) => void; // Function to update the content
}

const RichTextPreviewEditor: React.FC<RichTextPreviewEditorProps> = ({ value, onChange }) => {
  const editor = useEditor({
    extensions: [
      StarterKit, // Includes common text formatting (bold, italic, headings, etc.)
    ],
    content: value, // Initial content
    onUpdate: ({ editor }: { editor: any }) => { // Add explicit type for editor
      onChange(editor.getHTML()); // Update the state in the parent component
    },
    editorProps: {
      attributes: {
        // Add Tailwind classes for styling the editor area
        class: 'prose dark:prose-invert prose-sm sm:prose-base lg:prose-lg xl:prose-2xl m-5 focus:outline-none h-60 overflow-y-auto p-3 border rounded-md bg-background',
      },
    },
  });

  // Effect to update editor content when the external value changes
  useEffect(() => {
    if (editor && editor.getHTML() !== value) {
      editor.commands.setContent(value, false); // Set content without emitting update event
    }
  }, [value, editor]);

  return (
    <EditorContent editor={editor} />
  );
};

export default RichTextPreviewEditor;
