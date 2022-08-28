---
weight: 2
---

# API Reference

## Context

Inside Javascript blocks, `this` points to a `Context` object. A new `Context` object is created for every type a request is executed. This context object has fields and methods that can be used to influence the request that's about to be executed, and can even execute more requests of its own.

Every time we hit <kbd>Ctrl+Enter</kbd> to execute a request, a new `Context` object is created. This `Context` object is used as the `this` everywhere. It's the `this` in Javascript blocks, in `${}` interpolations in request headers, in body function prefixed with `=` and anywhere else where Javascript shows up.

A `Context` object contains the following:

`.data`
:    An empty object, that can be used to store any custom data to be used in templating HTTP requests. If you set a value in this object like `this.data.myName = "Sherlock";`, then it will be available directly for use in your URL and headers, like `GET https://httpbun.com/get?name=${myName}`. Of course, since the whole context object is also available here, we could also achieve the same thing with `GET https://httpbun.com/get?name=${this.data.myName}`.

`.basicAuth(username: string, password: string)`
:   Returns the string to be passed to the `Authorization` header for doing HTTP Basic Authentication. For example, we can use this function to do basic auth in an `Authorization` header.

        Authorization: ${this.basicAuth("scott", "tiger")}

    This will set the Authorization header to do basic auth with username `"scott"` and password `"tiger"`.

`.multipart(object)`
:   Constructs a multipart request body when building a request. This is intended for use in the body section, in the following fashion:

        POST https://httpbun.com/post

        = this.multipart({
            file1: "file 1 content",
            file2: "file 2 content here"
        })

    This request will make a POST call to `https://httpbun.com/post`, with `Content-Type` as `multipart/form-data`, with the two fields `file1` and `file2`. You can use files from the File Bucket with the `.fileFromBucket()` method.

`.fileFromBucket(fileName: string): Promise<MultiPartFormValue>`
:   This function can be used to load a file from the file bucket. It returns a Promise that resolves to `MultiPartFormValue` object, so it's ideally suited to be used in the `.multipart` method. For example, if you've dropped a file called `info.txt` in your File Bucket, then it can be uploaded to an API like this:

        POST https://httpbun.com/post

        = this.multipart({
            file: await this.fileFromBucket("info.txt"),
        })

`.storeItem(key: string, data: any): void`
:   Takes a key-value pair and stores it in the browser's `localStorage`. While it is possible to use the `localStorage` object directly form inside Javascript blocks, its not recommended, and may indeed not be allowed at all in the future.

    Note that any data stored with this method are common across all documents. If you do `this.storeItem("ocean", "Pacific")` in one Prestige document, it'll be available for any other Prestige document you open, in the form of `this.loadItem("ocean")`.

`.loadItem(key: string): any`
:   Takes a key, and returns the value, if any, that was previously stored by calling the `.storeItem` method. While it is possible to use the `localStorage` object directly form inside Javascript blocks, its not recommended, and may indeed not be allowed at all in the future.
