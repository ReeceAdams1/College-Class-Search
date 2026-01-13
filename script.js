import { ACADEMIC_YEAR_ID } from './config.js'; // Updated to only import what's available and needed
import {
    collegeSearchInput,
    collegeListDropdown,
    classInputContainer,
    classNameInput,
    findKeyButton,
    agreementKeyResultContainer,
    messageArea,
    articulatedCoursesContainerEl,
    articulatedCoursesListEl,
    articulatedCoursesMessageEl,
    loadMoreCollegesButton // Added import for the new button
} from './domElements.js';
// Import UI utility functions
import { showMessage, clearMessages, displayArticulatedCourses, updateCollegeDropdownUI, updateUIOnCollegeSelect } from './uiUtils.js';
// Import data processing functions
import { extractSubjectPrefix, extractSubjectAndNumber, processArticulationData } from './dataProcessor.js';
// Import API service functions
import { fetchAllColleges, fetchInstitutionsList, fetchAgreements, fetchArticulationDetails } from './apiService.js';

let currentReceivingCollegeId = null;
let allInstitutions = [];

// State for batch loading articulated colleges
let allFetchedCommunityColleges = [];
let processedCollegesCount = 0;
const COLLEGES_PER_BATCH = 10;
let currentOverallArticulationFound = false; // To track if any articulation is found across batches

/**
 * Fetches college data from the API and stores it.
 */
async function fetchColleges() {
    clearMessages(messageArea, agreementKeyResultContainer, articulatedCoursesListEl, articulatedCoursesMessageEl, articulatedCoursesContainerEl);
    collegeSearchInput.placeholder = "Loading colleges...";
    collegeSearchInput.disabled = true;

    try {
        // Use fetchAllColleges from apiService.js - THIS IS THE FIX
        const rawInstitutions = await fetchAllColleges(); // No argument needed now

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
        console.log("Colleges fetched and processed successfully."); // Keep this operational log

    } catch (error) {
        console.error('Error fetching institutions:', error);
        showMessage(`Error loading colleges: ${error.message}. Check console.`, messageArea);
        collegeSearchInput.placeholder = "Error loading colleges";
    }
}

/**
 * Filters colleges based on search term and updates the UI.
 */
function filterAndDisplayColleges() {
    const searchTerm = collegeSearchInput.value.toLowerCase();
    updateCollegeDropdownUI(searchTerm, allInstitutions, collegeSearchInput, collegeListDropdown, selectCollege);
}

/**
 * Handles the selection of a college from the custom list.
 */
function selectCollege(id, name, code) {
    clearMessages(messageArea, agreementKeyResultContainer, articulatedCoursesListEl, articulatedCoursesMessageEl, articulatedCoursesContainerEl);
    currentReceivingCollegeId = id;
    updateUIOnCollegeSelect(name, collegeSearchInput, collegeListDropdown, classInputContainer, classNameInput);
    loadMoreCollegesButton.classList.add('hidden'); // Hide button when new college is selected
}

/**
 * Main function to initiate fetching and displaying articulations.
 * Fetches all community colleges and then processes the first batch.
 */
async function findAndDisplayArticulationsForMultipleCCs() {
    clearMessages(messageArea, agreementKeyResultContainer, articulatedCoursesListEl, articulatedCoursesMessageEl, articulatedCoursesContainerEl);
    articulatedCoursesListEl.innerHTML = ''; // Clear previous results
    loadMoreCollegesButton.classList.add('hidden'); // Hide button initially
    currentOverallArticulationFound = false; // Reset for new search

    if (!currentReceivingCollegeId) {
        showMessage("Please select a receiving college first.", messageArea);
        return;
    }
    const fullClassNameInput = classNameInput.value; 
    if (!fullClassNameInput.trim()) {
        showMessage("Please enter a class name.", agreementKeyResultContainer);
        return;
    }
    const firstCoursePart = extractSubjectAndNumber(fullClassNameInput);
    const subjectPrefix = extractSubjectPrefix(firstCoursePart);
    if (!subjectPrefix) {
        showMessage("Could not determine subject from class name. Please use format like 'MATH 101' or 'CS 1A'.", agreementKeyResultContainer);
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
        
        // Initial message update before processing the first batch
        articulatedCoursesMessageEl.innerHTML = ''; // Clear "Fetching community college list..."
        showMessage(`Processing articulations for ${fullClassNameInput}...`, articulatedCoursesMessageEl, 'info');

        await processAndDisplayNextBatch(fullClassNameInput, subjectPrefix); // Process the first batch

    } catch (error) {
        console.error('Error fetching initial community college list:', error);
        showMessage(`Error fetching community college list: ${error.message}`, articulatedCoursesMessageEl);
        loadMoreCollegesButton.classList.add('hidden');
    }
}

/**
 * Processes and displays the next batch of community colleges.
 */
async function processAndDisplayNextBatch(fullClassNameInput, subjectPrefix) {
    const startIndex = processedCollegesCount;
    const endIndex = Math.min(startIndex + COLLEGES_PER_BATCH, allFetchedCommunityColleges.length);
    const collegesToProcess = allFetchedCommunityColleges.slice(startIndex, endIndex);

    if (collegesToProcess.length === 0 && startIndex === 0) { // No colleges at all, or no more to process initially
        if(allFetchedCommunityColleges.length > 0 && !currentOverallArticulationFound){
             // This message might be premature if it's the very first batch and it had no articulations
        } else if (allFetchedCommunityColleges.length === 0) {
            // Already handled by findAndDisplayArticulationsForMultipleCCs
        }
        loadMoreCollegesButton.classList.add('hidden');
        return;
    }
    
    // Indicate processing if it's not the very first batch call (message already set for first batch)
    if (startIndex > 0) {
        showMessage(`Processing next batch of colleges for ${fullClassNameInput}...`, articulatedCoursesMessageEl, 'info');
    }

    // This is where the loop from the old findAndDisplayArticulationsForMultipleCCs will go
    // For now, let's just simulate processing and update counts
    for (const sendingCC of collegesToProcess) {
        const sendingInstitutionId = sendingCC.id;
        const sendingInstitutionName = (sendingCC.names && sendingCC.names.length > 0) ? sendingCC.names[0].name : "Unknown Community College";
        let articulationDisplayedForThisCC = false;

        // console.log(`Searching articulations from: ${sendingInstitutionName} (ID: ${sendingInstitutionId}) to receiving college ID: ${currentReceivingCollegeId} for class input: ${fullClassNameInput} (using subject: ${subjectPrefix})`);
        const academicYearId = ACADEMIC_YEAR_ID;

        try {
            const agreementsData = await fetchAgreements(currentReceivingCollegeId, sendingInstitutionId, academicYearId);
            if (!agreementsData.reports || agreementsData.reports.length === 0) {
                // console.log(`No agreement reports found for ${sendingInstitutionName} with subject prefix ${subjectPrefix}.`);
            } else {
                const foundReport = agreementsData.reports.find(report => report.label && typeof report.label === 'string' && report.label.toUpperCase().startsWith(subjectPrefix.toUpperCase()));
                if (foundReport) {
                    // console.log(`Found report key ${foundReport.key} for ${sendingInstitutionName} and subject ${subjectPrefix}`);
                    const articulationDetailData = await fetchArticulationDetails(foundReport.key);
                    if (articulationDetailData && articulationDetailData.result && typeof articulationDetailData.result.articulations !== 'undefined') {
                        const articulationsStr = articulationDetailData.result.articulations;
                        if (articulationsStr !== null && articulationsStr !== "") {
                            let articulationsDataParsed;
                            try {
                                articulationsDataParsed = JSON.parse(articulationsStr);
                                const { articulationOptionStrings, topLevelConjunction, matchingArticulationFound: specificClassMatchInAgreement } = processArticulationData(articulationsDataParsed, subjectPrefix, fullClassNameInput);
                                if (specificClassMatchInAgreement) {
                                    currentOverallArticulationFound = true;
                                    if (articulationOptionStrings.length > 0) {
                                        // console.log(`[Debug ScriptConjunction] Passing to displayArticulatedCourses - Sending CC: ${sendingInstitutionName}, topLevelConjunction:`, topLevelConjunction, `(Options: ${articulationOptionStrings.join('|')})`);
                                        displayArticulatedCourses(articulationOptionStrings, sendingInstitutionName, topLevelConjunction, articulatedCoursesListEl);
                                        articulationDisplayedForThisCC = true;
                                    } else {
                                        // console.log(`Class matching '${fullClassNameInput}' (subject: '${subjectPrefix}') found in agreement with ${sendingInstitutionName}, but no specific articulated courses listed.`);
                                    }
                                }
                            } catch (e) {
                                console.error(`Error parsing articulation JSON for ${sendingInstitutionName}:`, e);
                            }
                        }
                    }
                }
            }
        } catch (error) {
            console.error(`Error processing ${sendingInstitutionName}:`, error);
            // Optionally display a message per-college failure in the list
            const errorDiv = document.createElement('div');
            errorDiv.className = 'p-3 error-message text-sm';
            errorDiv.textContent = `Error fetching articulation for ${sendingInstitutionName}.`;
            articulatedCoursesListEl.appendChild(errorDiv);
        }

        if (!articulationDisplayedForThisCC) {
            const noArticulationMsg = `${sendingInstitutionName} does not have an articulation for ${fullClassNameInput}.`;
            const msgDiv = document.createElement('div');
            msgDiv.className = 'p-3 info-message text-sm'; 
            msgDiv.textContent = noArticulationMsg;
            if (articulatedCoursesListEl) articulatedCoursesListEl.appendChild(msgDiv);
        }
    }

    processedCollegesCount += collegesToProcess.length;

    // Update UI after processing the batch
    if (processedCollegesCount < allFetchedCommunityColleges.length) {
        loadMoreCollegesButton.classList.remove('hidden');
        showMessage(`Displayed ${processedCollegesCount} of ${allFetchedCommunityColleges.length} community colleges.`, articulatedCoursesMessageEl, 'info');
    } else {
        loadMoreCollegesButton.classList.add('hidden');
        if (!currentOverallArticulationFound && allFetchedCommunityColleges.length > 0) {
            showMessage(`Searched all ${allFetchedCommunityColleges.length} community colleges. No articulations found for class '${fullClassNameInput}'.`, articulatedCoursesMessageEl);
        } else if (currentOverallArticulationFound) {
            showMessage(`All ${allFetchedCommunityColleges.length} community colleges processed.`, articulatedCoursesMessageEl, 'info');
        } else {
             // This case should ideally be covered by initial check in findAndDisplayArticulationsForMultipleCCs
            articulatedCoursesMessageEl.innerHTML = ''; 
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
        const isClickInsideSearchContainer = collegeSearchInput.parentElement.contains(event.target);
        if (!isClickInsideSearchContainer) {
            collegeListDropdown.classList.add('hidden');
        }
    }
});

findKeyButton.addEventListener('click', findAndDisplayArticulationsForMultipleCCs);

// Event listener for the new button
loadMoreCollegesButton.addEventListener('click', () => {
    // Need to get fullClassNameInput and subjectPrefix again, or store them
    // For simplicity in this step, let's re-evaluate them. This can be optimized.
    const fullClassNameInput = classNameInput.value;
    const firstCoursePart = extractSubjectAndNumber(fullClassNameInput);
    const subjectPrefix = extractSubjectPrefix(firstCoursePart);
    
    if (!fullClassNameInput.trim() || !subjectPrefix) {
        showMessage("Please ensure a class is entered correctly before loading more.", messageArea, 'error');
        return;
    }
    processAndDisplayNextBatch(fullClassNameInput, subjectPrefix);
});

classNameInput.addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        findKeyButton.click();
    }
});
