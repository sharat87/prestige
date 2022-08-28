---
description: >
  Guide to adding, editing, deleting cookies to be used for executing requests in Prestige HTTP Client.
---

# Cookie Management

Prestige keeps its Cookie management features fairly simple. You can view the cookies currently being available from the
**Cookies** button in the toolbar at the top-right. This popup shows all the cookies that will be sent to any request
made from Prestige (if the domain matches, of course).

Note that these cookies are *not* cookies set or used by Prestige itself. These are cookies set by the APIs and HTTP
requests made from inside Prestige and are used only when making further requests.

For example, let's execute the following request:

```
GET http://httpbun.com/cookies/set?person=Krishna
```

This request's response will set a cookie on the `httpbun.com` domain with the name `person` and the value `Krishna`.
After executing this, the Cookies button at the top right should read *Cookies (1)*, indicating that there is one
cookie.

!!! note
    Additionally, you should see a small message at the top of the result pane saying something like `1 new cookie added`, indicating that this request resulted in a new cookie being added.

Now let's run run the following request:

```
GET http://httpbun.com/cookies
```

This endpoint fetches the cookies on this domain. In the response we should see the `person=Krishna` cookie.

As an exercise after this, go the Cookies popup and delete this cookie. Now run this above request and see that there
are no cookies now.

## Role of Browser Cookies

Cookies in your browser **do not** affect requests made from Prestige. This is deliberately the case for security
reasons as well as so we have a clean cookie state when testing APIs.

What does this mean though? That if you have logged into Google or GitHub or some other such website, and you hit a URL
from that logged in service from within Prestige, that request won't have the knowledge of your being logged in. The
request is executed as if it's in a separate *incognito* window, so to speak. To further the analogy there, the cookies
that show up in the Cookies popup from the top-right, are the cookies in this *incognito* window.

## Sessions

Thanks to Prestige's automatic handling of cookies, we can login with a request, then run requests to access
authenticated resources, and then logout with another appropriate request. The cookie addition (on login), usage (for
authenticated resources) and deletion (on logout) are all handled transparently by Prestige and you shouldn't have to
directly deal with Cookies for simple use cases such as this.

## Working Details

Cookies are added when an appropriate `Set-Cookie` header is present in the response. This behaviour is very similar to
how browsers process cookies and should present no surprises there.

When Prestige sees a response with a `Set-Cookie` header that has an `expires` value pointing to a time in the past, the
cookie is promptly deleted. The result pane will now show a little message at the top stating this fact.

Manually adding/editing cookies is not currently supported. It's not a feature I've needed a lot so far, so didn't
prioritize it. But I do intend to add it some day, just not soon, unless there's good demand for this.

## Conclusion

Working with HTTP APIs is very incomplete without talking about Cookies. Prestige has automatic browser-like cookie
handling out-of-the-box so we seldom need to explicitly think about it. And when we do need to take a closer look at the
cookies Prestige is managing, it's just a click away from the top toolbar.
