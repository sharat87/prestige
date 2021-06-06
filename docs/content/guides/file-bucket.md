# File Bucket

The file bucket is primarily used for creating requests that can upload files to the endpoint.

## Uploading a simple text file

Simple things should be easy, right? So to upload a small text (or even binary for that matter) file, here's what you
do:

1. Open the File Bucket from the top-right and drop a small file from your system into the File Bucket.
    - Notice the new entry in the File Bucket listing the name of the file and it's file size. Let's say the file name
        is `article_about_prestige.md`, for example's sake.

1. Now create a request in the editor like the following:

        POST http://httpbun.com/post

        = this.multipart({
            file: await this.fileFromBucket("article_about_prestige.md")
        })

1. Then just run this request by hitting ((Ctrl+Enter)). Notice that the `files` key in the response object does contain
   this file, verifying that this file was indeed uploaded.

That's basically it! That's how you upload files in Prestige. Drop them in your file bucket, load them in your request
bodies (don't forget the `await`).

Note that the File Bucket is emptied every time the browser is refreshed. The files are not stored on our server and are
ephemeral. This is by design and is unlikely to change.

## Conclusion

This is a very powerful feature wrapped up in a sweet and simple interface. Using the `=` sign at the start of a request
body will let us write any Javascript expression to construct the request body any which way we want. Learn more about
this in our guide on [Templating](./templating.md).
