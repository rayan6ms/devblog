import slugify from 'slugify';

interface SidebarProps {
  tags: string[];
  selectedTags: string[];
  onSelectTag: (tag: string) => void;
}

export default function Sidebar({ tags, selectedTags, onSelectTag }: SidebarProps) {
  return (
    <div className="w-full md:w-64 md:min-w-[16rem] mb-4 md:mb-0 bg-greyBg rounded-lg pt-0.5 md:h-[700px] h-16 md:overflow-y-auto overflow-x-auto flex md:flex-col border border-zinc-700/50 shadow-md shadow-zinc-900">
      <ul className="flex flex-row md:flex-col gap-2 md:p-3 md:gap-4 items-center md:items-stretch whitespace-nowrap">
        {tags.map((tag, index) => (
          <li 
            key={index} 
            className={`px-3 py-0.5 md:py-1.5 border border-zinc-700/60 ${selectedTags.includes(slugify(tag, { lower: true, strict: true })) ? 'bg-purpleContrast border-zinc-500/70' : 'hover:bg-lessDarkBg'} cursor-pointer capitalize rounded-md transition-all`}
            onClick={() => onSelectTag(tag)}
          >
            {tag}
          </li>
        ))}
      </ul>
    </div>
  );
}