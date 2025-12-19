import { FamilyMember } from '../types';

export const exportToGedcomString = (members: FamilyMember[]): string => {
  let ged = '0 HEAD\n1 CHAR UTF-8\n1 SOUR FamilyConnect\n2 VERS 4.0\n';
  members.forEach(m => {
    ged += `0 @I${m.id}@ INDI\n1 NAME ${m.name}\n1 BIRT\n2 DATE ${m.birthDate || ''}\n2 PLAC ${m.location || ''}\n`;
    (m.occupations || []).forEach(occ => { ged += `1 OCCU ${occ}\n`; });
    if ((m as any).parentId) ged += `1 FAMC @F${(m as any).parentId}@\n`;
  });
  ged += '0 TRLR';
  return ged;
};