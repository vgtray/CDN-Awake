#!/bin/bash

# CDN Awake - Database Migration Script
# Usage: ./scripts/migrate.sh [up|down|status|reset]

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Default values
DB_HOST=${POSTGRES_HOST:-localhost}
DB_PORT=${POSTGRES_PORT:-5432}
DB_NAME=${POSTGRES_DB:-cdn_db}
DB_USER=${POSTGRES_USER:-cdn_user}
DB_PASSWORD=${POSTGRES_PASSWORD:-}

MIGRATIONS_DIR="./services/postgres/migrations"

echo -e "${GREEN}🗄️  CDN Awake Database Migration${NC}"
echo "=================================="
echo "Host: $DB_HOST:$DB_PORT"
echo "Database: $DB_NAME"
echo ""

# Function to run SQL file
run_sql() {
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f "$1"
}

# Function to run SQL command
run_cmd() {
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "$1"
}

# Create migrations tracking table
init_migrations() {
    run_cmd "CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        version VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );" 2>/dev/null || true
}

# Get list of applied migrations
get_applied() {
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c \
        "SELECT version FROM schema_migrations ORDER BY version;" 2>/dev/null | tr -d ' '
}

# Check if migration is applied
is_applied() {
    local version=$1
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c \
        "SELECT COUNT(*) FROM schema_migrations WHERE version = '$version';" 2>/dev/null | tr -d ' '
}

# Apply migration
apply_migration() {
    local file=$1
    local version=$(basename "$file" .sql)
    
    echo -e "${YELLOW}Applying migration: $version${NC}"
    
    if run_sql "$file"; then
        run_cmd "INSERT INTO schema_migrations (version) VALUES ('$version');"
        echo -e "${GREEN}✓ Applied: $version${NC}"
    else
        echo -e "${RED}✗ Failed: $version${NC}"
        exit 1
    fi
}

# Main commands
case "${1:-status}" in
    up)
        echo "Running migrations..."
        init_migrations
        
        if [ ! -d "$MIGRATIONS_DIR" ]; then
            echo -e "${YELLOW}No migrations directory found. Using init.sql${NC}"
            if [ -f "./services/postgres/init.sql" ]; then
                run_sql "./services/postgres/init.sql"
                echo -e "${GREEN}✓ Initial schema applied${NC}"
            fi
            exit 0
        fi
        
        for file in $(ls -1 "$MIGRATIONS_DIR"/*.sql 2>/dev/null | sort); do
            version=$(basename "$file" .sql)
            count=$(is_applied "$version")
            
            if [ "$count" -eq "0" ]; then
                apply_migration "$file"
            else
                echo -e "⏭️  Skipping (already applied): $version"
            fi
        done
        
        echo -e "\n${GREEN}✓ All migrations complete${NC}"
        ;;
        
    down)
        echo "Rolling back last migration..."
        # Get last applied migration
        last=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c \
            "SELECT version FROM schema_migrations ORDER BY applied_at DESC LIMIT 1;" 2>/dev/null | tr -d ' ')
        
        if [ -z "$last" ]; then
            echo -e "${YELLOW}No migrations to rollback${NC}"
            exit 0
        fi
        
        rollback_file="$MIGRATIONS_DIR/${last}_down.sql"
        if [ -f "$rollback_file" ]; then
            echo -e "${YELLOW}Rolling back: $last${NC}"
            run_sql "$rollback_file"
            run_cmd "DELETE FROM schema_migrations WHERE version = '$last';"
            echo -e "${GREEN}✓ Rolled back: $last${NC}"
        else
            echo -e "${RED}No rollback file found: $rollback_file${NC}"
            exit 1
        fi
        ;;
        
    status)
        echo "Migration Status:"
        echo "-----------------"
        init_migrations
        
        applied=$(get_applied)
        if [ -z "$applied" ]; then
            echo -e "${YELLOW}No migrations applied yet${NC}"
        else
            echo -e "${GREEN}Applied migrations:${NC}"
            echo "$applied" | while read version; do
                [ -n "$version" ] && echo "  ✓ $version"
            done
        fi
        ;;
        
    reset)
        echo -e "${RED}⚠️  WARNING: This will drop all tables!${NC}"
        read -p "Are you sure? (y/N) " -n 1 -r
        echo
        
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo "Resetting database..."
            run_cmd "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
            
            if [ -f "./services/postgres/init.sql" ]; then
                run_sql "./services/postgres/init.sql"
                echo -e "${GREEN}✓ Database reset complete${NC}"
            fi
        else
            echo "Aborted."
        fi
        ;;
        
    *)
        echo "Usage: $0 [up|down|status|reset]"
        echo ""
        echo "Commands:"
        echo "  up      - Apply all pending migrations"
        echo "  down    - Rollback last migration"
        echo "  status  - Show migration status"
        echo "  reset   - Drop all tables and re-run init.sql"
        exit 1
        ;;
esac
