---
description: >
  Run Javascript functions at key points when executing requests in Prestige HTTP Client.
---

# Event Handling

## Handling for any request

In a Javascript block, the `this.on` context method can be used to add event handlers. For example:

```
### javascript
this.on("finish", result => {
  console.log("Request execution finished", result)
})
```

This will register a callback for the `finish` event, which is fired every time a request execution is finished, successfully or otherwise.

Note that since we are adding the handler in a Javascript block, it will be called only for the requests that are defined *below* this Javascript block.

## Handling for specific requests

We can define event handlers for specific requests, at the end of the request block. The syntax is fairly simple, consider the following example:

```
POST https://httpbun.com/post
Content-Type: application/json

{ "name": "Indra" }

@onFinish(result) {
  console.log("Request execution finished", result)
}
```

This defined a `POST` request with the body content being `{ "name": "Indra" }`, and a callback handler function defined for the `finish` event, just for this request. This `onFinish` function won't be called on the `finish` event of any other requests.

The syntax is for the line to start with `@onFinish`, and then a function argument list, and then the function body wrapped in braces. The above example serves to illustrate this.

## Events list

Currently, only the `finish` event supported. More events may be introduced in the future for various stages of the request execution, depending on usage necessities.
