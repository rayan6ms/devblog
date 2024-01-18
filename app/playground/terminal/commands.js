import {
  commandsList,
  parseArguments,
  formatFileSize,
  resolvePath,
  getPathContent,
  checkPermissions
} from './utils';

import fileSystem from './fileSystem';

let currentDirectoryPath = '/home/rayan';

export const commands = {
  help: () => {
    return Object.keys(commandsList).map(command => (
      <div key={command}>
        <span className="text-green-400">{command}</span> - {commandsList[command]}
      </div>
    ));
  },
  clear: () => {
    return '';
  },
  echo: (input) => {
    return input;
  },
  ls: (args) => {
    const { options } = parseArguments(args);
    const currentDir = getPathContent(currentDirectoryPath);
    console.log(currentDir)
    
    let files = Object.keys(currentDir.contents);
    
    // Opção -a: incluir arquivos ocultos
    if (!options.a) {
      files = files.filter(file => !currentDir.contents[file].hidden);
    }
    
    // Opção -l: listar detalhes dos arquivos
    if (options.l) {
      return files.map(file => {
        const { permissions, size, type } = currentDir.contents[file];
        return `${permissions} ${type[0]} ${size} ${file}`;
      }).join('\n');
    }
    
    // Opção -h: mostrar tamanhos de arquivos de forma legível
    if (options.h) {
      return files.map(file => {
        const size = currentDir.contents[file].size;
        const readableSize = formatFileSize(size);
        return `${file} (${readableSize})`;
      }).join(' ');
    }
    
    return files.join(' ');
  },
  cd: (dir) => {
    const newPath = resolvePath(currentDirectoryPath, dir);
    const targetDir = getPathContent(newPath);
    if (targetDir && targetDir.type === 'directory') {
      currentDirectoryPath = newPath;
      return '';
    } else {
      return `cd: ${dir}: No such directory`;
    }
  },
  pwd: () => {
    return currentDirectoryPath;
  },
  mkdir: (dirName) => {
    const currentDir = getPathContent(currentDirectoryPath);
    if (!checkPermissions(currentDirectoryPath, 'w')) {
      return `mkdir: cannot create directory '${dirName}': Permission denied`;
    }

    if (currentDir.contents[dirName]) {
      return `mkdir: cannot create directory '${dirName}': File exists`;
    }
    currentDir.contents[dirName] = { type: 'directory', contents: {} };
    return '';
  },
  rm: (fileName) => {
    const currentDir = getPathContent(currentDirectoryPath);
    if (!checkPermissions(currentDirectoryPath, 'w')) {
      return `rm: cannot remove '${fileName}': Permission denied`;
    }

    if (!currentDir.contents[fileName] || currentDir.contents[fileName].type === 'directory') {
      return `rm: cannot remove '${fileName}': No such file`;
    }
    delete currentDir.contents[fileName];
    return '';
  },
  rmdir: (dirName) => {
    const currentDir = getPathContent(currentDirectoryPath);
    if (!checkPermissions(currentDirectoryPath, 'w')) {
      return `rmdir: cannot remove '${dirName}': Permission denied`;
    }

    if (!currentDir.contents[dirName] || currentDir.contents[dirName].type === 'file') {
      return `rmdir: failed to remove '${dirName}': No such directory`;
    }
    delete currentDir.contents[dirName];
    return '';
  },
  cat: (args) => {
    const { options, args: fileNames } = parseArguments(args);
    const currentDir = getPathContent(currentDirectoryPath);

    // Opção -n: mostrar número das linhas
    if (options.n) {
      return fileNames.map(fileName => {
        const file = currentDir.contents[fileName];
        if (!file || file.type === 'directory') {
          return `cat: ${fileName}: No such file`;
        }
        const lines = file.content.split('\n').map((line, index) => `${index + 1}\t${line}`);
        return lines.join('\n');
      }).join('\n');
    }
  
    return fileNames.map(fileName => {
      const file = currentDir.contents[fileName];
      if (!file || file.type === 'directory') {
        return `cat: ${fileName}: No such file`;
      }
      return file.content;
    }).join('\n');
  },
  touch: (filename) => {
    const currentDir = getPathContent(currentDirectoryPath);
    if (!currentDir.contents[filename]) {
      currentDir.contents[filename] = {
        type: 'file',
        content: ''
      };
      return '';
    } else {
      return `touch: cannot touch '${filename}': File exists`;
    }
  },
  mv: (source, destination) => {
    const currentDir = getPathContent(currentDirectoryPath);
    if (!checkPermissions(currentDirectoryPath, 'w')) {
      return `mv: cannot move '${source}': Permission denied`;
    }

    if (!currentDir.contents[source]) {
      return `mv: cannot stat '${source}': No such file or directory`;
    }
    if (currentDir.contents[destination]) {
      return `mv: cannot move '${source}' to '${destination}': File or directory already exists`;
    }
    currentDir.contents[destination] = currentDir.contents[source];
    delete currentDir.contents[source];
    return '';
  },
  cp: (source, destination) => {
    const currentDir = getPathContent(currentDirectoryPath);
    if (!checkPermissions(currentDirectoryPath, 'w')) {
      return `cp: cannot copy '${source}': Permission denied`;
    }

    if (!currentDir.contents[source]) {
      return `cp: cannot stat '${source}': No such file or directory`;
    }
    if (currentDir.contents[destination]) {
      return `cp: cannot copy '${source}' to '${destination}': File or directory already exists`;
    }
    currentDir.contents[destination] = { ...currentDir.contents[source] };
    return '';
  },
  date: () => {
    return new Date().toString();
  },
  whoami: () => {
    return 'rayan';
  },
  hostname: () => {
    return 'devblog-terminal';
  },
  history: (commandHistory) => {
    return commandHistory.join('\n');
  },
  find: (args) => {
    const { options, args: [name] } = parseArguments(args);
    const searchName = options.i ? name.toLowerCase() : name; // Opção -i: ignora case

    const searchFileSystem = (dir, path) => {
      let result = [];
      for (let item in dir.contents) {
        const newPath = path ? `${path}/${item}` : item;
        if (item === searchName || (options.i && item.toLowerCase() === searchName)) result.push(newPath);
        if (dir.contents[item].type === 'directory') {
          result = result.concat(searchFileSystem(dir.contents[item], newPath));
        }
      }
      return result;
    };
    
    return searchFileSystem(fileSystem.root, '').join('\n');
  },
};