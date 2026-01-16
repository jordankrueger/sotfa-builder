# SOTFA Builder

**State of the Federation Address Builder for Starbase 118**

A comprehensive web application to streamline the creation of the annual State of the Federation Address for the Starbase 118 Star Trek PBEM RPG.

## Features

### Content Collection & Management
- **Role-Based Access**: Admin, Ship Contributor, Taskforce Lead, and Reviewer roles
- **Section Tracking**: Visual progress tracking for all SOTFA sections
- **Status Workflow**: Pending → Draft → Submitted → Approved pipeline
- **Deadline Management**: Set and track deadlines for each section
- **Comments & Review**: Built-in commenting system for feedback

### AI-Powered Assistance
- **Summary Generation**: Generate yearly ship summaries from monthly summaries
- **Content Improvement**: AI-powered editing suggestions
- **Usage Limits**: Built-in rate limiting to manage API costs

### Data Integrations
- **MediaWiki API**: Fetch existing wiki content, ship info, and previous SOTFAs
- **Google Sheets**: Pull roster data and Project Aria simming statistics
- **Real-time Sync**: Keep data up-to-date with external sources

### Output Generation
- **MediaWiki Code**: Generate complete wiki markup ready to paste
- **Preview Mode**: See how content will look on the wiki
- **Google Doc Export**: Plain text export for committee review
- **Copy/Download**: Easy export options

## Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- A Claude API key (from Anthropic)
- Google Cloud service account (for Sheets integration)
- MediaWiki bot credentials (optional, for wiki integration)

### Installation

```bash
# Clone or download the project
cd sotfa-builder

# Install all dependencies
npm run setup

# Copy environment template
cp server/.env.example server/.env

# Edit server/.env with your credentials
```

### Configuration

Edit `server/.env` with your settings:

```env
# Required
JWT_SECRET=your-secure-random-string-here
ANTHROPIC_API_KEY=your-claude-api-key

# Google Sheets Integration (optional but recommended)
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
ROSTER_SPREADSHEET_ID=your-google-sheet-id
ARIA_SPREADSHEET_ID=your-project-aria-sheet-id

# MediaWiki Integration (optional)
WIKI_API_URL=https://wiki.starbase118.net/wiki/api.php
WIKI_BOT_USERNAME=YourBotUsername
WIKI_BOT_PASSWORD=YourBotPassword

# AI Settings
AI_DAILY_LIMIT=50
AI_TOKENS_PER_REQUEST=4000
```

### Running Locally

```bash
# Development mode (runs both frontend and backend)
npm run dev

# The app will be available at:
# Frontend: http://localhost:5173
# API: http://localhost:3001
```

### First-Time Setup

1. Start the application
2. Navigate to http://localhost:5173/login
3. The first user to register will need to be manually promoted to admin
4. Or use the API directly to create an admin user:

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "email": "admin@starbase118.net",
    "password": "your-secure-password",
    "displayName": "SOTFA Admin",
    "role": "admin"
  }'
```

## Usage Guide

### For Administrators

1. **Create SOTFA Year**: Go to Admin → Create New Year
2. **Add Ships**: Add ship report sections for each active vessel
3. **Create Users**: Add contributors with appropriate roles
4. **Assign Sections**: Assign ship reports to their respective COs
5. **Set Deadlines**: Configure deadlines for each section
6. **Monitor Progress**: Use the dashboard to track completion
7. **Review & Approve**: Approve submitted sections
8. **Generate Output**: Export final MediaWiki code

### For Ship Contributors

1. **Login**: Access the system with your credentials
2. **Find Your Ship**: Navigate to Ship Reports
3. **Enter Information**: Fill in CO/XO details
4. **Write Summary**: Compose your ship's yearly summary
5. **Use AI Help** (optional): Generate summary from monthly highlights
6. **Save Draft**: Save your progress
7. **Submit**: Submit for review when complete

### For Reviewers

1. **View Sections**: Browse all submitted sections
2. **Add Comments**: Provide feedback on content
3. **Track Status**: Monitor approval progress

## Architecture

```
sotfa-builder/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── contexts/      # React contexts (auth, etc.)
│   │   ├── pages/         # Page components
│   │   ├── styles/        # CSS/Tailwind styles
│   │   └── utils/         # API clients, helpers
│   └── ...
├── server/                 # Node.js/Express backend
│   ├── src/
│   │   ├── middleware/    # Auth, validation
│   │   ├── models/        # Database schema
│   │   ├── routes/        # API endpoints
│   │   └── services/      # AI, Wiki, Sheets integrations
│   └── ...
└── shared/                 # Shared types/utilities
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### SOTFA
- `GET /api/sotfa/current` - Get current SOTFA year and sections
- `POST /api/sotfa/year` - Create new year (admin)
- `POST /api/sotfa/ship` - Add ship report (admin)
- `GET /api/sotfa/section/:id` - Get section details
- `PUT /api/sotfa/section/:id` - Update section
- `POST /api/sotfa/section/:id/submit` - Submit for review
- `POST /api/sotfa/section/:id/approve` - Approve section (admin)
- `GET /api/sotfa/generate` - Generate wiki code (admin)

### AI
- `GET /api/ai/usage` - Check AI usage limits
- `POST /api/ai/ship-summary` - Generate ship summary
- `POST /api/ai/improve` - Improve content

### Data
- `GET /api/data/roster` - Get fleet roster
- `GET /api/data/ships` - Get active ships
- `GET /api/data/stats/:year` - Get simming stats

## Deployment

### Option 1: Vercel + Railway

**Frontend (Vercel):**
```bash
cd client
vercel deploy
```

**Backend (Railway):**
1. Create a new Railway project
2. Connect your GitHub repo
3. Set environment variables
4. Deploy

### Option 2: Docker

```dockerfile
# Dockerfile example (create in project root)
FROM node:18-alpine

WORKDIR /app
COPY . .

RUN npm run setup
RUN npm run build

EXPOSE 3001
CMD ["npm", "start"]
```

### Option 3: Traditional VPS

```bash
# On your server
git clone <your-repo>
cd sotfa-builder
npm run setup
npm run build

# Use PM2 for process management
pm2 start server/dist/index.js --name sotfa-builder
```

## Security Notes

- Always use HTTPS in production
- Set a strong, unique JWT_SECRET
- Never commit `.env` files
- Rotate API keys periodically
- Use the built-in rate limiting

## Customization

### Adding New Section Types

1. Update `server/src/models/database.ts` to add new section type
2. Create appropriate form components in `client/src/pages/`
3. Update `server/src/services/wikiGenerator.ts` for output

### Modifying LCARS Theme

Edit `client/tailwind.config.js` and `client/src/styles/index.css`

## Troubleshooting

### "No SOTFA year found"
Create a new year in Admin → Create New Year

### AI features not working
Check that ANTHROPIC_API_KEY is set correctly in `.env`

### Google Sheets data not loading
Verify your service account has read access to the spreadsheet

### Wiki integration fails
Check WIKI_API_URL and bot credentials

## Contributing

Contributions welcome! Please submit pull requests to the main repository.

## License

MIT License - Feel free to adapt for your own PBEM RPG needs.

## Credits

Built for [Starbase 118](https://www.starbase118.net/) - A Star Trek PBEM RPG since 1994.

---

*Live long and prosper!* 🖖
