This repository is a fork of the original repository aimed at providing collaborative editing for code-server. 

The following changes will have to be done: 
- [x] Fixes (the original code still has a few problems, like it not working on windows, text updates only working from Atom not from VSCode and so on)
- [x] Writing automated tests
- [x] Porting to code-server if necessary
- [x] Porting to a different collab provider
- [x] Improving the UI
- [ ] Hosting the collab server inside code-server
- [ ] Automatic connection to code-server and automatic session creation and joining if the same file is edited.
- [ ] Create a nice readme

# Changes

Upon installing the plugin in vscode or code-server, you will now notice a new "Collaboration" section in the explorer. Here you can connect to new collaboration providers (either YJS Websocket or Teletype). In order to connect to teletype you will have to generate an authorization token on your github account and enter it when prompted. In order to connect to YJS, you will have to host a YJS websocket server as described on the YJS Github page. 

Once connected the tree will show all peers connected to the same collab provider and you will be able see shared files, to share and unshare files, please use the new menu entry in the normal file explorer. 

Limitations: 
- YJS does not provide authentication
- Teletype is limited, since it can only host one editorproxy at a time, meaning if you share multiple files, only the last shared file will have cursor sync, while content sync works for all files. 
- When using code server the Teletype access data is stored per workspace and not by user (ie. Browser), since the localstorage provided by vscode is workspace local and not stored in the browser. 

The original readme follows:

# VS Code Extension with Teletype Libraries (Development in Progress)
This repository is for the VS Code extension with Teletype libraries. This extension can be executed in Eclipse Che sidecar as a remote plugin. The aim of this extension is to implement the CoEditing skeleton for Eclipse Che and Theia so that contributors can have the experience similar to Google Docs. This skeleton can be further used for mentoring sessions, code reviews, and co-editing.

## Running the extension in VS Code

- Clone the respository to your local system
```
git clone git@github.com:Rijul5/vscode-teletype.git 
```

- Open terminal and navigate to the cloned respository and use command _code_ in the terminal to launch VS Code.
```
code
```
<img src="figs/code.png" width="700" height="400" alt="Launch VS Code">

- Inside the editor, press _F5_ to compile and launch your extension in a new _Extension Development Host_ window.

<img src="figs/window.png" width="700" height="400" alt="Launch VS Code">

- Inside the _Extension Development Host_ window, use command _CTRL + SHIFT + P_ to open the Command Palette and to find the commands associated with this extension.

<img src="figs/command_view.png" width="700" height="400" alt="Launch VS Code">

- Use command _Join Portal_ in the Command Palette to join the session launched be Teletype Host.

<img src="figs/join_portal.png" width="700" height="400" alt="Launch VS Code">

