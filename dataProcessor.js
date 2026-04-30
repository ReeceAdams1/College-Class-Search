/**
 * Extracts the subject prefix from a class name string (e.g., "ENGL" from "ENGL 101").
 * @param {string} className - The full class name.
 * @returns {string|null} The extracted subject prefix or null.
 */
export function extractSubjectPrefix(className) {
    if (!className || typeof className !== 'string') return null;
    
    const words = className.trim().split(/\s+/); // Corrected regex
    const prefixParts = [];
    for (const word of words) {
        if (/^\d+[a-zA-Z]*$/.test(word) || /^\d+$/.test(word)) { // Corrected regexes
            break; 
        }
        if (/^[a-zA-Z]+$/.test(word)) { 
            prefixParts.push(word.toUpperCase());
        } else { 
            break; 
        }
    }
    return prefixParts.length > 0 ? prefixParts.join(' ') : null;
}

/**
 * Extracts the subject and number part from a class name string.
 * e.g., "MATH C151" from "MATH C151 with lab"
 * @param {string} className - The full class name.
 * @returns {string} The extracted subject and number or the original trimmed string.
 */
export function extractSubjectAndNumber(className) {
    // Match pattern: subject(s) + optional letter(s) + number(s), e.g., "MATH C151"
    const match = className.match(/^([A-Za-z]+(?:\\s+[A-Za-z]+)*\\s*\\d+[A-Za-z]*)/);
    return match ? match[1].trim() : className.trim();
}

/**
 * Helper function to process the sendingArticulation part of an agreement.
 * @param {object} sendingArticulation - The sendingArticulation object from the API.
 * @returns {{articulationOptionStrings: Array<string>, topLevelConjunction: string|null}}
 */
function getSendingCourseOptions(sendingArticulation) {
    let articulationOptionStrings = [];
    let topLevelConjunction = null;

    if (sendingArticulation && sendingArticulation.items && sendingArticulation.items.length > 0) {
        // Determine the top-level conjunction that joins the 'articulationOptionStrings'
        if (sendingArticulation.courseGroupConjunctions && sendingArticulation.courseGroupConjunctions.length > 0 && sendingArticulation.courseGroupConjunctions[0].groupConjunction) {
            topLevelConjunction = sendingArticulation.courseGroupConjunctions[0].groupConjunction.toLowerCase();
            // console.log('[Debug Conjunction Helper] topLevelConjunction set from courseGroupConjunctions:', topLevelConjunction);
        } else if (sendingArticulation.items.length > 1 && sendingArticulation.courseConjunction) {
            topLevelConjunction = sendingArticulation.courseConjunction.toLowerCase();
            // console.log('[Debug Conjunction Helper] topLevelConjunction set from sendingArticulation.courseConjunction:', topLevelConjunction);
        } else {
            // console.log('[Debug Conjunction Helper] topLevelConjunction not set by primary conditions, remains:', topLevelConjunction);
        }
        
        sendingArticulation.items.forEach(itemGroup => {
            if (itemGroup.type === "CourseGroup" && itemGroup.items && itemGroup.items.length > 0) {
                const groupConjunction = itemGroup.courseConjunction ? itemGroup.courseConjunction.toLowerCase() : 'and';
                const coursesInThisGroupStrings = itemGroup.items
                    .filter(courseItem => courseItem.type === "Course")
                    .map(courseItem => `${courseItem.prefix || "N/A"} ${courseItem.courseNumber || "N/A"}`);
                if (coursesInThisGroupStrings.length > 0) {
                    articulationOptionStrings.push(coursesInThisGroupStrings.length > 1 ? coursesInThisGroupStrings.join(` %%${groupConjunction.toUpperCase()}%% `) : coursesInThisGroupStrings[0]);
                }
            } else if (itemGroup.type === "Course") {
                articulationOptionStrings.push(`${itemGroup.prefix || "N/A"} ${itemGroup.courseNumber || "N/A"}`);
            }
        });
    }
    return { articulationOptionStrings, topLevelConjunction };
}

/**
 * Returns all articulations for a given subject prefix (department search).
 * @param {Array} articulationsDataParsed - Parsed articulation JSON.
 * @param {string} subjectPrefix - Department code (e.g., "MATH").
 * @returns {Array<{receivingCourseLabel: string, articulationOptionStrings: Array<string>, topLevelConjunction: string|null}>}
 */
export function processAllArticulationsForSubject(articulationsDataParsed, subjectPrefix) {
    const results = [];
    for (const articulation of articulationsDataParsed) {
        let receivingCourseLabel = null;
        let currentSendingArticulation = null;

        if (articulation.type === 'Course' && articulation.course) {
            const c = articulation.course;
            if (c.prefix && c.prefix.toUpperCase() === subjectPrefix.toUpperCase()) {
                receivingCourseLabel = `${c.prefix} ${c.courseNumber}`;
                currentSendingArticulation = articulation.sendingArticulation;
            }
        } else if (articulation.type === 'Series' && articulation.series) {
            const seriesCourses = articulation.series.courses || [];
            const hasMatch = seriesCourses.some(c => c.prefix && c.prefix.toUpperCase() === subjectPrefix.toUpperCase());
            if (hasMatch) {
                receivingCourseLabel = articulation.series.name ||
                    seriesCourses.map(c => `${c.prefix} ${c.courseNumber}`).join(' & ');
                currentSendingArticulation = articulation.sendingArticulation;
            }
        }

        if (currentSendingArticulation) {
            const { articulationOptionStrings, topLevelConjunction } = getSendingCourseOptions(currentSendingArticulation);
            if (articulationOptionStrings.length > 0) {
                results.push({ receivingCourseLabel, articulationOptionStrings, topLevelConjunction });
            }
        }
    }
    return results;
}

/**
 * Processes raw articulation data to extract formatted strings and conjunction.
 * @param {Array} articulationsDataParsed - Parsed articulation JSON.
 * @param {string} inputSubjectPrefix - The derived subject prefix from user input (e.g., "BIOLOGY").
 * @param {string} inputRawClassName - The raw class name from user input (e.g., "BIOLOGY 1A and 1AL" or "ECON 1").
 * @returns {{articulationOptionStrings: Array<string>, topLevelConjunction: string|null, matchingArticulationFound: boolean}}
 */
export function processArticulationData(articulationsDataParsed, inputSubjectPrefix, inputRawClassName) {
    let finalArticulationOptionStrings = [];
    let finalTopLevelConjunction = null;
    let matchingArticulationFound = false;

    const normalizedUserInput = inputRawClassName.toUpperCase()
        .replace(/\bAND\b/g, ' ')
        .replace(/,/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    const firstCoursePartFromInput = extractSubjectAndNumber(inputRawClassName);
    const targetCourseNumberForSingleMatch = firstCoursePartFromInput
        .replace(new RegExp(`^${inputSubjectPrefix.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}\\s*`, 'i'), '')
        .trim();

    // console.log(`[Debug] processArticulationData: User Input='${inputRawClassName}', Normalized User Input for Series='${normalizedUserInput}'`);
    // console.log(`[Debug] For Single Course Match: SubjectPrefix='${inputSubjectPrefix}', TargetNumber='${targetCourseNumberForSingleMatch}'`);

    for (const articulation of articulationsDataParsed) {
        let currentSendingArticulation = null;
        let matchedByType = null; // To know how we matched

        if (articulation.type === "Series" && articulation.series && articulation.series.name) {
            const normalizedApiSeriesName = articulation.series.name.toUpperCase()
                .replace(/\bAND\b/g, ' ')
                .replace(/,/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
            // console.log(`[Debug] Checking Series: API Series Name='${articulation.series.name}', Normalized='${normalizedApiSeriesName}'`);

            // Scenario 1: User typed the full series name
            if (normalizedApiSeriesName === normalizedUserInput) {
                // console.log(`[Debug] Matched Series by full name: '${normalizedApiSeriesName}'`);
                matchedByType = "SeriesFullName";
                currentSendingArticulation = articulation.sendingArticulation;
            } else {
                // Scenario 2: User typed a single course that is part of this API series
                if (articulation.series.courses && articulation.series.courses.length > 0) {
                    const userCourseIsPartOfApiSeries = articulation.series.courses.some(courseInSeries => 
                        courseInSeries.prefix && courseInSeries.courseNumber &&
                        courseInSeries.prefix.toUpperCase() === inputSubjectPrefix.toUpperCase() &&
                        courseInSeries.courseNumber.toUpperCase() === targetCourseNumberForSingleMatch.toUpperCase()
                    );
                    if (userCourseIsPartOfApiSeries) {
                        // console.log(`[Debug] Matched Series because user's single course (${inputSubjectPrefix} ${targetCourseNumberForSingleMatch}) is in API Series '${normalizedApiSeriesName}'`);
                        matchedByType = "SeriesPartialMatch";
                        currentSendingArticulation = articulation.sendingArticulation;
                    }
                }
            }
        } else if (articulation.type === "Course" && articulation.course) {
            const apiCourse = articulation.course;
            // console.log(`[Debug] Checking Course: API Course='${apiCourse.prefix} ${apiCourse.courseNumber}'`);
            if (apiCourse.prefix && apiCourse.courseNumber &&
                apiCourse.prefix.toUpperCase() === inputSubjectPrefix.toUpperCase() &&
                apiCourse.courseNumber.toUpperCase() === targetCourseNumberForSingleMatch.toUpperCase()) {
                
                // console.log(`[Debug] Matched Course: '${apiCourse.prefix} ${apiCourse.courseNumber}'`);
                matchedByType = "SingleCourse";
                currentSendingArticulation = articulation.sendingArticulation;
            }
        }

        if (currentSendingArticulation) { // If any match occurred
            matchingArticulationFound = true;
            // console.log(`[Debug] Match success! Type: ${matchedByType}, User Input: '${inputRawClassName}'. Processing sending articulation.`);
            const result = getSendingCourseOptions(currentSendingArticulation);
            finalArticulationOptionStrings = result.articulationOptionStrings;
            finalTopLevelConjunction = result.topLevelConjunction;
            break; 
        }
    }

    if (!matchingArticulationFound) {
        // console.log(`[Debug] No match found in this agreement for user input '${inputRawClassName}' (subject: '${inputSubjectPrefix}')`);
    }
    return { articulationOptionStrings: finalArticulationOptionStrings, topLevelConjunction: finalTopLevelConjunction, matchingArticulationFound };
}
