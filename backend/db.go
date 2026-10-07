package main

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"time"

	_ "modernc.org/sqlite"
)

type Database struct {
	db *sql.DB
}

func initDB() (*Database, error) {
	dbPath := os.Getenv("DATABASE_PATH")
	if dbPath == "" {
		// Check standard locations
		candidates := []string{
			"data/perplexed.db",
			"../data/perplexed.db",
			"/app/data/perplexed.db",
		}
		found := false
		for _, cand := range candidates {
			if _, err := os.Stat(cand); err == nil {
				dbPath = cand
				found = true
				break
			}
		}
		if !found {
			// If not found, default to data/perplexed.db or ../data/perplexed.db depending on directory structure
			if _, err := os.Stat("../frontend"); err == nil {
				// Running from backend/ directory
				dbPath = "../data/perplexed.db"
			} else {
				dbPath = "data/perplexed.db"
			}
		}
	}

	dir := filepath.Dir(dbPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create db directory: %w", err)
	}

	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		return nil, fmt.Errorf("failed to open sqlite db at %s: %w", dbPath, err)
	}

	// Optimize SQLite connection settings
	db.SetMaxOpenConns(1) // SQLite works best with 1 writer or serialized access
	db.SetMaxIdleConns(1)

	schema := `
	CREATE TABLE IF NOT EXISTS UserOption (
		userUid TEXT NOT NULL,
		key TEXT NOT NULL,
		value TEXT NOT NULL,
		PRIMARY KEY (userUid, key)
	);

	CREATE TABLE IF NOT EXISTS NevuReviewsLocalUsers (
		id TEXT NOT NULL PRIMARY KEY,
		created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		username TEXT NOT NULL,
		avatar TEXT NOT NULL
	);

	CREATE TABLE IF NOT EXISTS NevuReviewsLocal (
		itemID TEXT NOT NULL,
		userID TEXT NOT NULL,
		created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		rating INTEGER,
		message TEXT NOT NULL DEFAULT 'No review text provided',
		spoilers BOOLEAN NOT NULL DEFAULT 0,
		PRIMARY KEY (itemID, userID),
		FOREIGN KEY (userID) REFERENCES NevuReviewsLocalUsers(id) ON DELETE CASCADE
	);

	CREATE TABLE IF NOT EXISTS ServerConfig (
		key TEXT NOT NULL PRIMARY KEY,
		value TEXT NOT NULL
	);
	`

	if _, err := db.Exec(schema); err != nil {
		return nil, fmt.Errorf("failed to initialize db schema: %w", err)
	}

	return &Database{db: db}, nil
}

func (d *Database) Close() error {
	return d.db.Close()
}

func (d *Database) GetServerConfig(key string) (string, error) {
	var val string
	err := d.db.QueryRow("SELECT value FROM ServerConfig WHERE key = ?", key).Scan(&val)
	if err == sql.ErrNoRows {
		return "", nil
	}
	return val, err
}

func (d *Database) SetServerConfig(key, value string) error {
	query := `
	INSERT INTO ServerConfig (key, value)
	VALUES (?, ?)
	ON CONFLICT(key) DO UPDATE SET value = excluded.value
	`
	_, err := d.db.Exec(query, key, value)
	return err
}

func (d *Database) GetUserOptions(userUID string) ([]UserOption, error) {
	rows, err := d.db.Query("SELECT userUid, key, value FROM UserOption WHERE userUid = ?", userUID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var options []UserOption
	for rows.Next() {
		var opt UserOption
		if err := rows.Scan(&opt.UserUID, &opt.Key, &opt.Value); err != nil {
			return nil, err
		}
		options = append(options, opt)
	}
	if options == nil {
		options = []UserOption{}
	}
	return options, rows.Err()
}

func (d *Database) GetUserOption(userUID, key string) (*UserOption, error) {
	row := d.db.QueryRow("SELECT userUid, key, value FROM UserOption WHERE userUid = ? AND key = ?", userUID, key)
	var opt UserOption
	if err := row.Scan(&opt.UserUID, &opt.Key, &opt.Value); err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &opt, nil
}

func (d *Database) SetUserOption(userUID, key, value string) (*UserOption, error) {
	query := `
	INSERT INTO UserOption (userUid, key, value)
	VALUES (?, ?, ?)
	ON CONFLICT(userUid, key) DO UPDATE SET value = excluded.value
	`
	if _, err := d.db.Exec(query, userUID, key, value); err != nil {
		return nil, err
	}
	return &UserOption{UserUID: userUID, Key: key, Value: value}, nil
}

func (d *Database) GetLocalReviews(itemID, userID string) ([]Review, error) {
	var query string
	var args []any

	if userID != "" {
		query = `
		SELECT r.itemID, r.userID, r.created_at, r.rating, r.message, r.spoilers,
		       u.id, u.username, u.avatar
		FROM NevuReviewsLocal r
		LEFT JOIN NevuReviewsLocalUsers u ON r.userID = u.id
		WHERE r.itemID = ? AND r.userID = ?
		ORDER BY r.created_at DESC
		`
		args = []any{itemID, userID}
	} else {
		query = `
		SELECT r.itemID, r.userID, r.created_at, r.rating, r.message, r.spoilers,
		       u.id, u.username, u.avatar
		FROM NevuReviewsLocal r
		LEFT JOIN NevuReviewsLocalUsers u ON r.userID = u.id
		WHERE r.itemID = ?
		ORDER BY r.created_at DESC
		`
		args = []any{itemID}
	}

	rows, err := d.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var reviews []Review
	for rows.Next() {
		var rev Review
		var rating sql.NullInt64
		var createdAt string
		var uid, uname, uavatar sql.NullString

		if err := rows.Scan(
			&rev.ItemID,
			&rev.UserID,
			&createdAt,
			&rating,
			&rev.Message,
			&rev.Spoilers,
			&uid,
			&uname,
			&uavatar,
		); err != nil {
			return nil, err
		}

		rev.CreatedAt = createdAt
		if rating.Valid {
			r := int(rating.Int64)
			rev.Rating = &r
		}
		rev.Visibility = "LOCAL"

		if uid.Valid {
			rev.User = &ReviewUser{
				ID:       uid.String,
				Username: uname.String,
				Avatar:   uavatar.String,
			}
		}

		reviews = append(reviews, rev)
	}

	if reviews == nil {
		reviews = []Review{}
	}
	return reviews, rows.Err()
}

func (d *Database) UpsertLocalReview(itemID string, user *PlexUser, message string, rating *int, spoilers *bool) error {
	username := user.FriendlyName
	if username == "" {
		username = user.Username
	}
	avatar := user.Thumb

	userUpsert := `
	INSERT INTO NevuReviewsLocalUsers (id, created_at, username, avatar)
	VALUES (?, CURRENT_TIMESTAMP, ?, ?)
	ON CONFLICT(id) DO UPDATE SET username = excluded.username, avatar = excluded.avatar
	`
	if _, err := d.db.Exec(userUpsert, user.UUID, username, avatar); err != nil {
		return fmt.Errorf("failed to upsert review user: %w", err)
	}

	hasSpoilers := false
	if spoilers != nil && *spoilers {
		hasSpoilers = true
	}

	var ratingVal sql.NullInt64
	if rating != nil {
		ratingVal = sql.NullInt64{Int64: int64(*rating), Valid: true}
	}

	now := time.Now().UTC().Format(time.RFC3339)
	reviewUpsert := `
	INSERT INTO NevuReviewsLocal (itemID, userID, created_at, rating, message, spoilers)
	VALUES (?, ?, ?, ?, ?, ?)
	ON CONFLICT(itemID, userID) DO UPDATE SET
		message = excluded.message,
		rating = excluded.rating,
		spoilers = excluded.spoilers
	`
	if _, err := d.db.Exec(reviewUpsert, itemID, user.UUID, now, ratingVal, message, hasSpoilers); err != nil {
		return fmt.Errorf("failed to upsert review: %w", err)
	}

	return nil
}

func (d *Database) DeleteLocalReview(itemID, userID string) error {
	_, err := d.db.Exec("DELETE FROM NevuReviewsLocal WHERE itemID = ? AND userID = ?", itemID, userID)
	return err
}
