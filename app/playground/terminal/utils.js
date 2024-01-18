import fileSystem from './fileSystem';
import { commands } from './commands';

export const commandsList = {
  help: 'Shows the help menu',
  clear: 'Clears the terminal',
  echo: 'Prints the given input',
  ls: 'Lists the files in the current directory',
  cd: 'Changes the current directory',
  pwd: 'Prints the current directory',
  mkdir: 'Creates a new directory',
  rm: 'Removes a file',
  rmdir: 'Removes a directory',
  cat: 'Prints the contents of a file',
  touch: 'Creates a new file',
  mv: 'Moves a file',
  cp: 'Copies a file',
  date: 'Prints the current date and time',
  whoami: 'Prints the current user',
  hostname: 'Prints the hostname',
  history: 'Shows the command history',
  find: 'Search for files and directories',
};

export const getPathContent = (path) => {
  console.log(path)
  console.log(fileSystem.root)
  return path.split('/').reduce((acc, folder) => {
    if (acc && acc.contents[folder]) return acc.contents[folder];
    return null;
  }, fileSystem.root);
};

export const resolvePath = (currentPath, targetPath) => {
  let currentPathArr = currentPath.split('/');
  let targetPathArr = targetPath.split('/');
  let resolvedPathArr = targetPath.startsWith('/') ? [] : currentPathArr;

  targetPathArr.forEach(segment => {
    if (segment === '..') {
      resolvedPathArr.pop();
    } else if (segment !== '.' && segment !== '') {
      resolvedPathArr.push(segment);
    }
  });

  return '/' + resolvedPathArr.join('/');
};

export const checkPermissions = (path, permission) => {
  const content = getPathContent(path);
  return content && content.permissions.includes(permission);
};

export const parseArguments = (args) => {
  const options = {};
  const regularArgs = [];

  args = args || [];

  args.forEach(arg => {
    if (arg.startsWith('--')) {
      const option = arg.substring(2);
      options[option] = true;
    } else if (arg.startsWith('-')) {
      arg.substring(1).split('').forEach(char => {
        options[char] = true;
      });
    } else {
      regularArgs.push(arg);
    }
  });

  return { options, args: regularArgs };
};

export const formatFileSize = (size) => {
  if (size >= 1000000000) {
    return `${(size / 1000000000).toFixed(2)} GB`;
  } else if (size >= 1000000) {
    return `${(size / 1000000).toFixed(2)} MB`;
  } else if (size >= 1000) {
    return `${(size / 1000).toFixed(2)} KB`;
  } else {
    return `${size} B`;
  }
};

function levenshtein(a, b) {
  const matrix = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost);
    }
  }
  return matrix[a.length][b.length];
}

export const findSimilarCommand = (command) => {
  const commandNames = Object.keys(commands);
  let mostSimilarCommand = null;
  let lowestDistance = Infinity;

  commandNames.forEach(cmd => {
    const distance = levenshtein(command, cmd);
    if (distance < lowestDistance && distance > 0) {
      lowestDistance = distance;
      mostSimilarCommand = cmd;
    }
  });

  return mostSimilarCommand;
};

// math eval

function tokenize(expr) {
  return expr.match(/([0-9.]+|[-+*/^%(){}\[\]**]|exp|log\d*|sin|cos|tan|abs|round|floor|ceil)/g);
}

const unaryOperators = ['exp', 'log', 'sin', 'cos', 'tan', 'abs', 'round', 'floor', 'ceil'];

function parse(tokens) {
  let index = 0;

  function parseExpression() {
    let left = parseTerm();
    while (tokens[index] === '+' || tokens[index] === '-') {
      const op = tokens[index++];
      const right = parseTerm();
      left = { type: 'BinaryExpression', operator: op, left, right };
    }
    return left;
  }

  function parseTerm() {
    let left = parseFactor();
    while (tokens[index] === '*' || tokens[index] === '/') {
      const op = tokens[index++];
      const right = parseFactor();
      left = { type: 'BinaryExpression', operator: op, left, right };
    }
    return left;
  }

  function parseFactor() {
    if (tokens[index] === '(' || tokens[index] === '{' || tokens[index] === '[') {
      index++;
      const expr = parseExpression();
      index++;  // assume ')' or '}' or ']' follows
      return expr;
    }

    if (tokens[index] && tokens[index].startsWith('log')) {
      const base = tokens[index].length > 3 ? parseInt(tokens[index].slice(3), 10) : Math.E;  // Default to base E if no base provided
      index++;
      const argument = parseFactor();  // assume a valid expression follows
      return { type: 'LogExpression', base, argument };
    }

    if (unaryOperators.includes(tokens[index])) {
      const func = tokens[index++];
      const expr = parseFactor();  // assume a valid expression follows
      return { type: 'UnaryExpression', operator: func, argument: expr };
    }

    if (tokens[index] === '^' || tokens[index] === '**') {
      index++;
      const base = parseFactor();
      const exponent = parseFactor();
      return { type: 'BinaryExpression', operator: '^', left: base, right: exponent };
    }
    return { type: 'Literal', value: parseFloat(tokens[index++]) };
  }

  return parseExpression();
}

const unaryFunctions = {
  exp: Math.exp,
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  abs: Math.abs,
  round: Math.round,
  floor: Math.floor,
  ceil: Math.ceil
};

function evaluate(node) {
  if (node.type === 'Literal') {
    return node.value;
  }
  const left = node.left ? evaluate(node.left) : null;
  const right = node.right ? evaluate(node.right) : null;

  switch (node.operator) {
    case '+': return left + right;
    case '-': return left - right;
    case '*': return left * right;
    case '/': return left / right;
    case '^': return Math.pow(left, right);
    case '**': return Math.pow(left, right);
    case '%': return left % right;
    default:
      if (unaryFunctions[node.operator]) {
        return unaryFunctions[node.operator](evaluate(node.argument));
      }
      if (node.type === 'LogExpression') {
        return Math.log(evaluate(node.argument)) / Math.log(node.base);
      }
      throw new Error('Unknown operator: ' + node.operator);
  }
}

export function parseAndEvaluate(expr) {
  const tokens = tokenize(expr);
  const ast = parse(tokens);
  return evaluate(ast);
}