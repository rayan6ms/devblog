interface SelectedTagsProps {
  tags: string[];
  onRemoveTag: (tag: string) => void;
  onReset: () => void;
}

export default function SelectedTags({ tags, onRemoveTag, onReset }: SelectedTagsProps) {
  return (
    <div className="bg-greyBg rounded-lg px-4 py-3.5 h-16 flex space-x-2 border border-zinc-700/50 shadow-md shadow-zinc-900">
      {tags.map((tag, index) => (
        <span
          className="bg-lessDarkBg rounded-lg hover:bg-purpleContrast/75 px-3 py-1 border border-zinc-800"
          key={index}
        >
          {tag} 
          <button
            className="ml-1 text-wheat hover:text-lessDarkBg"
            onClick={() => onRemoveTag(tag)}
          >
            <span className="text-slate-400 hover:text-slate-300 hover:bg-gray-500/70 px-0.5 rounded-md">✕</span>
          </button>
        </span>
      ))}
      {tags.length > 0 && (
        <button 
          className="bg-zinc-600/80 hover:bg-zinc-500/90 px-4 rounded-full text-zinc text-xs font-bold uppercase border border-zinc-500/40"
          onClick={onReset}
        >
          reset
        </button>
      )}
    </div>
  );
}