export default function ChessActions({
  handleUndoMove,
  handleSurrender,
  handleSwitchTeams,
  changeDifficulty,
}) {

  const buttonOptions = [
    { label: 'Play as white', action: () => handleSwitchTeams('w') },
    { label: 'Play as black', action: () => handleSwitchTeams('b') },
    { label: 'AI vs AI', action: () => handleSwitchTeams(false) },
    { label: 'Surrender', action: handleSurrender },
    { label: 'Undo', action: handleUndoMove },
  ];

  return (
    <div className="flex flex-col justify-center items-center gap-2 w-72">
      <select className="bg-zinc-600 p-2 w-36 text-center rounded-sm rounded-t-xl" onChange={changeDifficulty}>
        <option className="bg-zinc-500/80" value="3">Easy</option>
        <option className="bg-zinc-500/80" value="5">Medium</option>
        <option className="bg-zinc-500/80" value="8">Hard</option>
        <option className="bg-zinc-500/80" value="15">No Way</option>
      </select>
      {buttonOptions.map((option, index) => (
        <button
          key={index}
          className="bg-zinc-600/80 hover:bg-zinc-600 border border-zinc-700 p-1 rounded-xl w-36"
          onClick={option.action}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}