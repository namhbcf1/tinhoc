import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import BirthPlaceField from '../../src/components/forms/BirthPlaceField';

describe('BirthPlaceField', () => {
  it('shows domestic province select by default', () => {
    render(<BirthPlaceField value="" onChange={vi.fn()} label="Nơi sinh" />);

    expect(screen.getByText('Nơi sinh')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Trong nước/i })).toBeChecked();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('switches to free-text input for foreign birth places', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(<BirthPlaceField value="" onChange={handleChange} label="Nơi sinh" />);

    await user.click(screen.getByRole('radio', { name: /Nước ngoài/i }));

    expect(screen.getByRole('textbox')).toBeInTheDocument();

    await user.type(screen.getByRole('textbox'), 'Nhat Ban');

    expect(handleChange).toHaveBeenCalled();
  });

  it('keeps foreign mode active while the free-text value starts empty', async () => {
    const user = userEvent.setup();

    function ControlledBirthPlaceField() {
      const [value, setValue] = useState('Hà Nội');
      return <BirthPlaceField value={value} onChange={setValue} label="Nơi sinh" />;
    }

    render(<ControlledBirthPlaceField />);

    await user.click(screen.getByRole('radio', { name: /Nước ngoài/i }));

    const foreignInput = screen.getByRole('textbox');
    expect(foreignInput).toBeInTheDocument();

    await user.type(foreignInput, 'Seoul');

    expect(screen.getByRole('textbox')).toHaveValue('Seoul');
  });

  it('normalizes old province names to the merged province name', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(<BirthPlaceField value="Hải Dương" onChange={handleChange} label="Nơi sinh" />);

    expect(handleChange).toHaveBeenCalledWith('Hải Phòng');

    const select = screen.getByRole('combobox');
    await user.selectOptions(select, 'Hà Nội');

    expect(handleChange).toHaveBeenLastCalledWith('Hà Nội');
  });
});
