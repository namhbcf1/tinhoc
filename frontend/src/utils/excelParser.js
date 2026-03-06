import * as XLSX from 'xlsx';

// ============================================
// EXCEL PARSER FOR VSTEP EXAMS
// ============================================

export const generateVStepTemplate = () => {
    // Create a workbook with instructions and sample data
    const wb = XLSX.utils.book_new();

    // Sheet 1: Exam Info
    const wsInfo = XLSX.utils.aoa_to_sheet([
        ['Title', 'Description', 'Level', 'Duration (Minutes)', 'Code'],
        ['Bài thi VSTEP B1', 'Bài thi mẫu chuẩn B1', 'B1', 180, 'VSTEP-SAMPLE-01']
    ]);
    XLSX.utils.book_append_sheet(wb, wsInfo, "Exam Info");

    // Sheet 2: Sections & Questions
    // Format: Section | Part/Group Text | Audio/Image File | Question | Type | Option A | Option B | Option C | Option D | Answer | Points | Settings (JSON)
    const wsQuestions = XLSX.utils.aoa_to_sheet([
        ['Section', 'Group Title', 'Group Text/Passage', 'Media File', 'Question', 'Type', 'Option A', 'Option B', 'Option C', 'Option D', 'Correct Answer', 'Points', 'Settings'],
        ['LISTENING', 'Part 1', '', 'audio_part1.mp3', 'What is the topic?', 'MULTIPLE_CHOICE', 'Weather', 'Traffic', 'Food', 'Sports', 'A', 1, ''],
        ['READING', 'Passage 1', '<p>This is a long reading passage...</p>', '', 'What is the main idea?', 'MULTIPLE_CHOICE', 'Idea A', 'Idea B', 'Idea C', 'Idea D', 'B', 1, ''],
        ['WRITING', 'Task 1', '', '', 'Write a letter to your friend...', 'ESSAY', '', '', '', '', '', 10, ''],
        ['SPEAKING', 'Part 1', '', '', 'Introduction', 'RECORDING', '', '', '', '', '', 5, '{"prep_seconds": 60, "speak_seconds": 180}']
    ]);
    XLSX.utils.book_append_sheet(wb, wsQuestions, "Questions");

    XLSX.writeFile(wb, "VSTEP_Exam_Template.xlsx");
};

export const parseVStepExcel = async (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });

                // 1. Parse Exam Info
                const infoSheet = workbook.Sheets["Exam Info"] || workbook.Sheets[workbook.SheetNames[0]];
                const infoRows = XLSX.utils.sheet_to_json(infoSheet);

                if (!infoRows || infoRows.length === 0) throw new Error("Missing Exam Info sheet or data");
                const examInfo = infoRows[0]; // First row data

                // 2. Parse Questions
                const qSheet = workbook.Sheets["Questions"] || workbook.Sheets[workbook.SheetNames[1]];
                const qRows = XLSX.utils.sheet_to_json(qSheet);

                // Transform flat rows into Nested Structure: Sections -> Groups -> Questions
                const sectionsMap = {}; // Key: Section Type

                qRows.forEach(row => {
                    const secType = (row['Section'] || 'LISTENING').toUpperCase().trim();

                    if (!sectionsMap[secType]) {
                        sectionsMap[secType] = {
                            type: secType,
                            title: secType, // Default title
                            order_index: Object.keys(sectionsMap).length,
                            groups: [],
                            standalone_questions: [] // Temporary holding
                        };
                    }

                    // Identify Group (by Title or Text)
                    const groupTitle = row['Group Title'];
                    const groupText = row['Group Text/Passage'];
                    const mediaFile = row['Media File'];

                    let group = null;
                    if (groupTitle || groupText || mediaFile) {
                        // Find existing group or create new
                        group = sectionsMap[secType].groups.find(g => g.title === groupTitle && g.text_content === groupText);
                        if (!group) {
                            group = {
                                title: groupTitle || `Group ${sectionsMap[secType].groups.length + 1}`,
                                text_content: groupText,
                                audio_url: null, // Will be mapped later via filename
                                image_url: null,
                                temp_media_filename: mediaFile, // Store for UI mapping
                                questions: [],
                                order_index: sectionsMap[secType].groups.length
                            };
                            sectionsMap[secType].groups.push(group);
                        }
                    }

                    // Create Question
                    const question = {
                        content: row['Question'] || 'Empty Question',
                        type: (row['Type'] || 'MULTIPLE_CHOICE').toUpperCase(),
                        options: [
                            row['Option A'], row['Option B'], row['Option C'], row['Option D']
                        ].filter(o => o !== undefined && o !== null && String(o).trim() !== ''),
                        correct_answer: row['Correct Answer'],
                        points: parseFloat(row['Points'] || 1),
                        settings: row['Settings'] ? JSON.parse(row['Settings']) : {},
                        order_index: group ? group.questions.length : sectionsMap[secType].standalone_questions.length
                    };

                    if (group) {
                        group.questions.push(question);
                    } else {
                        sectionsMap[secType].standalone_questions.push(question);
                    }
                });

                // Final Assembly
                const sections = Object.values(sectionsMap);
                sections.forEach(sec => {
                    // Merge standalone into a default group or handle separate? 
                    // Backend supports standalone, so we keep logical separation or create a "Misc" group?
                    // Implementation Plan said: Backend supports standalone.
                    // But `vstep-queries.js` handles `standalone_questions` input!
                    // So we are good.
                });

                resolve({
                    exam: {
                        title: examInfo['Title'] || 'Untitled Exam',
                        description: examInfo['Description'],
                        level: examInfo['Level'] || 'B1',
                        code: examInfo['Code'] || `AUTO-${Date.now()}`,
                        duration: parseInt(examInfo['Duration (Minutes)'] || 180),
                        created_by: null // Set by backend
                    },
                    sections: sections
                });

            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = (error) => reject(error);
        reader.readAsArrayBuffer(file);
    });
};
