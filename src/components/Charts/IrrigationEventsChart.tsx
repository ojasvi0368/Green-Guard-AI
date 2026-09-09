import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

interface IrrigationEventsChartProps {
    data: {
        date: string;
        irrigation: number;
    }[];
}

const IrrigationEventsChart = ({ data }: IrrigationEventsChartProps) => {

    return (
        <div className="card-glass">
            <h3 style={{ marginBottom: '1rem' }}>Irrigation Events Timeline</h3>
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="date" tick={{ fill: '#6B7280', fontSize: 12 }} />
                    <YAxis label={{ value: 'Irrigation (mm)', angle: -90, position: 'insideLeft', fill: '#6B7280' }} />
                    <Tooltip
                        contentStyle={{
                            background: 'white',
                            border: '2px solid #3B82F6',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                        }}
                    />
                    <Bar dataKey="irrigation" fill="#3B82F6" barSize={20} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export default IrrigationEventsChart;