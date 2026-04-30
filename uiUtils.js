import { collegeListDropdown, classInputContainer, classNameInput, articulatedCoursesListEl } from './domElements.js';

/**
 * Displays an error or info message in a specified container.
 * @param {string} message - The message to display.
 * @param {HTMLElement} container - The DOM element to display the message in.
 * @param {string} type - 'error' or 'info'.
 */
export function showMessage(message, container, type = 'error') {
    if (!container) {
        console.error("Attempted to show message in a null container:", message);
        return;
    }
    const messageClass = type === 'info' ? 'info-message' : 'error-message';
    container.innerHTML = `<div class="${messageClass}">${message}</div>`;
    container.classList.remove('hidden'); 
}

/**
 * Clears messages from specified containers.
 * @param {HTMLElement} messageArea - The general message area.
 * @param {HTMLElement} agreementKeyResultContainer - The container for agreement key results.
 * @param {HTMLElement} articulatedCoursesListEl - The list element for articulated courses.
 * @param {HTMLElement} articulatedCoursesMessageEl - The message element for articulated courses.
 * @param {HTMLElement} articulatedCoursesContainerEl - The main container for articulated courses.
 */
export function clearMessages(messageArea, agreementKeyResultContainer, articulatedCoursesListEl, articulatedCoursesMessageEl, articulatedCoursesContainerEl) {
    if (messageArea) messageArea.innerHTML = '';
    if (agreementKeyResultContainer) {
        agreementKeyResultContainer.innerHTML = '';
        agreementKeyResultContainer.classList.add('hidden');
    }

    if (articulatedCoursesListEl) articulatedCoursesListEl.innerHTML = '';
    if (articulatedCoursesMessageEl) articulatedCoursesMessageEl.innerHTML = '';
    if (articulatedCoursesContainerEl) articulatedCoursesContainerEl.classList.add('hidden');
}

/**
 * Displays a list of articulated courses in the UI for a single sending institution.
 * Appends to the existing list.
 * @param {Array<string>} courseOptionStrings - Array of pre-formatted strings, each representing an articulation option.
 * @param {string} sendingInstitutionName - The display name of the sending institution.
 * @param {string|null} apiConjunction - The conjunction ("and", "or") from the API for joining these options, or null.
 * @param {HTMLElement} listElement - The DOM element to append the course to.
 */
export function displayArticulatedCourses(courseOptionStrings, sendingInstitutionName, apiConjunction, listElement) {
    // console.log('[Debug UIConjunction] displayArticulatedCourses received apiConjunction:', apiConjunction, '(type:', typeof apiConjunction, ')');
    // console.log('[Debug UIConjunction] courseOptionStrings:', courseOptionStrings);

    if (!listElement) {
        console.error("articulatedCoursesListEl is not defined or null in displayArticulatedCourses");
        return;
    }
    if (!courseOptionStrings || courseOptionStrings.length === 0) {
        console.log(`No specific articulated courses to display for ${sendingInstitutionName}`);
        return;
    }

    const styledConjunctionClasses = 'mx-1 px-2 py-0.5 bg-blue-500 text-white rounded text-xs font-semibold';

    // Process each course option string for internal conjunctions
    const processedCourseOptions = courseOptionStrings.map(option => {
        let currentProcessingString = option; 
        let containsInternalOr = false;
        let containsInternalAnd = false;
        // console.log(`[Debug Map] Original option for internal processing: "${option}"`);

        if (currentProcessingString.includes(' %%AND%% ')) {
            // console.log(`[Debug Map] Found internal " %%AND%% " in "${currentProcessingString}"`);
            currentProcessingString = currentProcessingString.replace(/ %%AND%% /g, ` <span class="${styledConjunctionClasses}">AND</span> `);
            // console.log(`[Debug Map] String after internal AND replace: "${currentProcessingString}"`);
            containsInternalAnd = true;
        }
        
        if (currentProcessingString.includes(' %%OR%% ')) { 
            // console.log(`[Debug Map] Found internal " %%OR%% " in "${currentProcessingString}"`);
            currentProcessingString = currentProcessingString.replace(/ %%OR%% /g, ` <span class="${styledConjunctionClasses}">OR</span> `);
            // console.log(`[Debug Map] String after internal OR replace: "${currentProcessingString}"`);
            containsInternalOr = true; 
        }
        
        let finalMappedString = currentProcessingString;
        // Add parentheses only if an internal OR was processed.
        // If only internal ANDs were processed, parentheses are not added.
        if (containsInternalOr) {
            finalMappedString = `(${currentProcessingString})`;
        } else if (containsInternalAnd) {
            // Only AND(s) found, no parentheses needed as per request
            // finalMappedString is already currentProcessingString which has styled ANDs
        }
        // If neither (single course), finalMappedString is just the original option string (currentProcessingString)

        // console.log(`[Debug Map] Final mapped string for this option (to be joined with top-level conjunction): "${finalMappedString}"`);
        return finalMappedString;
    });

    let combinedHtml = '';
    if (processedCourseOptions.length > 0) {
        combinedHtml = processedCourseOptions[0]; // Start with the first (potentially processed) course option

        if (processedCourseOptions.length > 1) {
            let topLevelConjunctionText = 'AND/OR'; 
            let topLevelConjunctionClasses = 'mx-1 italic text-sm'; 
            const lowerApiConjunction = apiConjunction ? apiConjunction.toLowerCase() : null;

            if (lowerApiConjunction === 'or') {
                topLevelConjunctionText = 'OR';
                topLevelConjunctionClasses = styledConjunctionClasses; 
            } else if (lowerApiConjunction === 'and') {
                topLevelConjunctionText = 'AND';
                topLevelConjunctionClasses = styledConjunctionClasses;
            } else if (apiConjunction) { 
                topLevelConjunctionText = apiConjunction.toUpperCase();
                topLevelConjunctionClasses = 'mx-1 font-semibold text-sm';
            }
            // console.log('[Debug UIConjunction] ', lowerApiConjunction, 'condition met. Classes:', topLevelConjunctionClasses);

            for (let i = 1; i < processedCourseOptions.length; i++) {
                combinedHtml += ` <span class="${topLevelConjunctionClasses}">${topLevelConjunctionText}</span> `;
                combinedHtml += processedCourseOptions[i];
            }
        }
    }

    const courseDiv = document.createElement('div');
    courseDiv.className = 'p-3 bg-gray-50 dark:bg-gray-700 rounded-md shadow-sm border border-gray-200 dark:border-gray-600';
    
    courseDiv.innerHTML = `
        <h4 class="text-md text-gray-800 dark:text-gray-200"><span class="font-semibold text-blue-600 dark:text-blue-400">${sendingInstitutionName}:</span> ${combinedHtml}</h4>
    `;
    listElement.appendChild(courseDiv);
}

/**
 * Displays all department articulations for a single sending institution.
 * @param {Array<{receivingCourseLabel: string, articulationOptionStrings: Array<string>, topLevelConjunction: string|null}>} departmentResults
 * @param {string} sendingInstitutionName
 * @param {HTMLElement} listElement
 */
export function displayDepartmentArticulations(departmentResults, sendingInstitutionName, listElement) {
    if (!listElement || !departmentResults || departmentResults.length === 0) return;

    const styledConjunctionClasses = 'mx-1 px-2 py-0.5 bg-blue-500 text-white rounded text-xs font-semibold';

    const rowsHtml = departmentResults.map(({ receivingCourseLabel, articulationOptionStrings, topLevelConjunction }) => {
        const processedOptions = articulationOptionStrings.map(option => {
            let s = option;
            if (s.includes(' %%AND%% ')) s = s.replace(/ %%AND%% /g, ` <span class="${styledConjunctionClasses}">AND</span> `);
            if (s.includes(' %%OR%% ')) s = `(${s.replace(/ %%OR%% /g, ` <span class="${styledConjunctionClasses}">OR</span> `)})`;
            return s;
        });

        let sendingHtml = processedOptions[0] || '';
        if (processedOptions.length > 1) {
            const lc = topLevelConjunction ? topLevelConjunction.toLowerCase() : null;
            const conjText = lc === 'or' ? 'OR' : lc === 'and' ? 'AND' : 'AND/OR';
            const conjClass = (lc === 'or' || lc === 'and') ? styledConjunctionClasses : 'mx-1 italic text-sm';
            for (let i = 1; i < processedOptions.length; i++) {
                sendingHtml += ` <span class="${conjClass}">${conjText}</span> ${processedOptions[i]}`;
            }
        }

        return `<div class="text-sm py-1 border-t border-gray-200 dark:border-gray-600 first:border-t-0"><span class="font-medium text-gray-700 dark:text-gray-300 mr-1">${receivingCourseLabel}:</span>${sendingHtml}</div>`;
    }).join('');

    const courseDiv = document.createElement('div');
    courseDiv.className = 'p-3 bg-gray-50 dark:bg-gray-700 rounded-md shadow-sm border border-gray-200 dark:border-gray-600';
    courseDiv.innerHTML = `
        <h4 class="text-md font-semibold text-blue-600 dark:text-blue-400 mb-1">${sendingInstitutionName}</h4>
        ${rowsHtml}
    `;
    listElement.appendChild(courseDiv);
}

/**
 * Filters and displays colleges in the custom dropdown based on search term.
 * @param {string} searchTerm - The current search term.
 * @param {Array} allInstitutions - The complete list of institutions.
 * @param {HTMLElement} collegeSearchInputElement - The college search input element.
 * @param {HTMLElement} collegeListDropdownElement - The dropdown element to display results.
 * @param {function} selectCollegeCallback - Callback function when a college is selected.
 */
export function updateCollegeDropdownUI(searchTerm, allInstitutions, collegeSearchInputElement, collegeListDropdownElement, selectCollegeCallback) {
    collegeListDropdownElement.innerHTML = '';
    let showDropdown = false;

    if (!searchTerm) {
        if (document.activeElement === collegeSearchInputElement && allInstitutions.length > 0) {
            const promptItem = document.createElement('div');
            // Added Tailwind classes for styling
            promptItem.className = 'college-list-item px-4 py-2 text-sm text-gray-500 dark:text-gray-400'; 
            promptItem.textContent = 'Type to filter colleges...';
            collegeListDropdownElement.appendChild(promptItem);
            showDropdown = true;
        }
    } else {
        const filtered = allInstitutions.filter(inst =>
            inst.displayName.toLowerCase().includes(searchTerm)
        );

        if (filtered.length === 0) {
            const noResultsItem = document.createElement('div');
            // Added Tailwind classes for styling
            noResultsItem.className = 'college-list-item px-4 py-2 text-sm text-gray-500 dark:text-gray-400';
            noResultsItem.textContent = 'No colleges match your search.';
            collegeListDropdownElement.appendChild(noResultsItem);
            showDropdown = true;
        } else {
            filtered.forEach(inst => {
                const item = document.createElement('div');
                // Added Tailwind classes for styling, hover effect, and cursor
                item.className = 'college-list-item px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer';
                item.textContent = inst.displayName;
                item.dataset.id = inst.id;
                item.dataset.code = inst.code;
                item.addEventListener('click', () => {
                    selectCollegeCallback(inst.id, inst.displayName, inst.code);
                });
                collegeListDropdownElement.appendChild(item);
            });
            showDropdown = true;
        }
    }
    collegeListDropdownElement.classList.toggle('hidden', !showDropdown);
}

/**
 * Filters and displays courses in the dropdown based on search term.
 */
export function updateCourseDropdownUI(searchTerm, allCourses, courseInputElement, courseDropdownElement, selectCourseCallback) {
    courseDropdownElement.innerHTML = '';
    let showDropdown = false;

    if (!searchTerm) {
        if (document.activeElement === courseInputElement && allCourses.length > 0) {
            const prompt = document.createElement('div');
            prompt.className = 'px-4 py-2 text-sm text-gray-500 dark:text-gray-400';
            prompt.textContent = 'Type to filter courses...';
            courseDropdownElement.appendChild(prompt);
            showDropdown = true;
        }
    } else {
        const term = searchTerm.toLowerCase();
        const filtered = allCourses.filter(c =>
            c.code.toLowerCase().includes(term) ||
            (c.title && c.title.toLowerCase().includes(term))
        ).slice(0, 50);

        if (filtered.length === 0) {
            const none = document.createElement('div');
            none.className = 'px-4 py-2 text-sm text-gray-500 dark:text-gray-400';
            none.textContent = 'No courses match your search.';
            courseDropdownElement.appendChild(none);
        } else {
            filtered.forEach(course => {
                const item = document.createElement('div');
                item.className = 'px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer';
                item.textContent = course.title ? `${course.code} — ${course.title}` : course.code;
                item.addEventListener('click', () => selectCourseCallback(course.code));
                courseDropdownElement.appendChild(item);
            });
        }
        showDropdown = true;
    }
    courseDropdownElement.classList.toggle('hidden', !showDropdown);
}

/**
 * Handles the UI updates when a college is selected.
 * @param {string} name - The name of the selected college.
 * @param {HTMLElement} collegeSearchInputElement - The college search input element.
 * @param {HTMLElement} collegeListDropdownElement - The dropdown element.
 * @param {HTMLElement} classInputContainerElement - The container for class input.
 * @param {HTMLElement} classNameInputElement - The class name input element.
 */
export function updateUIOnCollegeSelect(name, collegeSearchInputElement, collegeListDropdownElement, classInputContainerElement, classNameInputElement) {
    collegeSearchInputElement.value = name;
    collegeListDropdownElement.classList.add('hidden');
    classInputContainerElement.classList.remove('hidden');
    classNameInputElement.value = '';
    classNameInputElement.focus();
}
