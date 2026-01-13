// console.log('[Debug Backend] server.js execution started'); 
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001; // Backend will run on this port

// Middleware
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // To parse JSON request bodies

// Base URL for the Assist API
const ASSIST_API_BASE_URL = 'https://assist.org/api';

// Test route at the root
app.get('/', (req, res) => {
  // console.log('[Debug Backend] Request to / received');
  res.send('Backend server is alive!');
});

// Proxy route for institutions
app.get('/api/institutions', async (req, res) => {
    // console.log('[Debug Backend] Original /api/institutions route hit.');
    try {
        const assistApiUrl = `${ASSIST_API_BASE_URL}/institutions`;
        console.log(`Backend proxying to: ${assistApiUrl}`); // Keep this for operational logging
        
        const response = await axios.get(assistApiUrl);
        
        // console.log(`[Debug Backend] Successfully fetched from Assist API. Status: ${response.status}`);
        res.json(response.data);

    } catch (error) {
        console.error('Error proxying to Assist API (institutions):', error.message); // Keep error logs
        if (error.response) {
            // console.error('[Debug Backend] Error response from Assist API:', error.response.status, error.response.data);
            res.status(error.response.status).json(error.response.data);
        } else if (error.request) {
            // console.error('[Debug Backend] No response received from Assist API. Request made but no response.');
            res.status(504).json({ message: 'No response from Assist API (gateway timeout)' });
        } else {
            // console.error('[Debug Backend] Error setting up request to Assist API:', error.message);
            res.status(500).json({ message: 'Failed to fetch data from Assist API (setup issue)' });
        }
    }
});

// Proxy route for agreements
app.get('/api/agreements', async (req, res) => {
    const { receivingInstitutionId, sendingInstitutionId, academicYearId, categoryCode } = req.query;
    if (!receivingInstitutionId || !sendingInstitutionId || !academicYearId || !categoryCode) {
        return res.status(400).json({ message: 'Missing required query parameters for agreements' });
    }
    try {
        const assistApiUrl = `${ASSIST_API_BASE_URL}/agreements?receivingInstitutionId=${receivingInstitutionId}&sendingInstitutionId=${sendingInstitutionId}&academicYearId=${academicYearId}&categoryCode=${categoryCode}`;
        console.log(`Backend proxying to: ${assistApiUrl}`); // Keep this for operational logging
        const response = await axios.get(assistApiUrl);
        res.json(response.data);
    } catch (error) {
        console.error('Error proxying to Assist API (agreements):', error.message); // Keep error logs
        if (error.response) {
            res.status(error.response.status).json(error.response.data);
        } else {
            res.status(500).json({ message: 'Failed to fetch data from Assist API (agreements)' });
        }
    }
});

// Proxy route for articulation details
app.get('/api/articulation/Agreements', async (req, res) => {
    const { Key } = req.query;
    if (!Key) {
        return res.status(400).json({ message: 'Missing required query parameter: Key' });
    }
    try {
        const assistApiUrl = `${ASSIST_API_BASE_URL}/articulation/Agreements?Key=${Key}`;
        console.log(`Backend proxying to: ${assistApiUrl}`); // Keep this for operational logging
        const response = await axios.get(assistApiUrl);
        res.json(response.data);
    } catch (error) {
        console.error('Error proxying to Assist API (articulation details):', error.message); // Keep error logs
        if (error.response) {
            res.status(error.response.status).json(error.response.data);
        } else {
            res.status(500).json({ message: 'Failed to fetch data from Assist API (articulation details)' });
        }
    }
});

// Catch-all route for debugging 404s - place this LAST
app.use((req, res, next) => {
  // console.log(`[Debug Backend] Catch-all: Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).send("Backend couldn't find that route.");
});

// console.log('[Debug Backend] About to call app.listen');
app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
});
