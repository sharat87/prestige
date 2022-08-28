package dbclient

import (
	"context"
	"fmt"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"log"
	"regexp"
	"time"
)

type (
	User struct {
		Email           string         `json:"email" bson:"email"`
		Password        []byte         `json:"password" bson:"password"`
		IsEmailVerified bool           `json:"isEmailVerified" bson:"isEmailVerified"`
		Github          *GithubDetails `json:"github" bson:"github"`
		CreatedAt       time.Time      `json:"createdAt" bson:"createdAt"`
	}

	GithubDetails struct {
		Id          string `json:"id" bson:"id"`
		DatabaseId  uint   `json:"databaseId" bson:"databaseId"`
		AccessToken []byte `json:"accessToken" bson:"accessToken"`
		Username    string `json:"username" bson:"username"`
		AvatarURL   string `json:"avatarURL" bson:"avatarURL"`
	}

	SessionDTO struct {
		Sid             string    `json:"sid"`
		Email           string    `json:"email"`
		GithubAuthState string    `json:"githubAuthState" bson:"githubAuthState"`
		CreatedAt       time.Time `json:"createdAt" bson:"createdAt"`
		ExpiresAt       time.Time `json:"expiresAt" bson:"expiresAt"`
	}

	SessionManager interface {
		SetEmail(ctx context.Context, email string) error
	}

	SessionManagerImpl struct {
		DB  *mongo.Database
		Sid string
	}

	DBClient interface {
		CreateUser(ctx context.Context, user User) error
		FindUserByEmail(ctx context.Context, email string) (*User, error)
		UpdateUser(ctx context.Context, filter bson.M, updates bson.M) (*mongo.UpdateResult, error)
		CreateSession(ctx context.Context, session SessionDTO) error
		UpdateSession(ctx context.Context, sid string, updates map[string]any) error
		FindSession(ctx context.Context, sid string) *SessionDTO
	}

	// Impl implements DBClient
	Impl struct {
		NativeDatabase *mongo.Database
	}
)

func New(ctx context.Context, dbUri string) DBClient {
	client, err := mongo.Connect(ctx, options.Client().ApplyURI(dbUri))
	if err != nil {
		log.Panicf("Error connecting to MongoDB: %v", err)
	}

	dbName := regexp.MustCompile(`[^/]/(\w+)`).FindStringSubmatch(dbUri)[1]
	log.Printf("Opening database %q", dbName)

	database := client.Database(dbName)

	/*expireAfterSeconds := int32(0)
	mustCreateIndex(
		ctx,
		database.Collection("sessions"),
		"session_expire",
		bson.A{"expiresAt"},
		&options.IndexOptions{
			ExpireAfterSeconds: &expireAfterSeconds,
		},
	)

	mustCreateUniqueIndex(ctx, database.Collection("sessions"), "sid_unique", "sid")
	mustCreateUniqueIndex(ctx, database.Collection("users"), "email_unique", "email")
	*/

	return &Impl{
		NativeDatabase: database,
	}
}

func mustCreateUniqueIndex(ctx context.Context, collection *mongo.Collection, indexName string, key string) {
	t := true
	mustCreateIndex(ctx, collection, indexName, bson.A{key}, &options.IndexOptions{
		Unique: &t,
	})
}

func mustCreateIndex(
	ctx context.Context,
	collection *mongo.Collection,
	indexName string,
	keys bson.A,
	indexOptions *options.IndexOptions,
) {
	keysMap := bson.M{}
	for _, key := range keys {
		keysMap[key.(string)] = 1
	}

	indexOptions.Name = &indexName

	usersIndexes := collection.Indexes()
	_, err := usersIndexes.CreateOne(ctx, mongo.IndexModel{
		Keys:    keysMap,
		Options: indexOptions,
	})
	if err != nil {
		log.Panicf("Error creating %q index: %v", indexName, err)
	}
}

func (db *Impl) Close() error {
	return db.NativeDatabase.Client().Disconnect(context.Background())
}

func (db *Impl) CreateUser(ctx context.Context, user User) error {
	user.CreatedAt = time.Now().UTC()

	insertResult, err := db.NativeDatabase.Collection("users").InsertOne(ctx, user)
	if err != nil {
		log.Printf("Error inserting request to MongoDB: %v", err)
		return err
	}

	if insertResult.InsertedID == nil {
		return fmt.Errorf("error inserting user to MongoDB, no ID returned")
	}

	return nil
}

func (db *Impl) FindUserByEmail(ctx context.Context, email string) (*User, error) {
	user := &User{}

	err := db.NativeDatabase.Collection("users").FindOne(ctx, bson.M{"email": email}).Decode(user)
	if err != nil {
		if err != mongo.ErrNoDocuments {
			log.Printf("Error finding user by email: %q; %v", email, err)
		}
		return nil, err
	}

	return user, nil
}

func (db *Impl) UpdateUser(ctx context.Context, filter bson.M, updates bson.M) (*mongo.UpdateResult, error) {
	updateResult, err := db.NativeDatabase.Collection("users").UpdateOne(
		ctx,
		filter,
		bson.M{
			"$set": updates,
		},
	)
	if err != nil {
		return nil, err
	}

	return updateResult, nil
}

func (db *Impl) CreateSession(ctx context.Context, session SessionDTO) error {
	session.CreatedAt = time.Now().UTC()
	session.ExpiresAt = session.CreatedAt.Add(time.Hour * 24 * 7)

	insertResult, err := db.NativeDatabase.Collection("sessions").InsertOne(ctx, session)
	if err != nil {
		return err
	}

	if insertResult.InsertedID == nil {
		return fmt.Errorf("error inserting user to MongoDB, no ID returned")
	}

	return nil
}

func (db *Impl) UpdateSession(ctx context.Context, sid string, updates map[string]any) error {
	updates["expiresAt"] = time.Now().UTC().Add(time.Hour * 24 * 7)

	updateResult, err := db.NativeDatabase.Collection("sessions").UpdateOne(
		ctx,
		bson.M{
			"sid": sid,
		},
		bson.M{
			"$set": updates,
		},
	)
	if err != nil {
		return err
	}

	if updateResult.MatchedCount == 0 {
		return fmt.Errorf("no sessions matched for update")
	}

	return nil
}

func (db *Impl) FindSession(ctx context.Context, sid string) *SessionDTO {
	session := &SessionDTO{}

	err := db.NativeDatabase.Collection("sessions").FindOne(ctx, bson.M{"sid": sid}).Decode(session)
	if err != nil {
		if err != mongo.ErrNoDocuments {
			log.Printf("Error finding session by sid: %q; %v", sid, err)
		}
		return nil
	}

	return session
}

func (sm *SessionManagerImpl) SetEmail(ctx context.Context, email string) error {
	if sm.Sid == "" {
		return fmt.Errorf("cannot set email without sid")
	}

	updateResult, err := sm.DB.Collection("sessions").UpdateOne(
		ctx,
		bson.M{
			"sid": sm.Sid,
		},
		bson.M{
			"$set": map[string]any{
				"email": email,
			},
		},
	)
	if err != nil {
		return err
	}

	if updateResult.MatchedCount == 0 {
		return fmt.Errorf("no sessions matched for update, session probably expired")
	}

	return nil
}
