# Javascript Blocks

Javascript blocks begin with the line `### javascript`. That is, when the page-break marker (line starts with `###`) has
`javacript` after the triple hashes, the following block will be treated as Javascript instead of an HTTP request.

For example, consider the following sheet:

```
GET http://httpbin.org/get?id=1

### javascript

alert("ha")

###

GET http://httpbin.org/get?id=2
```

Here, we have two HTTP requests defined with a Javascript block in the middle. If we were to execute the first HTTP
request, the Javascript block **will not** be evaluated. If we were to execute the second HTTP request, the Javascript
**will** be evaluated before the HTTP request is made.

If we put the cursor on the GET line and hit ((Ctrl+Enter)), we see that the request is executed and no alert shows up.
This is because only the Javascript blocks that are above the request being executed, are evaluated.

Only the ones above the executed request will be run.

How is Javascript Evaluated: as a function body, can return a promise

Context details

Event handling (example handler sets `Content-Type` based on body data)

API (in a separate page?).
