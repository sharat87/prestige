# The Response Pane

The Response pane shows up the first time we execute a request. It shows the following details of the latest executed
request (in order):

1. Time taken for the request to finish.
1. Changes to cookies, if any. Learn more in the [Cookie Management](cookie-management.md) section.
1. Status code and reason.
1. Response body.
1. Response headers.
1. Request body.
1. Request headers.

<!-- ![Response pane example screenshot](../img/response-pane-1.png) -->

Additionally, if the request has been through one or more redirects, the responses of those intermediate requests are
also available in the response pane. Try the following request to see this in action:

```
GET http://httpbin.org/cookies/set?first=Sherlock
```

This request sets the cookie called `first` with the value `Sherlock` and then redirects to a different URL. After
executing this request, the response pane will show two responses (you'll have to scroll down to see the other one).
This is because the response involved a redirect and Prestige will show us all the redirection step responses, along
with the final one.

## Viewing Rich Data

Prestige understands some response types and can show them in a richer format. For example, when the response is JSON
(arguably the most popular for APIs today), we can see a prettified and syntax-highlighted view of the JSON with support
for folding objects and arrays.

Similar rich viewing support is available for the following response types as well:

1. JSON
1. XML --- Prettified and syntax-highlighted.
1. HTML --- Can use an `iFrame` to render the HTML response.
1. SVG --- Can render as an image, or as HTML inside an `iFrame` or as plain prettified XML.

Any other *text* response will be shown as plain text. Rich previews for other types are not supported (yet).

## Error views

There's predominantly two types of error situation we might end up in, after a request execution.

**One**, the request fails due to server being non-responsive, internet being disconnected, proxy responding erroneously
etc. These are genuine errors where Prestige itself threw up.

**Two**, the request was successful but the HTTP endpoint in the executed request returned an error response like 4xx or
5xx. These are not genuine Prestige errors and so will show up in a response pane as usual with different colors to
highlight the fact that the response is an error.

In the case of type-**one** errors, the response pane shows up in error-style, giving diagnostic details of what
happened, and hopefully, what went wrong and how to address it.

## Toolbar

The response pane has a small toolbar with a few actions.

### Run Again

Clicking the *Run Again* button will execute the request on the *same line* again. What this means is that if a
something has changed in the URL or body or headers in the request that was last executed, the changes take affect when
clicking on this button.

Note that this button doesn't discriminate among `GET`, `POST` or `DELETE` requests. So, for requests that have side
effects (like `POST` or `DELETE`), take care when hitting this button. The side-effects *may* be repeated and that *may*
be unintended.

### Find in Editor

Clicking the *Find in Editor* button will place the cursor in the editor on the line where this request was executed.
For example, if the cursor was placed on line 20 when hitting ((Ctrl+Enter)), then clicking on this button in the
response pane will place the cursor on line 20 and this line will also be scrolled into view (if needed).

## Conclusion

The Response pane is what we look to to represent the response of the request is a meaningful and unambiguous way.
There's very little information in the actual response that is not shown in this pane. As such, the UI here is
intentionally information-heavy. Understanding the various parts of this becomes all the more important to getting more
value out of it.
