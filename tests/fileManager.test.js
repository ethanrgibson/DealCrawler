const fs = require('fs');
const path = require('path');
const { getValidBrands, loadWeeklyTracker, saveWeeklyTracker } = require('../fileManager');

jest.mock('fs');

describe('fileManager.js', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('getValidBrands', () => {
        it('should return an array of non-empty strings excluding the header', () => {
            const mockContent = `These brands have proven successful:
            
            BrandA
            BrandB
            
            BrandC`;
            
            fs.existsSync.mockReturnValue(true);
            fs.readFileSync.mockReturnValue(mockContent);

            const brands = getValidBrands('fakePath.txt');
            expect(brands).toEqual(['BrandA', 'BrandB', 'BrandC']);
        });

        it('should throw an error if the file does not exist', () => {
            fs.existsSync.mockReturnValue(false);
            expect(() => getValidBrands('missing.txt')).toThrow('Could not find master list');
        });
    });

    describe('Weekly Tracker', () => {
        const mockTrackingPath = 'Deals/Week 4/weekly_searched.json';
        const mockWeekKey = '2026-4-W4';

        it('loadWeeklyTracker should return an empty array if file does not exist', () => {
            fs.existsSync.mockReturnValue(false);
            expect(loadWeeklyTracker(mockTrackingPath, mockWeekKey)).toEqual([]);
        });

        it('loadWeeklyTracker should return searched brands if weekKey matches', () => {
            fs.existsSync.mockReturnValue(true);
            fs.readFileSync.mockReturnValue(JSON.stringify({
                weekKey: mockWeekKey,
                searched: ['Yeti', 'Stanley']
            }));

            expect(loadWeeklyTracker(mockTrackingPath, mockWeekKey)).toEqual(['Yeti', 'Stanley']);
        });

        it('loadWeeklyTracker should return empty array if weekKey does NOT match (new week)', () => {
            fs.existsSync.mockReturnValue(true);
            fs.readFileSync.mockReturnValue(JSON.stringify({
                weekKey: '2026-4-W3', // Old week
                searched: ['Yeti', 'Stanley']
            }));

            expect(loadWeeklyTracker(mockTrackingPath, mockWeekKey)).toEqual([]);
        });

        it('saveWeeklyTracker should correctly write JSON file', () => {
            saveWeeklyTracker(mockTrackingPath, mockWeekKey, ['Patagonia']);
            expect(fs.writeFileSync).toHaveBeenCalledWith(
                mockTrackingPath,
                JSON.stringify({ weekKey: mockWeekKey, searched: ['Patagonia'] }, null, 2),
                'utf8'
            );
        });
    });
});
