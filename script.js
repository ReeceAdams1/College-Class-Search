import { ACADEMIC_YEAR_ID } from './config.js';
import {
    collegeSearchInput,
    collegeListDropdown,
    classInputContainer,
    classNameInput,
    courseListDropdown,
    findKeyButton,
    agreementKeyResultContainer,
    messageArea,
    articulatedCoursesContainerEl,
    articulatedCoursesListEl,
    articulatedCoursesMessageEl,
    loadMoreCollegesButton
} from './domElements.js';
import { showMessage, clearMessages, displayDepartmentArticulations, updateCollegeDropdownUI, updateUIOnCollegeSelect, updateCourseDropdownUI } from './uiUtils.js';
import { processAllArticulationsForSubject } from './dataProcessor.js';
import { fetchAllColleges, fetchInstitutionsList, fetchAgreements, fetchArticulationDetails, fetchCoursesForCollege } from './apiService.js';

let currentReceivingCollegeId = null;
let allInstitutions = [];
let allCourses = [];

// State for batch loading articulated colleges
let allFetchedCommunityColleges = [];
let processedCollegesCount = 0;
let articulatedCollegesCount = 0;
const COLLEGES_PER_BATCH = 10;
let currentOverallArticulationFound = false;
let currentSubjectPrefix = '';

async function fetchColleges() {
    clearMessages(messageArea, agreementKeyResultContainer, articulatedCoursesListEl, articulatedCoursesMessageEl, articulatedCoursesContainerEl);
    collegeSearchInput.placeholder = "Loading colleges...";
    collegeSearchInput.disabled = true;

    try {
        const rawInstitutions = await fetchAllColleges();

        if (!rawInstitutions || rawInstitutions.length === 0) {
            showMessage("No college data received.", messageArea);
            collegeSearchInput.placeholder = "No colleges found";
            return;
        }

        allInstitutions = rawInstitutions.map(inst => ({
            id: inst.id,
            code: inst.code ? inst.code.trim() : 'N/A',
            displayName: (inst.names.find(n => !n.hideInList && n.hasDepartments) || { name: "Unknown College" }).name
        })).filter(inst => inst.displayName !== "Unknown College");

        allInstitutions.sort((a, b) => a.displayName.localeCompare(b.displayName));

        collegeSearchInput.placeholder = "Start typing college name...";
        collegeSearchInput.disabled = false;
        console.log("Colleges fetched and processed successfully.");

    } catch (error) {
        console.error('Error fetching institutions:', error);
        showMessage(`Error loading colleges: ${error.message}. Check console.`, messageArea);
        collegeSearchInput.placeholder = "Error loading colleges";
    }
}

function filterAndDisplayColleges() {
    const searchTerm = collegeSearchInput.value.toLowerCase();
    updateCollegeDropdownUI(searchTerm, allInstitutions, collegeSearchInput, collegeListDropdown, selectCollege);
}

function selectCollege(id, name, code) {
    clearMessages(messageArea, agreementKeyResultContainer, articulatedCoursesListEl, articulatedCoursesMessageEl, articulatedCoursesContainerEl);
    currentReceivingCollegeId = id;
    updateUIOnCollegeSelect(name, collegeSearchInput, collegeListDropdown, classInputContainer, classNameInput);
    loadMoreCollegesButton.classList.add('hidden');
    fetchDepartments(id);
}

async function fetchDepartments(collegeId) {
    allCourses = [];
    classNameInput.placeholder = 'Loading departments...';
    classNameInput.disabled = true;
    try {
        allCourses = await fetchCoursesForCollege(collegeId, ACADEMIC_YEAR_ID);
        classNameInput.placeholder = allCourses.length > 0 ? 'Type to search departments...' : 'Type department code (e.g. MATH)...';
    } catch (error) {
        console.error('Error fetching departments:', error);
        classNameInput.placeholder = 'Type department code (e.g. MATH)...';
    } finally {
        classNameInput.disabled = false;
        classNameInput.focus();
    }
}

function filterAndDisplayCourses() {
    updateCourseDropdownUI(classNameInput.value.toLowerCase(), allCourses, classNameInput, courseListDropdown, selectDepartment);
}

function selectDepartment(code) {
    classNameInput.value = code;
    courseListDropdown.classList.add('hidden');
    classNameInput.focus();
}

async function findAndDisplayArticulationsForMultipleCCs() {
    clearMessages(messageArea, agreementKeyResultContainer, articulatedCoursesListEl, articulatedCoursesMessageEl, articulatedCoursesContainerEl);
    articulatedCoursesListEl.innerHTML = '';
    loadMoreCollegesButton.classList.add('hidden');
    currentOverallArticulationFound = false;
    articulatedCollegesCount = 0;

    if (!currentReceivingCollegeId) {
        showMessage("Please select a receiving college first.", messageArea);
        return;
    }

    currentSubjectPrefix = classNameInput.value.trim().toUpperCase();
    if (!currentSubjectPrefix) {
        showMessage("Please select a department.", agreementKeyResultContainer);
        return;
    }

    showMessage("Fetching community college list...", articulatedCoursesMessageEl, 'info');
    articulatedCoursesContainerEl.classList.remove('hidden');

    try {
        const rawInstitutionsList = await fetchInstitutionsList();
        allFetchedCommunityColleges = rawInstitutionsList.filter(inst => inst.isCommunityCollege === true);
        processedCollegesCount = 0;

        if (allFetchedCommunityColleges.length === 0) {
            showMessage("No community colleges found to search for articulations.", articulatedCoursesMessageEl);
            return;
        }

        articulatedCoursesMessageEl.innerHTML = '';
        showMessage(`Searching ${currentSubjectPrefix} articulations...`, articulatedCoursesMessageEl, 'info');

        await processAndDisplayNextBatch();

    } catch (error) {
        console.error('Error fetching initial community college list:', error);
        showMessage(`Error fetching community college list: ${error.message}`, articulatedCoursesMessageEl);
        loadMoreCollegesButton.classList.add('hidden');
    }
}

async function processAndDisplayNextBatch() {
    const startIndex = processedCollegesCount;
    const endIndex = Math.min(startIndex + COLLEGES_PER_BATCH, allFetchedCommunityColleges.length);
    const collegesToProcess = allFetchedCommunityColleges.slice(startIndex, endIndex);

    if (collegesToProcess.length === 0) {
        loadMoreCollegesButton.classList.add('hidden');
        return;
    }

    if (startIndex > 0) {
        showMessage(`Searching next batch for ${currentSubjectPrefix}...`, articulatedCoursesMessageEl, 'info');
    }

    for (const sendingCC of collegesToProcess) {
        const sendingInstitutionId = sendingCC.id;
        const sendingInstitutionName = (sendingCC.names && sendingCC.names.length > 0) ? sendingCC.names[0].name : "Unknown Community College";

        try {
            const agreementsData = await fetchAgreements(currentReceivingCollegeId, sendingInstitutionId, ACADEMIC_YEAR_ID);
            if (agreementsData.reports && agreementsData.reports.length > 0) {
                const foundReport = agreementsData.reports.find(report =>
                    report.label &&
                    typeof report.label === 'string' &&
                    report.label.toUpperCase().startsWith(currentSubjectPrefix)
                );
                if (foundReport) {
                    const articulationDetailData = await fetchArticulationDetails(foundReport.key);
                    if (articulationDetailData?.result?.articulations) {
                        try {
                            const parsed = JSON.parse(articulationDetailData.result.articulations);
                            const departmentResults = processAllArticulationsForSubject(parsed, currentSubjectPrefix);
                            if (departmentResults.length > 0) {
                                currentOverallArticulationFound = true;
                                displayDepartmentArticulations(departmentResults, sendingInstitutionName, articulatedCoursesListEl);
                                articulatedCollegesCount++;
                            }
                        } catch (e) {
                            console.error(`Error parsing articulation JSON for ${sendingInstitutionName}:`, e);
                        }
                    }
                }
            }
        } catch (error) {
            console.error(`Error processing ${sendingInstitutionName}:`, error);
            const errorDiv = document.createElement('div');
            errorDiv.className = 'p-3 error-message text-sm';
            errorDiv.textContent = `Error for ${sendingInstitutionName}: ${error.message}`;
            articulatedCoursesListEl.appendChild(errorDiv);
        }
    }

    processedCollegesCount += collegesToProcess.length;

    if (processedCollegesCount < allFetchedCommunityColleges.length) {
        loadMoreCollegesButton.classList.remove('hidden');
        showMessage(`Found ${articulatedCollegesCount} match${articulatedCollegesCount !== 1 ? 'es' : ''} so far — searched ${processedCollegesCount} of ${allFetchedCommunityColleges.length} colleges.`, articulatedCoursesMessageEl, 'info');
    } else {
        loadMoreCollegesButton.classList.add('hidden');
        if (!currentOverallArticulationFound) {
            showMessage(`No community colleges offer ${currentSubjectPrefix} articulations.`, articulatedCoursesMessageEl);
        } else {
            showMessage(`Found ${articulatedCollegesCount} community college${articulatedCollegesCount !== 1 ? 's' : ''} with ${currentSubjectPrefix} articulations.`, articulatedCoursesMessageEl, 'info');
        }
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    fetchColleges();
});

collegeSearchInput.addEventListener('input', filterAndDisplayColleges);
collegeSearchInput.addEventListener('focus', () => {
    filterAndDisplayColleges();
});

document.addEventListener('click', function(event) {
    if (collegeSearchInput && collegeListDropdown && collegeSearchInput.parentElement) {
        if (!collegeSearchInput.parentElement.contains(event.target)) {
            collegeListDropdown.classList.add('hidden');
        }
    }
    if (classNameInput && courseListDropdown && classNameInput.parentElement) {
        if (!classNameInput.parentElement.contains(event.target)) {
            courseListDropdown.classList.add('hidden');
        }
    }
});

findKeyButton.addEventListener('click', findAndDisplayArticulationsForMultipleCCs);

loadMoreCollegesButton.addEventListener('click', () => {
    if (!currentSubjectPrefix) {
        showMessage("Please select a department before loading more.", messageArea, 'error');
        return;
    }
    processAndDisplayNextBatch();
});

classNameInput.addEventListener('input', filterAndDisplayCourses);
classNameInput.addEventListener('focus', () => {
    if (allCourses.length > 0) filterAndDisplayCourses();
});

classNameInput.addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        courseListDropdown.classList.add('hidden');
        findKeyButton.click();
    }
});
