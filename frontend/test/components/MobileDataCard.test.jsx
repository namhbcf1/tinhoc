import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MobileDataCard from '../../src/components/admin/MobileDataCard';

describe('MobileDataCard Component', () => {
    it('renders data correctly when props provided', () => {
        const mockData = { id: 1, title: 'Total Revenue', value: '45.000.000 VND' };
        render(<MobileDataCard data={mockData} />);
        
        expect(screen.getByText('Total Revenue')).toBeInTheDocument();
        expect(screen.getByText('45.000.000 VND')).toBeInTheDocument();
    });
});
