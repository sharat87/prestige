db.getMongo().getDBNames()
	.filter(n => n.startsWith("Test"))
	.forEach(n => db.getMongo().getDB(n).dropDatabase())

db.getSiblingDB("TestLoginForUserWithGithub").users.insertOne({
	"email": "TestLoginForUserWithGithub@example.com",
	"github": {
		databaseId: 123,
		username: "TestLoginForUserWithGithub",
		avatarURL: "https://avatars3.githubusercontent.com/u/123?v=4",
		accessToken: Binary(Buffer.from("ZHVtbXktYWNjZXNzLXRva2Vu", "base64")),
	},
	"isEmailVerified": false,
	"password": Binary(Buffer.from("YmNyeXB0JCQyYSQxNCRZNTMxWWozcVh2cm13WW5yLk9ldThlTUIuVEVRRUVvdWVzSXNsaVRPVUtMQW9ydUJ2OVByVw==", "base64")),
	"createdAt": new Date,
})

db.getSiblingDB("TestLoginForUserWithoutGithub").users.insertOne({
	"email": "TestLoginForUserWithoutGithub@example.com",
	"github": null,
	"isEmailVerified": false,
	"password": Binary(Buffer.from("YmNyeXB0JCQyYSQxNCRZNTMxWWozcVh2cm13WW5yLk9ldThlTUIuVEVRRUVvdWVzSXNsaVRPVUtMQW9ydUJ2OVByVw==", "base64")),
	"createdAt": new Date,
})


