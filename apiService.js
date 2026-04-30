const BACKEND_API_BASE_URL = 'http://localhost:3001/api'; // Your backend URL

/**
 * Fetches data from the given API URL and returns the JSON response.
 * @param {string} apiUrl The complete URL to fetch data from.
 * @param {string} errorMessagePrefix Prefix for error messages if fetch fails.
 * @returns {Promise<any>} A promise that resolves with the JSON data.
 * @throws {Error} If the fetch operation fails.
 */
async function fetchData(apiUrl, errorMessagePrefix = 'API fetch failed') {
    // console.log(`Frontend calling: ${apiUrl}`); // Intentionally commented out now
    const response = await fetch(apiUrl);
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `${errorMessagePrefix}: ${response.status} ${response.statusText}` }));
        throw new Error(errorData.message || `${errorMessagePrefix}: ${response.status} ${response.statusText}`);
    }
    return await response.json();
}

/**
 * Fetches the main list of all institutions from the backend.
 * @returns {Promise<any>} A promise that resolves with the institutions data.
 */
export async function fetchAllColleges() {
    const apiUrl = `${BACKEND_API_BASE_URL}/institutions`;
    return fetchData(apiUrl, 'Backend API fetch failed (institutions)');
}

/**
 * Fetches a list of all institutions from the backend.
 * @returns {Promise<any>} A promise that resolves with the list of institutions.
 */
export async function fetchInstitutionsList() {
    const apiUrl = `${BACKEND_API_BASE_URL}/institutions`;
    return fetchData(apiUrl, 'Backend API fetch failed (institutions list)');
}

/**
 * Fetches agreements between institutions from the backend.
 * @param {string|number} receivingInstitutionId ID of the receiving institution.
 * @param {string|number} sendingInstitutionId ID of the sending institution.
 * @param {string|number} academicYearId ID of the academic year.
 * @param {string} categoryCode Category code for the agreements (e.g., 'prefix').n * @returns {Promise<any>} A promise that resolves with the agreements data.
 */
export async function fetchAgreements(receivingInstitutionId, sendingInstitutionId, academicYearId, categoryCode = 'prefix') {
    const apiUrl = `${BACKEND_API_BASE_URL}/agreements?receivingInstitutionId=${receivingInstitutionId}&sendingInstitutionId=${sendingInstitutionId}&academicYearId=${academicYearId}&categoryCode=${categoryCode}`;
    return fetchData(apiUrl, 'Backend API fetch failed (agreements)');
}

/**
 * Fetches articulation details for a specific report key from the backend.
 * @param {string} reportKey The key for the articulation report.
 * @returns {Promise<any>} A promise that resolves with the articulation details.
 */
export async function fetchArticulationDetails(reportKey) {
    const apiUrl = `${BACKEND_API_BASE_URL}/articulation/Agreements?Key=${reportKey}`;
    return fetchData(apiUrl, 'Backend API fetch failed (articulation details)');
}

/**
 * Fetches the list of courses available at a receiving institution.
 * @param {string|number} receivingInstitutionId ID of the receiving institution.
 * @param {string|number} academicYearId ID of the academic year.
 * @returns {Promise<Array<{code: string, title: string}>>}
 */
export async function fetchCoursesForCollege(receivingInstitutionId, academicYearId) {
    const apiUrl = `${BACKEND_API_BASE_URL}/courses?receivingInstitutionId=${receivingInstitutionId}&academicYearId=${academicYearId}`;
    return fetchData(apiUrl, 'Backend API fetch failed (courses)');
}
