'use client'


import { useState, useEffect } from 'react';
import { findSimilarCommand } from './utils';
import { commands } from './commands';

export default function Terminal() {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState([]);
  const [suggestion, setSuggestion] = useState('');

  const handleInputChange = (event) => {
    const value = event.target.value;
    setInput(value);
    updateSuggestion(value);
  };

  const updateSuggestion = (value) => {
    const commandNames = Object.keys(commands);
    const suggestedCommand = commandNames.find(command => command.startsWith(value));
    setSuggestion(suggestedCommand ? suggestedCommand.slice(value.length) : '');
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Tab') {
      event.preventDefault();
      setInput(input + suggestion);
      setSuggestion('');
    }
  };

  const handleFormSubmit = (event) => {
    event.preventDefault();
    const newHistoryItem = {
      command: input,
      output: processCommand(input),
    };
    setHistory([...history, newHistoryItem].slice(-20));
    setInput('');
  };

  const processCommand = (commandString) => {
    const commandSegments = commandString.split(/\s*\|\|\s*|\s*&&\s*|\s*\|\s*|\s*<\s*|\s*>\s*/);
    let output = '';
  
    for (let i = 0; i < commandSegments.length; i++) {
      const [command, ...args] = commandSegments[i].split(' ');
      const commandFunction = commands[command];
  
      if (commandFunction) {
        // Tratamento simplificado para o operador '|'
        if (i > 0 && commandString.includes('|')) {
          args.unshift(output);  // passa a saída do comando anterior como o primeiro argumento
        }
        output = commandFunction(...args);
      } else {
        const suggestedCommand = findSimilarCommand(command);
        output = suggestedCommand ?
          `Você quis dizer ${suggestedCommand}?` :
          'Comando não reconhecido. Digite "help" para ver a lista de comandos.';
      }
  
      // Tratamento simplificado para o operador '>'
      if (i < commandSegments.length - 1 && commandString.includes('>')) {
        const filePath = args[args.length - 1];  // assume que o último argumento é o caminho do arquivo
        const fileDir = getPathContent(resolvePath(currentDirectoryPath, filePath));
        if (fileDir) {
          fileDir.content = output;  // redireciona a saída para o arquivo
        }
      }
    }
  
    return output;
  };

  useEffect(() => {
    // DDDDD   EEEEEEE VV     VV BBBBB   LL       OOOOO    GGGG  
    // DD  DD  EE      VV     VV BB   B  LL      OO   OO  GG  GG 
    // DD   DD EEEEE    VV   VV  BBBBBB  LL      OO   OO GG      
    // DD   DD EE        VV VV   BB   BB LL      OO   OO GG   GG 
    // DDDDDD  EEEEEEE    VVV    BBBBBB  LLLLLLL  OOOO0   GGGGGG 
    const welcomeMessage = `
      Bem-vindo ao terminal DevBlog!
      Digite "help" para uma descrição dos comandos.
    `;
    setHistory([{ command: '', output: welcomeMessage }]);
  }, []);

  return (
    <div className="bg-black text-gray-300 p-4 rounded-lg w-1/3">
      <div className="history">
        {history.map((item) => (
          <div key={item.command}>
            {item.command && <div className="command">rayan@terminal:~$ {item.command}</div>}
            <div className="output">{item.output}</div>
          </div>
        ))}
      </div>
      <form onSubmit={handleFormSubmit} className="w-full">
        <label className="flex">
          rayan@terminal:~$ 
          <div className="text-zinc-200 ml-1">
            <input
              type="text" 
              value={input}
              maxLength={256}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              className="bg-transparent border-none outline-none w-auto"
              autoComplete="off"
              autoFocus="on"
            />
            <span className="text-zinc-400">{suggestion}</span>
          </div>
        </label>
      </form>
    </div>
  );
};