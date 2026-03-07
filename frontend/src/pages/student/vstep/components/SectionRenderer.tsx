import React from 'react';
import ReadingSection from './ReadingSection';
import ListeningSection from './ListeningSection';
import WritingSection from './WritingSection';
import SpeakingSection from './SpeakingSection';

const SectionRenderer = ({ section, answers, onAnswerChange }) => {
    switch (section.type) {
        case 'READING':
            return <ReadingSection section={section} answers={answers} onAnswerChange={onAnswerChange} />;
        case 'LISTENING':
            return <ListeningSection section={section} answers={answers} onAnswerChange={onAnswerChange} />;
        case 'WRITING':
            return <WritingSection section={section} answers={answers} onAnswerChange={onAnswerChange} />;
        case 'SPEAKING':
            return <SpeakingSection section={section} answers={answers} onAnswerChange={onAnswerChange} />;
        default:
            return <div>Unknown Section Type: {section.type}</div>;
    }
};

export default SectionRenderer;
