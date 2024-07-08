import React, { useState } from 'react';

const MainTagInput = ({ tags, onTagSelect }: { tags: string[]; onTagSelect: (tag: string) => void }) => {
  const [filter, setFilter] = useState('');
  const filteredTags = tags.filter(tag => tag.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="relative">
      <span className="text-zinc-200">Main Tag:</span>
      <input
        type="text"
        className="bg-zinc-500/40 p-2.5 mt-1 block w-full rounded-md border border-gray-300/20 shadow-sm"
        placeholder="Search and select a main tag"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && filteredTags.length > 0 && onTagSelect(filteredTags[0])}
      />
      {filter && (
        <div className="absolute w-full bg-zinc-500 shadow-md max-h-40 overflow-auto">
          {filteredTags.map(tag => (
            <div key={tag} className="p-2 hover:bg-zinc-600 cursor-pointer" onClick={() => onTagSelect(tag)}>
              {tag}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MainTagInput;