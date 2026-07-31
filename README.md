# College Articulation Finder

A browser-based search tool for finding California community-college courses that articulate to a selected receiving institution and course. The application uses ASSIST data through a small Node.js/Express backend and presents matching articulation results in a searchable, batch-loaded interface.

## What the project does

Students transferring between California colleges often need to determine which community-college course satisfies a course requirement at another institution. This project streamlines that process by allowing a user to:

1. Search for and select a receiving institution.
2. Enter a target course such as `MATH 1A` or `CS 61A`.
3. Query articulation agreements from California community colleges.
4. Review matching course equivalents in batches of ten colleges.

## Key features

- Searchable institution dropdown
- Course-subject and course-number parsing
- ASSIST institution, agreement, and articulation queries
- Express proxy that manages ASSIST session cookies and XSRF tokens
- Automatic session refresh and one-time retry after authentication errors
- Parsing of nested articulation data and conjunctions
- Progressive batch loading across community colleges
- Responsive light/dark interface built with Tailwind CSS
- Clear status, empty-result, and per-college error messages

## Architecture

```text
Browser UI
   │
   ├── Website.html          Page structure and Tailwind-based interface
   ├── script.js             Application state and search workflow
   ├── apiService.js         Frontend API requests
   ├── dataProcessor.js      Course and articulation parsing
   ├── uiUtils.js            Result rendering and UI updates
   ├── domElements.js        Shared DOM references
   └── config.js             Academic-year configuration
             │
             ▼
Node.js / Express backend
   └── backend/server.js     Static server and ASSIST API proxy
             │
             ▼
ASSIST API
```

The backend obtains and caches the ASSIST session cookies and XSRF token, then proxies requests for institutions, agreements, and articulation details. This keeps session handling out of the browser and avoids exposing the external API workflow directly to the frontend.

## Repository structure

```text
.
├── Website.html
├── script.js
├── apiService.js
├── dataProcessor.js
├── uiUtils.js
├── domElements.js
├── config.js
├── backend/
│   ├── server.js
│   ├── package.json
│   └── package-lock.json
├── .gitignore
└── README.md
```

## Requirements

- Node.js 18 or newer recommended because the backend uses the built-in `fetch` API
- npm
- An internet connection for ASSIST requests and Tailwind/Google Fonts loaded from CDNs

## Installation

Clone the repository and install the backend dependencies:

```bash
git clone https://github.com/ReeceAdams1/College-Class-Search.git
cd College-Class-Search/backend
npm install
```

## Running the application

Start the backend from the `backend` directory:

```bash
node server.js
```

Then open:

```text
http://localhost:3001
```

The backend serves the project files and redirects the root route to `Website.html`.

## Using the search

1. Wait for the institution list to load.
2. Type part of a college or university name and select a receiving institution.
3. Enter a course in a recognizable format, such as:
   - `MATH 1A`
   - `ENGL 101`
   - `CS 61A`
4. Select **Find Articulation**.
5. Review the first ten community-college results.
6. Select **Load 10 More** to continue through the remaining institutions.

## Configuration

The academic year used for ASSIST agreement requests is defined in `config.js`:

```javascript
export const ACADEMIC_YEAR_ID = 75;
```

Update this value when targeting a different ASSIST academic-year identifier. The code currently treats it as a manually maintained configuration value.

The backend port defaults to `3001` and can be overridden with the `PORT` environment variable:

```bash
PORT=4000 node server.js
```

On Windows PowerShell:

```powershell
$env:PORT=4000
node server.js
```

## Backend routes

| Route | Purpose |
|---|---|
| `GET /api/institutions` | Retrieves the institution list |
| `GET /api/agreements` | Retrieves agreement reports for a sending/receiving institution pair |
| `GET /api/articulation/Agreements` | Retrieves articulation details for an agreement key |

The agreements route expects `receivingInstitutionId`, `sendingInstitutionId`, `academicYearId`, and `categoryCode`. The articulation route expects `Key`.

## Error handling

The project includes handling for:

- Missing query parameters
- Failed ASSIST requests
- Expired cached sessions
- Invalid or empty articulation responses
- JSON parsing failures
- Colleges with no matching articulation
- Unknown frontend/backend routes

## My contribution

I built the frontend search workflow, modularized the browser code into API, parsing, DOM, and UI responsibilities, implemented the Node.js/Express proxy for ASSIST session handling, and developed the batch-processing flow used to search articulation agreements across community colleges.

## Current limitations

- The project depends on ASSIST endpoints and response formats that may change.
- The academic-year identifier must currently be updated manually.
- Searches can require many external requests because community colleges are processed individually.
- There is no automated test suite yet.
- Results should be confirmed on the official ASSIST website before making enrollment or transfer decisions.

## Suggested next improvements

- Add automated tests for course parsing and articulation-data processing.
- Add controlled request concurrency and stronger rate-limit handling.
- Cache institution and agreement responses.
- Replace the CDN-based Tailwind setup with a production build.
- Add screenshots or a short demonstration GIF.
- Add a selectable academic year rather than relying on a constant.

## Data source and disclaimer

This project uses information obtained from ASSIST, California's official articulation and student-transfer information system. It is an independent educational project and is not affiliated with or endorsed by ASSIST. Always verify final articulation decisions using the official source and an academic adviser.
