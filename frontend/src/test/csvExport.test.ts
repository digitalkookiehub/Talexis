import { describe, it, expect, vi } from 'vitest';
import { downloadCsv } from '../utils/csvExport';

describe('downloadCsv', () => {
  it('creates correct CSV content', () => {
    const createObjectURL = vi.fn(() => 'blob:url');
    const revokeObjectURL = vi.fn();
    const click = vi.fn();

    global.URL.createObjectURL = createObjectURL;
    global.URL.revokeObjectURL = revokeObjectURL;

    const origCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'a') {
        const el = origCreateElement('a');
        el.click = click;
        return el;
      }
      return origCreateElement(tag);
    });

    downloadCsv('test.csv', ['Name', 'Score'], [['Alice', '8.5'], ['Bob', '7.0']]);

    expect(createObjectURL).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalled();
  });

  it('handles special characters in CSV', () => {
    const createObjectURL = vi.fn(() => 'blob:url');
    global.URL.createObjectURL = createObjectURL;
    global.URL.revokeObjectURL = vi.fn();
    vi.spyOn(document, 'createElement').mockReturnValue({ click: vi.fn(), set href(_: string) {}, set download(_: string) {} } as unknown as HTMLElement);

    // Should not throw with quotes and commas
    downloadCsv('test.csv', ['Name'], [['O\'Brien, "Jr"']]);
    expect(createObjectURL).toHaveBeenCalled();
  });
});
