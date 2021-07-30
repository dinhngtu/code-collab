# VSCode and code-server collaboration extension

This extension was based on [Rijul5/vscode-teletype](https://github.com/Rijul5/vscode-teletype). It provides collaboration via Teletype and YJS to vscode and [code-server](https://github.com/cdr/code-server). Also if you install [kainzpat14/code-server-collab](https://github.com/kainzpat14/code-server-collab) all users of the same code-server instance and workspace will automatically collaborate with each other. 

Limitatons: 
  - Only YJS-Websocket is supported, all other YJS communication methods are not supported
  - Teletype support is limited, it can only share one editor at a time. I do not recommend using it
  - The plugin will not work if your browser disables webworkers, as most browsers do if you server code-server via http and not https. So please use an https reverse proxy when using code-server. Note that Chrome will even disable service workers if you are using self-signed certificates, please see [StackOverflow](https://stackoverflow.com/questions/38728176/can-you-use-a-service-worker-with-a-self-signed-certificate) on how to circumvent this or simply use firefox.

## Installation

In order to install the plugin in code-server or vscode please download the vsix file and put it into your workspace, then right click on it in the vscode/code-server explorer and select "Install Extension VSIX". Then restart vscode or reload your code-server window.

### Code-Server
In order to automatically enable collaboration for code-server please follow the instructions on [kainzpat14/code-server-collab](https://github.com/kainzpat14/code-server-collab).

### YJS
In order to collaborate via an external YJS websocket server, the server has to be hosted as described in [yjs/y-websocket](https://github.com/yjs/y-websocket).

### Teletype
In order to use teletype either host your own server, or generate teletype credentials using [https://teletype.atom.io/login](https://teletype.atom.io/login) and provide them to the plugin when you are asked.

Please see [Teletype](https://teletype.atom.io/) for the semantics of teletype cooperation. 

## How to use

After installing the plugin make sure the explorer shows the "Collaboration" view and no "Collaboration Connection" view. 

code-server Collaboration needs no further settings, you do not need to configure or share anything, it should work out of the box.

The "Collaboration" view should display a root node named "Connections". Here you can add new connections via the "+" button or via the "Add Collaboration Connection" command. 

Once you added a connection you should see the remote peers and their shared files. Shared files can be opened via a double click. In order to share or unshare your own files please use the "Share via Collaboration" and "Unshare via Collaboration" commands in the explorer context menu. 
