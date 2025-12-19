import { exportToGedcomString } from '../utils/gedcom';

describe('exportToGedcomString', () => {
  it('generates GEDCOM for simple members', () => {
    const members = [{ id: '1', name: 'Alice', birthDate: '1900', location: 'London', occupations: ['Farmer'], parentId: undefined }];
    const ged = exportToGedcomString(members as any);
    expect(ged).toContain('0 @I1@ INDI');
    expect(ged).toContain('1 NAME Alice');
  });
});
