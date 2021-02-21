# The Editor

The Editor is the main piece of the whole Prestige interface where we can define HTTP requests and add Javascript
blocks. Hitting ((Ctrl+Enter)) (or ((Cmd+Enter))) while the editor is focused will execute a HTTP request, depending on
the cursor position.

## Prettify JSON body

For JSON body content, the editor can show a little icon on the line number for the first line in the body which can
prettify the JSON body when clicked.

## The new button

On every page break line (line starting with `###`), the editor shows a `+ new` button which will create a new HTTP
request in place that you can then edit/execute.

## Conclusion

The editor, although probably is where most of a developer's time is spent, is quite bare-bones today. It is just enough
powerful to get the job done, but more exciting stuff should be added soon.
