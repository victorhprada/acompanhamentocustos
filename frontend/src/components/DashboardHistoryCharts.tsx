import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export type HistoryPoint = {
  mes_ano: string;
  total_vidas_cobradas: number;
  total_valor_vidas: number;
  total_custo_por_cliente: number;
  total_faturamento: number;
};

const MONTH_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function monthLabel(mesAno: string) {
  const month = parseInt(mesAno.slice(5, 7), 10);
  return MONTH_SHORT[month - 1] || mesAno;
}

/** Só meses já decorridos (inclui o mês atual). Futuro fica de fora — valores são propagados e distorcem o gráfico. */
function filterUpToCurrentMonth(year: number, series: HistoryPoint[]): HistoryPoint[] {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1–12

  if (year > currentYear) return [];
  if (year < currentYear) return series;

  return series.filter((p) => {
    const month = parseInt(p.mes_ano.slice(5, 7), 10);
    return month <= currentMonth;
  });
}

function formatMoney(val: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
}

function formatNumber(val: number) {
  return new Intl.NumberFormat('pt-BR').format(val || 0);
}

type ChartDef = {
  key: keyof Omit<HistoryPoint, 'mes_ano'>;
  title: string;
  color: string;
  money?: boolean;
};

const CHARTS: ChartDef[] = [
  { key: 'total_vidas_cobradas', title: 'Total Vidas Cobradas', color: '#2563eb' },
  { key: 'total_valor_vidas', title: 'Total PRO RATA', color: '#b45309', money: false },
  { key: 'total_custo_por_cliente', title: 'Total Custo por Cliente', color: '#059669', money: true },
  { key: 'total_faturamento', title: 'Total Faturamento', color: '#7c3aed', money: true },
];

function KpiLineChart({
  data,
  chart,
}: {
  data: Array<HistoryPoint & { label: string }>;
  chart: ChartDef;
}) {
  const formatY = (v: number) =>
    chart.money
      ? new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(v)
      : formatNumber(v);

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h4 className="text-sm font-medium text-gray-700 mb-3">{chart.title}</h4>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6b7280' }} />
            <YAxis
              tick={{ fontSize: 11, fill: '#6b7280' }}
              tickFormatter={formatY}
              width={56}
            />
            <Tooltip
              formatter={(value: number) =>
                chart.money ? formatMoney(value) : formatNumber(value)
              }
              labelFormatter={(label) => String(label)}
              contentStyle={{ fontSize: 12 }}
            />
            <Line
              type="monotone"
              dataKey={chart.key}
              stroke={chart.color}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function DashboardHistoryCharts({
  year,
  series,
  loading,
}: {
  year: number;
  series: HistoryPoint[] | null;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="mt-8 text-center py-8 text-gray-400 text-sm">
        Carregando evolução histórica...
      </div>
    );
  }

  if (!series) {
    return (
      <div className="mt-8 text-center py-8 text-gray-400 text-sm">
        Não foi possível carregar a evolução histórica
      </div>
    );
  }

  const data = filterUpToCurrentMonth(year, series).map((p) => ({
    ...p,
    label: monthLabel(p.mes_ano),
  }));

  if (data.length === 0) {
    return (
      <div className="mt-8 text-center py-8 text-gray-400 text-sm">
        Sem meses decorridos para exibir em {year}
      </div>
    );
  }

  return (
    <div className="mt-8">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        Evolução histórica — {year}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {CHARTS.map((chart) => (
          <KpiLineChart key={chart.key} data={data} chart={chart} />
        ))}
      </div>
    </div>
  );
}
