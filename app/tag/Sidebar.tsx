import slugify from 'slugify';

interface SidebarProps {
  tags: string[];
  selectedTags: string[];
  onSelectTag: (tag: string) => void;
}

export default function Sidebar({ tags, selectedTags, onSelectTag }: SidebarProps) {
  return (
    <div className="bg-greyBg rounded-lg p-4 pt-0.5 overflow-y-auto h-[700px] border border-zinc-700/50 shadow-md shadow-zinc-900">
      <ul>
        {tags.map((tag, index) => (
          <li 
            key={index} 
            className={`px-2 py-1.5 my-2 border border-transparent ${selectedTags.includes(slugify(tag, { lower: true, strict: true })) ? 'bg-purpleContrast border-zinc-500/70' : 'hover:bg-lessDarkBg'} cursor-pointer capitalize rounded-md transition-all`}
            onClick={() => onSelectTag(tag)}
          >
            {tag}
          </li>
        ))}
      </ul>
    </div>
  );
}