'use client';

import React, { useState } from 'react';

const TagsInput = ({ onChange, maxTags = 3 }: { onChange: (tags: string[]) => void; maxTags?: number }) => {
  const [tags, setTags] = useState<string[]>([]);
  const [input, setInput] = useState('');

  const removeTag = (index: number) => {
    const newTags = [...tags];
    newTags.splice(index, 1);
    setTags(newTags);
    onChange(newTags);
  };

  const addTag = (tag: string) => {
    if (tag && !tags.includes(tag) && tags.length < maxTags) {
      const newTags = [...tags, tag];
      setTags(newTags);
      onChange(newTags);
    }
    setInput('');
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if ((event.key === 'Enter' || event.key === 'Tab' || event.key === ',') && tags.length < maxTags) {
      event.preventDefault();
      addTag(input.trim());
    }
  };

  return (
    <div className="flex flex-wrap gap-2 bg-zinc-500/40 p-2.5 mt-1 w-full rounded-md border border-gray-300/20 shadow-sm">
      {tags.map((tag, index) => (
        <div
          key={index}
          className="flex items-center bg-gray-600 border border-gray-500/80 rounded px-2"
        >
          {tag}
          <button onClick={() => removeTag(index)} className="ml-2 text-white">&times;</button>
        </div>
      ))}
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        className="flex-1 outline-none bg-transparent"
        placeholder={tags.length < maxTags ? "Add a tag..." : "Tag limit reached"}
      />
      <div className="text-sm self-center">{`${maxTags - tags.length} tags remaining`}</div>
    </div>
  );
};

export default TagsInput;