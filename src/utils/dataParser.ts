import * as XLSX from 'xlsx';
import { format, parse } from 'date-fns';

export interface DataSummary {
  ytd: number;
  forecast: number;
  budget: number;
}

export interface TrendData {
  month: string;
  경유_YTD: number;
  윤활유_YTD: number;
  요소수_YTD: number;
  경유_FC: number;
  윤활유_FC: number;
  요소수_FC: number;
}

export interface ItemDetail {
  id: string;
  category: string;
  name: string;
  expectedQty: number;
  deliveredQty: number;
  remainingQty: number;
  base: number;
  current: number;
  ytdCost: number;
  forecastCost: number;
}

export interface DeliveryRecord {
  id: string;
  date: string;
  category: string;
  item: string;
  vendor: string;
  qty: number;
  unitBase: number;
  unitActual: number;
  total: number;
  penalty: number;
}

export const trendMultipliers = {
  경유:   [145.5, 146, 146.5, 147, 147.5, 148, 148.5, 149],
  윤활유: [104, 106, 108, 109, 110, 110, 112, 114],
  요소수: [110, 115, 121, 126, 137, 148, 159, 165]
};

export interface DashboardData {
  impactDataSummary: Record<string, DataSummary>;
  monthlyTrendData: TrendData[];
  itemDetails: ItemDetail[];
  deliveryHistory: DeliveryRecord[];
}

export const loadData = async (): Promise<DashboardData> => {
  const response = await fetch('/전쟁임팩트.xlsx');
  const arrayBuffer = await response.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });

  const impactSheet = workbook.Sheets['impact'];
  const dieselSheet = workbook.Sheets['경유 납품기록'];
  const lubeSheet = workbook.Sheets['윤활유 납품기록'];
  const ureaSheet = workbook.Sheets['요소수 납품기록'];

  const impactData = XLSX.utils.sheet_to_json<any>(impactSheet);
  const dieselData = XLSX.utils.sheet_to_json<any>(dieselSheet);
  const lubeData = XLSX.utils.sheet_to_json<any>(lubeSheet);
  const ureaData = XLSX.utils.sheet_to_json<any>(ureaSheet);

  // Filter out 초저황경유(3월)
  const filteredImpactData = impactData.filter(row => row['품명'] !== '초저황경유(3월)');

  // Initialize monthly FC sums
  const categoryMonthlyFc: Record<string, number[]> = {
    경유: Array(8).fill(0),
    윤활유: Array(8).fill(0),
    요소수: Array(8).fill(0)
  };

  // 1. itemDetails
  const itemDetails: ItemDetail[] = filteredImpactData.map((row, i) => {
    let name = row['품명'] || '';
    if (name === '초저황경유(4월)') name = '초저황경유';
    
    const category = row['구분'] || '';
    const expectedQty = row['예상수량'] || 0;
    const deliveredQty = row['납품수량'] || 0;
    const remainingQty = row['잔여수량'] || 0;
    const base = row['기준단가'] || 0;
    const current = row['현재impact단가'] || 0;
    const ytdCost = row['현재impact비용'] || 0;
    
    // Calculate forecast dynamically based on index model
    let forecastCost = 0;
    const multipliers = trendMultipliers[category as keyof typeof trendMultipliers] || Array(8).fill(100);
    const monthlyQty = remainingQty / 8;
    
    multipliers.forEach((idx, mIdx) => {
      const impactPrice = base * (idx / 100);
      if (impactPrice > base) {
        const extraCost = (impactPrice - base) * monthlyQty;
        forecastCost += extraCost;
        if (categoryMonthlyFc[category]) {
          categoryMonthlyFc[category][mIdx] += extraCost;
        }
      }
    });

    return {
      id: `item-${i}`,
      category,
      name,
      expectedQty,
      deliveredQty,
      remainingQty,
      base,
      current,
      ytdCost,
      forecastCost,
    };
  });

  // 2. impactDataSummary
  const impactDataSummary: Record<string, DataSummary> = {
    전체: { ytd: 0, forecast: 0, budget: 0 },
    경유: { ytd: 0, forecast: 0, budget: 0 },
    윤활유: { ytd: 0, forecast: 0, budget: 0 },
    요소수: { ytd: 0, forecast: 0, budget: 0 },
  };

  itemDetails.forEach(item => {
    const itemBudget = item.expectedQty * item.base;
    if (impactDataSummary[item.category]) {
      impactDataSummary[item.category].ytd += item.ytdCost;
      impactDataSummary[item.category].forecast += item.forecastCost;
      impactDataSummary[item.category].budget += itemBudget;
    }
    impactDataSummary['전체'].ytd += item.ytdCost;
    impactDataSummary['전체'].forecast += item.forecastCost;
    impactDataSummary['전체'].budget += itemBudget;
  });

  // 3. deliveryHistory
  const deliveryHistory: DeliveryRecord[] = [];

  const parseDate = (val: any) => {
    if (!val) return '';
    if (val instanceof Date) return format(val, 'yyyy-MM-dd');
    if (typeof val === 'number') {
        return format(XLSX.SSF.parse_date_code(val), 'yyyy-MM-dd');
    }
    let strVal = String(val).trim();
    const dotMatch = strVal.match(/^(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\.?$/);
    if (dotMatch) {
      const y = dotMatch[1];
      const m = dotMatch[2].padStart(2, '0');
      const d = dotMatch[3].padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    return strVal;
  };

  dieselData.filter(d => d['입고량(L)'] && d['입고단가']).forEach((row, i) => {
    const qty = row['입고량(L)'] || 0;
    const unitBase = 1352; // 기준단가 하드코딩 또는 계산
    const unitActual = row['입고단가'] || 0;
    const penalty = qty * (unitActual - unitBase);
    
    deliveryHistory.push({
      id: `DSL-${i}`,
      date: parseDate(row['일자']),
      category: '경유',
      item: '초저황경유',
      vendor: '정유사(SK/GS/SOIL)',
      qty: qty,
      unitBase,
      unitActual,
      total: row['입고금액'] || 0,
      penalty: penalty > 0 ? penalty : 0,
    });
  });

  const processRecords = (data: any[], cat: string) => {
    data.forEach(row => {
      deliveryHistory.push({
        id: row['구매번호'] || row['Unique ID'] || '',
        date: parseDate(row['입고일']),
        category: cat,
        item: row['품목명'] || '',
        vendor: row['업체'] || '',
        qty: row['수량'] || 0,
        unitBase: row['기준단가'] || 0,
        unitActual: row['단가'] || row['변환단가'] || 0,
        total: row['계'] || 0,
        penalty: row['추가금액'] || 0,
      });
    });
  };

  processRecords(lubeData, '윤활유');
  processRecords(ureaData, '요소수');

  // Sort by date descending
  deliveryHistory.sort((a, b) => b.date.localeCompare(a.date));

  // 4. monthlyTrendData
  const months = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
  const monthlyTrendData: TrendData[] = months.map(m => ({
    month: m,
    경유_YTD: 0, 윤활유_YTD: 0, 요소수_YTD: 0,
    경유_FC: 0, 윤활유_FC: 0, 요소수_FC: 0
  }));

  // Distribute YTD from deliveryHistory
  deliveryHistory.forEach(record => {
    if(!record.date) return;
    const monthMatch = record.date.match(/-(\d{2})-/);
    if (monthMatch) {
      const monthIdx = parseInt(monthMatch[1], 10) - 1;
      if (monthIdx >= 0 && monthIdx <= 3) {
        const key = `${record.category}_YTD` as keyof TrendData;
        (monthlyTrendData[monthIdx] as any)[key] += (record.penalty / 1000000); // 100만 단위
      }
    }
  });

  // 5. Apply predictive trend modeling to the forecast (using exact computed extraCosts)
  ['경유', '윤활유', '요소수'].forEach(cat => {
    for (let i = 0; i < 8; i++) {
      const monthIdx = i + 4; // 4 is 5월
      const key = `${cat}_FC` as keyof TrendData;
      (monthlyTrendData[monthIdx] as any)[key] = categoryMonthlyFc[cat][i] / 1000000;
    }
  });

  return {
    impactDataSummary,
    monthlyTrendData,
    itemDetails,
    deliveryHistory
  };
};
