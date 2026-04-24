const { getWeekOfMonth, cleanLink } = require('../utils');

describe('utils.js', () => {
    describe('getWeekOfMonth', () => {
        it('should return Week 1 for the 1st of the month', () => {
            const date = new Date('2026-04-01T12:00:00Z');
            expect(getWeekOfMonth(date)).toBe(1);
        });

        it('should return Week 2 for the 8th of the month', () => {
            const date = new Date('2026-04-08T12:00:00Z');
            expect(getWeekOfMonth(date)).toBe(2);
        });

        it('should return Week 4 for dates on or after the 22nd', () => {
            const date22 = new Date('2026-04-22T12:00:00Z');
            const date31 = new Date('2026-04-30T12:00:00Z');
            expect(getWeekOfMonth(date22)).toBe(4);
            expect(getWeekOfMonth(date31)).toBe(4);
        });
    });

    describe('cleanLink', () => {
        it('should remove query parameters starting with ?', () => {
            const url = 'https://www.amazon.com/dp/B08F2R5PD4?ref_=ast_sto_dp';
            expect(cleanLink(url)).toBe('https://www.amazon.com/dp/B08F2R5PD4');
        });

        it('should remove path segments starting with /ref=', () => {
            const url = 'https://www.amazon.com/dp/B08F2R5PD4/ref=sr_1_1?dchild=1';
            expect(cleanLink(url)).toBe('https://www.amazon.com/dp/B08F2R5PD4');
        });

        it('should return the original link if it is already clean', () => {
            const url = 'https://www.amazon.com/dp/B08F2R5PD4';
            expect(cleanLink(url)).toBe(url);
        });
    });
});
