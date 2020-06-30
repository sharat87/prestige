# Prestige

An HTTP client, by Shrikant.

This is a *simple*, *text-based*, *in-browser*, HTTP client app that I wanted for myself and wished someone would build
it one day. Well, had to do it myself in the end.

## Under the Hood

Prestige exists thanks to the work of the following open source projects (not exhaustive, thanks to all those who
weren't listed here, but still were just as helpful):

1. [Mithril](https://mithril.js.org/) --- powers the code structure and provides a scaffolding for the interactivity.
1. [Parcel](https://parceljs.org/) --- powers the building and bundling of application assets for deployment.
1. [CodeMirror](https://codemirror.net/) --- powers the code editor.
1. [Prism](https://prismjs.com/) --- powers the syntax highlighting.
1. [Mustache](https://mustache.github.io/) --- powers the templating.
1. [MsgPack](https://msgpack.org/index.html) --- powers the protocol for communication with the proxy server.

## Inspirations

- HTTP Client for Sublime Text: <https://requester.org/>.
- HTTP Client for VS Code: <https://github.com/Huachao/vscode-restclient>.
- REST Client for IntelliJ based IDEs: <https://www.jetbrains.com/help/idea/http-client-in-product-code-editor.html>.

More: <https://github.com/marmelab/awesome-rest>.

TODO: Also support using <https://cors-anywhere.herokuapp.com/> as a proxy?
