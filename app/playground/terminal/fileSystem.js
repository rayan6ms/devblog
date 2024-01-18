const fileSystem = {
  root: {
    type: 'directory',
    permissions: 'r--',
    hidden: false,
    size: 21474836,
    contents: {
      bin: {
        type: 'directory',
        permissions: 'r--',
        hidden: false,
        size: 1,
        contents: {
          ls: {
            type: 'file',
            permissions: 'r--',
            hidden: false,
            size: 1,
            content: 'ls command'
          },
          cd: {
            type: 'file',
            permissions: 'r--',
            hidden: false,
            size: 1,
            content: 'cd command'
          },
          pwd: {
            type: 'file',
            permissions: 'r--',
            hidden: false,
            size: 1,
            content: 'pwd command'
          },
          mkdir: {
            type: 'file',
            permissions: 'r--',
            hidden: false,
            size: 1,
            content: 'mkdir command'
          },
          rm: {
            type: 'file',
            permissions: 'r--',
            hidden: false,
            size: 1,
            content: 'rm command'
          },
          rmdir: {
            type: 'file',
            permissions: 'r--',
            hidden: false,
            size: 1,
            content: 'rmdir command'
          },
          cat: {
            type: 'file',
            permissions: 'r--',
            hidden: false,
            size: 1,
            content: 'cat command'
          },
          touch: {
            type: 'file',
            permissions: 'r--',
            hidden: false,
            size: 1,
            content: 'touch command'
          },
          mv: {
            type: 'file',
            permissions: 'r--',
            hidden: false,
            size: 1,
            content: 'mv command'
          },
          cp: {
            type: 'file',
            permissions: 'r--',
            hidden: false,
            size: 1,
            content: 'cp command'
          },
          date: {
            type: 'file',
            permissions: 'r--',
            hidden: false,
            size: 1,
            content: 'date command'
          },
          whoami: {
            type: 'file',
            permissions: 'r--',
            hidden: false,
            size: 1,
            content: 'whoami command'
          },
          hostname: {
            type: 'file',
            permissions: 'r--',
            hidden: false,
            size: 1,
            content: 'hostname command'
          },
          history: {
            type: 'file',
            permissions: 'r--',
            hidden: false,
            size: 1,
            content: 'history command'
          },
          find: {
            type: 'file',
            permissions: 'r--',
            hidden: false,
            size: 1,
            content: 'find command'
          },
          echo: {
            type: 'file',
            permissions: 'r--',
            hidden: false,
            size: 1,
            content: 'echo command'
          },
          clear: {
            type: 'file',
            permissions: 'r--',
            hidden: false,
            size: 1,
            content: 'clear command'
          },
          help: {
            type: 'file',
            permissions: 'r--',
            hidden: false,
            size: 1,
            content: 'help command'
          },
        },
      },
      boot: {
        type: 'directory',
        permissions: 'r--',
        hidden: false,
        size: 1,
        contents: {}
      },
      dev: {
        type: 'directory',
        permissions: 'r--',
        hidden: false,
        size: 1,
        contents: {}
      },
      etc: {
        type: 'directory',
        permissions: 'r--',
        hidden: false, size: 1,
        contents: {
          config: {
            type: 'file',
            permissions: 'r--',
            hidden: false,
            size: 1,
            content: 'Config data here.'
          }
        }
      },
      home: {
        type: 'directory',
        permissions: 'rw-',
        hidden: false, size: 1215726,
        contents: {
          rayan: {
            type: 'directory',
            permissions: 'rw-',
            hidden: false, size: 1,
            contents: {
              Desktop: {
                type: 'directory',
                permissions: 'rw-',
                hidden: false,
                size: 1,
                contents: {}
              },
              Documents: {
                type: 'directory',
                permissions: 'rw-',
                contents: {
                  file1: {
                    type: 'file',
                    permissions: 'rw-',
                    hidden: false,
                    size: 1,
                    content: 'Hello, world!'
                  },
                  file2: {
                    type: 'file',
                    permissions: 'rw-',
                    hidden: false,
                    size: 1,
                    content: 'This is another file.'
                  },
                }
              },
              Downloads: {
                type: 'directory',
                permissions: 'rw-',
                hidden: false,
                size: 1,
                contents: {}
              },
              Games: {
                type: 'directory',
                permissions: 'rw-',
                hidden: false,
                size: 1,
                contents: {}
              },
              Music: {
                type: 'directory',
                permissions: 'rw-',
                hidden: false,
                size: 1,
                contents: {}
              },
              Pictures: {
                type: 'directory',
                permissions: 'rw-',
                hidden: false,
                size: 1,
                contents: {}
              },
              Public: {
                type: 'directory',
                permissions: 'rw-',
                hidden: false,
                size: 1,
                contents: {}
              },
              Templates: {
                type: 'directory',
                permissions: 'rw-',
                hidden: false,
                size: 1,
                contents: {}
              },
              Videos: {
                type: 'directory',
                permissions: 'rw-',
                hidden: false,
                size: 1,
                contents: {}
              },
              '.bashrc': {
                type: 'file',
                permissions: 'rw-',
                hidden: true,
                size: 1024,
                content: 'export PATH=$PATH:/usr/local/bin'
              },
              '.profile': {
                type: 'file',
                permissions: 'rw-',
                hidden: true,
                size: 512,
                content: '# User specific environment'
              },
              '.vimrc': {
                type: 'file',
                permissions: 'rw-',
                hidden: true,
                size: 256,
                content: 'syntax on'
              },
              '.gitconfig': {
                type: 'file',
                permissions: 'rw-',
                hidden: true,
                size: 128,
                content: '[user]\n\tname = Rayan'
              },
            }
          }
        }
      },
      lib: {
        type: 'directory',
        permissions: 'r--',
        hidden: false,
        size: 1,
        contents: {}
      },
      sbin: {
        type: 'directory',
        permissions: 'r--',
        hidden: false,
        size: 1,
        contents: {}
      },
      usr: {
        type: 'directory',
        permissions: 'r--',
        hidden: false,
        size: 1,
        contents: {}
      },
      var: {
        type: 'directory',
        permissions: 'rw-',
        hidden: false,
        size: 1,
        contents: {}
      }
    }
  }
};

export default fileSystem;