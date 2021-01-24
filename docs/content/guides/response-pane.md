# The Response Pane

The Response pane shows up the first time we execute a request. As a minimum, it contains the following details about
the most recently executed request.

1. Time taken for the request to finish.
1. Changes to cookies, if any. Learn more in the [Cookie Management](#cookie-management) section.
1. Status code and reason.
1. Response body.
1. Response headers.
1. Request body.
1. Request headers.

If the request has been through one or more redirects, the responses of those intermediate requests are also available
in the response pane. Try the following request to see this in action:

```
GET http://httpbin.org/cookies/set?first=Sherlock
```

This request sets the cookie called `first` with the value `Sherlock` and then redirects to a different URL.

## Rich data viewing

Some response types can be shown in rich previews. For example, if the response content type is `text/html`, the
response pane can show that in a small iFrame which is probably more useful than the HTML source in the response body.

The following rich viewers are available currently:

1. JSON
1. HTML and XML
1. SVG
