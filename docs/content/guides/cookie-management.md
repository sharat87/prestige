# Cookie Management

The _Cookies_ button at the top-left opens up a popup with Cookies information. These cookies are NOT cookies set or
used by Prestige itself. These are cookies set by the APIs and HTTP requests made from inside Prestige and are used when
making further requests.

For example, let's execute the following request:

```
GET http://httpbin.org/cookies/set?person=Krishna
```

This request's response will set a cookie on the `httpbin.org` domain with the name `person` and the value `Krishna`.
After executing this, the Cookies button at the top right should read _Cookies (1)_, indicating that there is one
cookie.

Now let's run run the following request:

```
GET http://httpbin.org/cookies
```

This endpoint fetches the cookies on this domain. In the response we should see the `person=Krishna` cookie.

As an exercise after this, go the Cookies popup and delete this cookie. Now run this above request and see that there
are no cookies now.

## More

Cookies are added when an appropriate `Set-Cookie` header is present in the response.

When are cookies deleted?

What about expired cookies?

Logging in to an API, running authenticated requests and then logging out.

Manually adding/editing/deleting cookies.

Import/export cookies as text in `cookies.txt` format, for use with cURL.
(This feature is not available yet).
