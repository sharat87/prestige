# Javascript Blocks

If we put the cursor on the GET line and hit `Ctrl+Enter`, we see that the request is executed and no alert shows up.
This is because only the Javascript blocks that are above the request being executed, are evaluated.

How is Javascript Evaluated: as a function body, can return a promise

Context details

Event handling (example handler sets `Content-Type` based on body data)
