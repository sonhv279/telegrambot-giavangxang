import { describe, expect, it } from 'vitest';
import { parseFuelTable } from './fuelParser.js';
import { parseGoldTable } from './goldParser.js';

describe('parsers', () => {
  it('parses gold bar and gold ring rows', () => {
    const html = `
      <table>
        <tr><td>SJC 1 lượng</td><td>84.800.000</td><td>86.800.000</td></tr>
        <tr><td>Nhẫn 9999</td><td>83.900.000</td><td>85.200.000</td></tr>
      </table>
    `;
    const snapshots = parseGoldTable(html, 'test', '2026-06-15T00:00:00.000Z');
    expect(snapshots).toHaveLength(2);
    expect(snapshots[0].category).toBe('gold_bar');
    expect(snapshots[1].category).toBe('gold_ring');
    expect(snapshots[0].buyPrice).toBe(84_800_000);
  });

  it('parses fuel region 1 and region 2 columns including RON95 variants', () => {
    const html = `
      <table>
        <tr><td>RON95-III</td><td>20.090</td><td>20.490</td></tr>
        <tr><td>RON95-IV</td><td>20.230</td><td>20.630</td></tr>
        <tr><td>RON95-V</td><td>20.420</td><td>20.820</td></tr>
      </table>
    `;
    const snapshots = parseFuelTable(html, 'test', '2026-06-15T00:00:00.000Z', '2026-06-12T08:00:00.000Z', 'period');
    expect(snapshots).toHaveLength(6);
    expect(snapshots.filter((item) => item.productGroup === 'RON95')).toHaveLength(6);
    expect(snapshots.find((item) => item.productName === 'RON95-V' && item.region === 'region_2')?.sellPrice).toBe(20_820);
  });
});
